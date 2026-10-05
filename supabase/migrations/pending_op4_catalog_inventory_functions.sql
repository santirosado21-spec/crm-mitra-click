-- Mitra Click · Sistema operativo · 4 · Funciones de catálogo y bodega
-- Operaciones que deben ser atómicas o que necesitan contexto (motivo del cambio).
-- Todas son SECURITY INVOKER: corren con los permisos y la RLS de quien las llama.

-- ── Producto: guardar cambios con motivo ────────────────────────────────────
-- El motivo queda en product_change_log (lo escribe el trigger log_changes).
-- Es obligatorio al reclasificar o cambiar precio/costo.
create function public.update_product(p_id uuid, p_values jsonb, p_reason text default null)
returns public.products
language plpgsql set search_path = ''
as $$
declare
  v_old public.products;
  v_new public.products;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_old from public.products where id = p_id;
  if not found then
    raise exception 'El producto no existe o no tienes acceso';
  end if;

  v_new := jsonb_populate_record(v_old, p_values - 'id' - 'created_at' - 'updated_at' - 'source');

  if v_reason is null and (
    v_new.family_id is distinct from v_old.family_id
    or v_new.category_id is distinct from v_old.category_id
    or v_new.price is distinct from v_old.price
    or v_new.cost is distinct from v_old.cost
  ) then
    raise exception 'Escribe el motivo del cambio de familia, categoría, precio o costo';
  end if;

  perform set_config('mitra.change_reason', coalesce(v_reason, ''), true);

  update public.products p set
    sku = v_new.sku, name = v_new.name, description = v_new.description, brand = v_new.brand,
    family_id = v_new.family_id, category_id = v_new.category_id, unit = v_new.unit,
    cost = v_new.cost, price = v_new.price, photo_url = v_new.photo_url, barcode = v_new.barcode,
    reorder_point = v_new.reorder_point, active = v_new.active
  where p.id = p_id
  returning * into v_new;

  if not found then
    raise exception 'Tu rol no tiene permiso para modificar productos' using errcode = '42501';
  end if;
  return v_new;
end;
$$;

-- ── Importación de productos (CSV de Shopify) ───────────────────────────────
-- Idempotente por SKU: crea los nuevos y actualiza los existentes. La familia solo
-- se asigna si ya existe una con ese nombre; nunca se crean familias al importar.
-- Los productos existentes conservan su familia, categoría y estado.
create function public.import_products(p_rows jsonb)
returns jsonb
language plpgsql set search_path = ''
as $$
declare
  r jsonb;
  v_sku text;
  v_family uuid;
  v_id uuid;
  v_created integer := 0;
  v_updated integer := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  perform set_config('mitra.change_reason', 'Importación CSV', true);

  for r in select value from jsonb_array_elements(p_rows) loop
    begin
      v_sku := upper(btrim(r ->> 'sku'));
      if v_sku is null or v_sku = '' or nullif(btrim(r ->> 'name'), '') is null then
        raise exception 'Falta el SKU o el nombre';
      end if;

      select f.id into v_family from public.product_families f
      where lower(btrim(f.name)) = lower(btrim(r ->> 'family_name')) and f.active;

      select p.id into v_id from public.products p where upper(btrim(p.sku)) = v_sku;

      if v_id is null then
        insert into public.products (sku, name, description, brand, family_id, price, cost, barcode, photo_url, active, source)
        values (
          v_sku, btrim(r ->> 'name'), r ->> 'description', r ->> 'brand', v_family,
          (r ->> 'price')::numeric, (r ->> 'cost')::numeric, r ->> 'barcode', r ->> 'photo_url',
          coalesce((r ->> 'active')::boolean, true), 'shopify'
        );
        v_created := v_created + 1;
      else
        update public.products p set
          name = btrim(r ->> 'name'),
          description = coalesce(r ->> 'description', p.description),
          brand = coalesce(r ->> 'brand', p.brand),
          family_id = coalesce(p.family_id, v_family),
          price = coalesce((r ->> 'price')::numeric, p.price),
          cost = coalesce((r ->> 'cost')::numeric, p.cost),
          barcode = coalesce(r ->> 'barcode', p.barcode),
          photo_url = coalesce(r ->> 'photo_url', p.photo_url)
        where p.id = v_id;
        if not found then
          raise exception 'Tu rol no tiene permiso para modificar productos';
        end if;
        v_updated := v_updated + 1;
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_object('key', coalesce(r ->> 'sku', '(sin SKU)'), 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'errors', v_errors);
end;
$$;

