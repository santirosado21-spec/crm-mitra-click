-- Mitra Click · Sistema operativo · 8 · Conector de Shopify (lado base)
-- Las Edge Functions `shopify-webhook` y `shopify-sync` traducen el formato de Shopify
-- y llaman a estas funciones con la llave de servidor. Solo `service_role` puede
-- ejecutarlas: el navegador nunca escribe datos de Shopify.
--
-- Reglas:
--   · Idempotente: el mismo pedido, producto o cliente puede llegar varias veces.
--   · Shopify manda en lo que nace allá (pedido, pago, cancelación). El sistema manda
--     en lo interno: familia y categoría de un producto, costo, y el avance de surtido.
--   · El inventario de Shopify se guarda para conciliar; nunca sobrescribe la existencia.

-- ── Configuración de integraciones ──────────────────────────────────────────
create table public.integration_settings (
  key text primary key,
  enabled boolean not null default false,
  label text not null,
  description text,
  updated_at timestamptz not null default now()
);
comment on table public.integration_settings is 'Interruptores de integraciones. No guarda credenciales: esas son secretos de las Edge Functions.';

insert into public.integration_settings (key, enabled, label, description) values
  ('shopify_inventory_push', false, 'Enviar existencias a Shopify',
   'Cuando está encendido, la existencia del sistema se publica en Shopify. Apagado hasta validar el piloto de inventario.');

alter table public.integration_settings enable row level security;
revoke all on public.integration_settings from anon, authenticated;
grant select, update on public.integration_settings to authenticated;
grant all on public.integration_settings to service_role;
create policy "Miembros leen" on public.integration_settings for select to authenticated using ((select private.is_member()));
create policy "Dirección y admin cambian" on public.integration_settings for update to authenticated
  using ((select private.has_any_role('{direccion,admin}'::public.app_role[])))
  with check ((select private.has_any_role('{direccion,admin}'::public.app_role[])));
create trigger set_updated_at before update on public.integration_settings for each row execute function private.set_updated_at();
create trigger audit_row after update on public.integration_settings for each row execute function private.audit_row();

create function public.set_integration_setting(p_key text, p_enabled boolean)
returns void
language plpgsql set search_path = ''
as $$
begin
  update public.integration_settings set enabled = p_enabled where key = p_key;
  if not found then
    raise exception 'Tu rol no tiene permiso para cambiar integraciones' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.set_integration_setting(text, boolean) from public, anon;
grant execute on function public.set_integration_setting(text, boolean) to authenticated;

-- ── Inventario que reporta Shopify (para conciliar) ─────────────────────────
create table public.shopify_inventory_snapshots (
  shopify_inventory_item_id text not null,
  shopify_location_id text not null default '',
  product_id uuid references public.products (id) on delete set null,
  available numeric(14, 3) not null,
  received_at timestamptz not null default now(),
  primary key (shopify_inventory_item_id, shopify_location_id)
);
create index shopify_inventory_snapshots_product_idx on public.shopify_inventory_snapshots (product_id);
alter table public.shopify_inventory_snapshots enable row level security;
revoke all on public.shopify_inventory_snapshots from anon, authenticated;
grant select on public.shopify_inventory_snapshots to authenticated;
grant all on public.shopify_inventory_snapshots to service_role;
create policy "Miembros leen" on public.shopify_inventory_snapshots for select to authenticated using ((select private.is_member()));

-- Diferencia entre lo que dice Shopify y la existencia del sistema, por producto.
create view public.shopify_inventory_differences with (security_invoker = true) as
select p.id, p.sku, p.name,
  coalesce(s.shopify_available, 0) as shopify_available,
  coalesce(l.system_quantity, 0) as system_quantity,
  coalesce(s.shopify_available, 0) - coalesce(l.system_quantity, 0) as difference,
  s.received_at
from public.products p
join (select product_id, sum(available) as shopify_available, max(received_at) as received_at from public.shopify_inventory_snapshots where product_id is not null group by product_id) s on s.product_id = p.id
left join (select product_id, sum(quantity) as system_quantity from public.stock_levels group by product_id) l on l.product_id = p.id
where coalesce(s.shopify_available, 0) <> coalesce(l.system_quantity, 0);
revoke all on public.shopify_inventory_differences from anon, authenticated;
grant select on public.shopify_inventory_differences to authenticated;

-- ── Bitácora y crudo ────────────────────────────────────────────────────────
-- Guarda el payload tal como llegó (schema raw, no expuesto). Devuelve false si ese
-- mismo contenido ya se había recibido: el webhook repetido no se vuelve a procesar.
create function public.shopify_store_raw(p_entity text, p_external_id text, p_payload jsonb)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into raw.api_payloads (source, entity, external_id, payload)
  values ('shopify', p_entity, p_external_id, p_payload)
  on conflict (source, entity, external_id, payload_hash) do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;