-- ── Importación de clientes (CSV de Shopify) ────────────────────────────────
-- Idempotente por ID de Shopify y, si no hay, por correo.
create function public.import_customers(p_rows jsonb)
returns jsonb
language plpgsql set search_path = ''
as $$
declare
  r jsonb;
  v_id uuid;
  v_email text;
  v_created integer := 0;
  v_updated integer := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  for r in select value from jsonb_array_elements(p_rows) loop
    begin
      v_email := nullif(lower(btrim(r ->> 'email')), '');
      if nullif(btrim(r ->> 'name'), '') is null then
        raise exception 'Falta el nombre';
      end if;

      v_id := null;
      if nullif(r ->> 'shopify_customer_id', '') is not null then
        select c.id into v_id from public.customers c where c.shopify_customer_id = r ->> 'shopify_customer_id';
      end if;
      if v_id is null and v_email is not null then
        select c.id into v_id from public.customers c where lower(c.email) = v_email order by c.created_at limit 1;
      end if;

      if v_id is null then
        insert into public.customers (name, kind, contact_name, email, phone, shipping_address, city, state, notes, shopify_customer_id, source)
        values (
          btrim(r ->> 'name'), coalesce(r ->> 'kind', 'persona'), r ->> 'contact_name', v_email, r ->> 'phone',
          r ->> 'shipping_address', r ->> 'city', r ->> 'state', r ->> 'notes', nullif(r ->> 'shopify_customer_id', ''), 'shopify'
        );
        v_created := v_created + 1;
      else
        update public.customers c set
          name = btrim(r ->> 'name'),
          kind = coalesce(r ->> 'kind', c.kind),
          contact_name = coalesce(r ->> 'contact_name', c.contact_name),
          email = coalesce(v_email, c.email),
          phone = coalesce(r ->> 'phone', c.phone),
          shipping_address = coalesce(r ->> 'shipping_address', c.shipping_address),
          city = coalesce(r ->> 'city', c.city),
          state = coalesce(r ->> 'state', c.state),
          shopify_customer_id = coalesce(nullif(r ->> 'shopify_customer_id', ''), c.shopify_customer_id)
        where c.id = v_id;
        if not found then
          raise exception 'Tu rol no tiene permiso para modificar clientes';
        end if;
        v_updated := v_updated + 1;
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_object('key', coalesce(r ->> 'email', r ->> 'name', '(sin nombre)'), 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'errors', v_errors);
end;
$$;
create index customers_email_idx on public.customers (lower(email));

-- ── Traspaso entre ubicaciones: dos movimientos o ninguno ───────────────────
create function public.record_transfer(p_product_id uuid, p_from_location_id uuid, p_to_location_id uuid, p_quantity numeric, p_reason text default null)
returns uuid
language plpgsql set search_path = ''
as $$
declare
  v_group uuid := gen_random_uuid();
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;
  if p_from_location_id = p_to_location_id then
    raise exception 'El destino debe ser distinto del origen';
  end if;

  insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reason, transfer_group)
  values
    (p_product_id, p_from_location_id, 'traspaso_salida', -p_quantity, nullif(btrim(p_reason), ''), v_group),
    (p_product_id, p_to_location_id, 'traspaso_entrada', p_quantity, nullif(btrim(p_reason), ''), v_group);
  return v_group;
end;
$$;

-- ── Conteo físico ───────────────────────────────────────────────────────────
-- La existencia del sistema y el estado los fija la base al capturar: quien cuenta
-- solo envía lo que contó.
create function private.prepare_stock_count()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  select coalesce((select s.quantity from public.stock_levels s where s.product_id = new.product_id and s.location_id = new.location_id), 0)
  into new.system_quantity;
  new.status := case when new.counted_quantity = new.system_quantity then 'sin_diferencia' else 'pendiente' end;
  new.counted_by := private.current_app_user_id();
  new.counted_at := now();
  new.resolved_by := null;
  new.resolved_at := null;
  new.resolution_reason := null;
  new.adjustment_movement_id := null;
  return new;
end;
$$;
create trigger prepare_count before insert on public.stock_counts
  for each row execute function private.prepare_stock_count();

-- Resolver una diferencia: ajustar (genera un movimiento de ajuste por la diferencia
-- registrada) o descartar. Solo dirección y admin, siempre con motivo.
create function public.resolve_stock_count(p_count_id uuid, p_action text, p_reason text)
returns public.stock_counts
language plpgsql set search_path = ''
as $$
declare
  v_count public.stock_counts;
  v_movement bigint;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.has_any_role('{direccion,admin}'::public.app_role[]) then
    raise exception 'Solo dirección o administración pueden resolver diferencias de conteo' using errcode = '42501';
  end if;
  if p_action not in ('ajustar', 'descartar') then
    raise exception 'Acción no válida';
  end if;
  if v_reason is null then
    raise exception 'Escribe el motivo';
  end if;

  select * into v_count from public.stock_counts where id = p_count_id for update;
  if not found then
    raise exception 'El conteo no existe';
  end if;
  if v_count.status <> 'pendiente' then
    raise exception 'Este conteo ya fue resuelto';
  end if;

  if p_action = 'ajustar' then
    insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reference_id, reason)
    values (v_count.product_id, v_count.location_id, 'ajuste', v_count.difference, 'conteo', v_count.id, v_reason)
    returning id into v_movement;
  end if;

  update public.stock_counts c set
    status = case when p_action = 'ajustar' then 'ajustado' else 'descartado' end,
    resolved_by = private.current_app_user_id(),
    resolved_at = now(),
    resolution_reason = v_reason,
    adjustment_movement_id = v_movement
  where c.id = p_count_id
  returning * into v_count;
  return v_count;
end;
$$;

-- ── Permisos de ejecución ───────────────────────────────────────────────────
revoke all on function public.update_product(uuid, jsonb, text) from public, anon;
revoke all on function public.import_products(jsonb) from public, anon;
revoke all on function public.import_customers(jsonb) from public, anon;
revoke all on function public.record_transfer(uuid, uuid, uuid, numeric, text) from public, anon;
revoke all on function public.resolve_stock_count(uuid, text, text) from public, anon;
grant execute on function public.update_product(uuid, jsonb, text) to authenticated;
grant execute on function public.import_products(jsonb) to authenticated;
grant execute on function public.import_customers(jsonb) to authenticated;
grant execute on function public.record_transfer(uuid, uuid, uuid, numeric, text) to authenticated;
grant execute on function public.resolve_stock_count(uuid, text, text) to authenticated;
revoke all on all functions in schema private from public, anon;