create function public.shopify_log_run(p_entity text, p_status text, p_received integer, p_upserted integer, p_error text, p_triggered_by text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.sync_runs (source, entity, status, finished_at, rows_received, rows_upserted, error, triggered_by)
  values ('shopify', p_entity, p_status, now(), p_received, p_upserted, p_error, p_triggered_by)
$$;

-- ── Cliente ─────────────────────────────────────────────────────────────────
create function public.shopify_apply_customer(p jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_email text := nullif(lower(btrim(p ->> 'email')), '');
begin
  select id into v_id from public.customers where shopify_customer_id = p ->> 'shopify_customer_id';
  -- Un cliente capturado a mano con el mismo correo se liga en lugar de duplicarse.
  if v_id is null and v_email is not null then
    select id into v_id from public.customers where lower(email) = v_email and shopify_customer_id is null order by created_at limit 1;
  end if;

  if v_id is null then
    insert into public.customers (name, kind, contact_name, email, phone, shipping_address, city, state, notes, shopify_customer_id, source)
    values (p ->> 'name', coalesce(p ->> 'kind', 'persona'), p ->> 'contact_name', v_email, p ->> 'phone', p ->> 'shipping_address', p ->> 'city', p ->> 'state', p ->> 'notes', p ->> 'shopify_customer_id', 'shopify')
    returning id into v_id;
  else
    update public.customers c set
      shopify_customer_id = p ->> 'shopify_customer_id',
      name = coalesce(p ->> 'name', c.name),
      contact_name = coalesce(p ->> 'contact_name', c.contact_name),
      email = coalesce(v_email, c.email),
      phone = coalesce(p ->> 'phone', c.phone),
      shipping_address = coalesce(p ->> 'shipping_address', c.shipping_address),
      city = coalesce(p ->> 'city', c.city),
      state = coalesce(p ->> 'state', c.state)
    where c.id = v_id;
  end if;
  return v_id;
end;
$$;

-- ── Producto (una variante de Shopify = un producto del sistema) ────────────
create function public.shopify_apply_product(p jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_sku text := upper(btrim(p ->> 'sku'));
  v_family uuid;
begin
  if v_sku is null or v_sku = '' then
    raise exception 'La variante no tiene SKU';
  end if;
  perform set_config('mitra.change_reason', 'Sincronización con Shopify', true);

  select id into v_id from public.products where shopify_variant_id = p ->> 'shopify_variant_id';
  if v_id is null then
    select id into v_id from public.products where upper(btrim(sku)) = v_sku;
  end if;
  select f.id into v_family from public.product_families f where f.active and lower(btrim(f.name)) = lower(btrim(p ->> 'family_name'));

  if v_id is null then
    insert into public.products (sku, name, description, brand, family_id, price, barcode, photo_url, active, shopify_product_id, shopify_variant_id, shopify_inventory_item_id, source)
    values (v_sku, p ->> 'name', p ->> 'description', p ->> 'brand', v_family, (p ->> 'price')::numeric, p ->> 'barcode', p ->> 'photo_url',
      coalesce((p ->> 'active')::boolean, true), p ->> 'shopify_product_id', p ->> 'shopify_variant_id', p ->> 'shopify_inventory_item_id', 'shopify')
    returning id into v_id;
  else
    -- Familia, categoría y costo son del sistema: Shopify no los pisa.
    update public.products pr set
      name = coalesce(p ->> 'name', pr.name),
      description = coalesce(p ->> 'description', pr.description),
      brand = coalesce(p ->> 'brand', pr.brand),
      family_id = coalesce(pr.family_id, v_family),
      price = coalesce((p ->> 'price')::numeric, pr.price),
      barcode = coalesce(p ->> 'barcode', pr.barcode),
      photo_url = coalesce(p ->> 'photo_url', pr.photo_url),
      active = coalesce((p ->> 'active')::boolean, pr.active),
      shopify_product_id = p ->> 'shopify_product_id',
      shopify_variant_id = p ->> 'shopify_variant_id',
      shopify_inventory_item_id = coalesce(p ->> 'shopify_inventory_item_id', pr.shopify_inventory_item_id)
    where pr.id = v_id;
  end if;
  return v_id;
end;
$$;

-- ── Pedido ──────────────────────────────────────────────────────────────────
create function public.shopify_apply_order(p jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_status text;
  v_customer uuid;
  v_new_status text := case when (p ->> 'cancelled')::boolean then 'cancelado' when (p ->> 'fulfilled')::boolean then 'enviado' else 'confirmado' end;
begin
  if p -> 'customer' is not null and jsonb_typeof(p -> 'customer') = 'object' then
    v_customer := public.shopify_apply_customer(p -> 'customer');
  end if;

  select id, status into v_id, v_status from public.sales_orders where shopify_order_id = p ->> 'shopify_order_id' for update;

  if v_id is null then
    insert into public.sales_orders (channel, customer_id, status, payment_status, ordered_on, subtotal, tax, shipping, total,
      shopify_order_id, shopify_order_name, traffic_source, shipping_address, notes, source)
    values ('shopify', v_customer, v_new_status, p ->> 'payment_status', (p ->> 'ordered_on')::date,
      (p ->> 'subtotal')::numeric, (p ->> 'tax')::numeric, (p ->> 'shipping')::numeric, (p ->> 'total')::numeric,
      p ->> 'shopify_order_id', p ->> 'shopify_order_name', p ->> 'traffic_source', p ->> 'shipping_address', p ->> 'notes', 'shopify')
    returning id into v_id;
  else
    update public.sales_orders o set
      customer_id = coalesce(v_customer, o.customer_id),
      -- La cancelación de Shopify siempre aplica. Fuera de eso, no se retrocede el avance interno
      -- (un pedido ya en surtido o entregado no vuelve a "confirmado" por un webhook tardío).
      status = case
        when v_new_status = 'cancelado' then 'cancelado'
        when o.status in ('nuevo', 'confirmado') then v_new_status
        else o.status end,
      payment_status = p ->> 'payment_status',
      subtotal = (p ->> 'subtotal')::numeric, tax = (p ->> 'tax')::numeric, shipping = (p ->> 'shipping')::numeric, total = (p ->> 'total')::numeric,
      shopify_order_name = p ->> 'shopify_order_name',
      traffic_source = coalesce(p ->> 'traffic_source', o.traffic_source),
      shipping_address = coalesce(p ->> 'shipping_address', o.shipping_address)
    where o.id = v_id;
  end if;

  -- Los renglones se reemplazan solo mientras nada se haya surtido: después, el surtido manda.
  if not exists (select 1 from public.sales_order_lines where order_id = v_id and quantity_fulfilled > 0) then
    delete from public.sales_order_lines where order_id = v_id;
    insert into public.sales_order_lines (order_id, line_number, product_id, description, quantity, unit_price, unit_cost, amount)
    select v_id, l.ord, pr.id, l.value ->> 'description', (l.value ->> 'quantity')::numeric, (l.value ->> 'unit_price')::numeric, pr.cost, (l.value ->> 'amount')::numeric
    from jsonb_array_elements(coalesce(p -> 'lines', '[]'::jsonb)) with ordinality as l(value, ord)
    left join lateral (
      select x.id, x.cost from public.products x
      where x.shopify_variant_id = l.value ->> 'shopify_variant_id' or upper(btrim(x.sku)) = upper(btrim(l.value ->> 'sku'))
      order by (x.shopify_variant_id = l.value ->> 'shopify_variant_id') desc nulls last
      limit 1
    ) pr on true;
  end if;
  return v_id;
end;
$$;

-- ── Inventario reportado por Shopify ────────────────────────────────────────
create function public.shopify_record_inventory(p jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.shopify_inventory_snapshots (shopify_inventory_item_id, shopify_location_id, product_id, available, received_at)
  values (p ->> 'shopify_inventory_item_id', coalesce(p ->> 'shopify_location_id', ''),
    (select id from public.products where shopify_inventory_item_id = p ->> 'shopify_inventory_item_id' limit 1),
    (p ->> 'available')::numeric, now())
  on conflict (shopify_inventory_item_id, shopify_location_id) do update
    set available = excluded.available, product_id = excluded.product_id, received_at = now()
$$;

-- Existencias que se publicarían en Shopify. Devuelve vacío mientras el interruptor esté apagado.
create function public.shopify_inventory_to_push()
returns table (shopify_inventory_item_id text, sku text, quantity numeric)
language sql stable security definer set search_path = ''
as $$
  select p.shopify_inventory_item_id, p.sku, greatest(coalesce(sum(s.quantity), 0), 0)
  from public.products p left join public.stock_levels s on s.product_id = p.id
  where p.active and p.shopify_inventory_item_id is not null
    and (select enabled from public.integration_settings where key = 'shopify_inventory_push')
  group by p.id
$$;

-- Solo el servidor ejecuta las funciones del conector.
do $$
declare
  f text;
begin
  foreach f in array array[
    'shopify_store_raw(text, text, jsonb)', 'shopify_log_run(text, text, integer, integer, text, text)',
    'shopify_apply_customer(jsonb)', 'shopify_apply_product(jsonb)', 'shopify_apply_order(jsonb)',
    'shopify_record_inventory(jsonb)', 'shopify_inventory_to_push()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
