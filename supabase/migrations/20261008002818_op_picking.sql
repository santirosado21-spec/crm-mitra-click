-- Mitra Click · Sistema operativo · 12 · Surtido (picking)
-- El hueco real del WMS: el sistema ya descontaba inventario, pero nadie le decía a la
-- persona de bodega qué recoger ni de dónde.
--
-- Decisión de diseño, para que el inventario NO baje dos veces: la lista de surtido es
-- un PLAN, no un movimiento. `ship_order` sigue siendo el único lugar que mueve
-- inventario; lo que cambia es que ahora recibe de la lista la ubicación y la cantidad
-- de cada renglón, en vez de preguntárselas a la persona. El libro conserva un solo origen.

create table public.pick_lists (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'en_proceso', 'surtida', 'cancelada')),
  assigned_to uuid references public.app_users (id) on delete set null,
  notes text,
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.pick_lists is 'Plan de recorrido para surtir uno o varios pedidos. No mueve inventario: eso lo hace ship_order.';
create index pick_lists_status_idx on public.pick_lists (status, created_at desc);
create index pick_lists_assigned_idx on public.pick_lists (assigned_to);
create index pick_lists_created_by_idx on public.pick_lists (created_by);

-- Qué pedidos cubre una lista (puede ser más de uno: una sola vuelta por la bodega).
create table public.pick_list_orders (
  pick_list_id uuid not null references public.pick_lists (id) on delete cascade,
  sales_order_id uuid not null references public.sales_orders (id) on delete restrict,
  primary key (pick_list_id, sales_order_id)
);
create index pick_list_orders_order_idx on public.pick_list_orders (sales_order_id);

create table public.pick_list_lines (
  id uuid primary key default gen_random_uuid(),
  pick_list_id uuid not null references public.pick_lists (id) on delete cascade,
  sales_order_line_id uuid not null references public.sales_order_lines (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  -- Orden de recorrido congelado al armar la lista: si alguien mueve la ubicación a
  -- media vuelta, el recorrido impreso o en pantalla no cambia bajo los pies.
  pick_order integer not null default 0,
  quantity_requested numeric(14, 3) not null check (quantity_requested > 0),
  quantity_picked numeric(14, 3) check (quantity_picked is null or quantity_picked >= 0),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'surtido', 'parcial', 'sin_existencia')),
  picked_by uuid references public.app_users (id) on delete set null,
  picked_at timestamptz,
  notes text
);
create index pick_list_lines_list_idx on public.pick_list_lines (pick_list_id, pick_order);
create index pick_list_lines_order_line_idx on public.pick_list_lines (sales_order_line_id);
create index pick_list_lines_product_idx on public.pick_list_lines (product_id);
create index pick_list_lines_location_idx on public.pick_list_lines (location_id);
create index pick_list_lines_picked_by_idx on public.pick_list_lines (picked_by);

create sequence private.pick_list_folio_seq;
create trigger set_folio before insert on public.pick_lists
  for each row execute function private.set_folio('SUR', 'private.pick_list_folio_seq');

-- ── Armar la lista ──────────────────────────────────────────────────────────
-- Recorre los renglones con producto de los pedidos indicados, busca existencia por
-- ubicación y reparte empezando por la más cercana al inicio del recorrido. No inventa
-- existencia: lo que no alcanza queda como renglón 'sin_existencia' para que se vea.
create function public.create_pick_list(p_order_ids uuid[], p_assigned_to uuid default null, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_list uuid;
  v_order uuid;
  l record;
  s record;
  v_pending numeric;
  v_take numeric;
  v_lines integer := 0;
begin
  perform private.require_role('{direccion,admin,almacen,logistica,ventas}');
  if p_order_ids is null or cardinality(p_order_ids) = 0 then
    raise exception 'Indica al menos un pedido';
  end if;

  foreach v_order in array p_order_ids loop
    if not exists (select 1 from public.sales_orders where id = v_order) then
      raise exception 'Un pedido de la lista no existe';
    end if;
    if exists (select 1 from public.sales_orders where id = v_order and status not in ('confirmado', 'en_compra', 'en_surtido')) then
      raise exception 'Solo se surte un pedido confirmado; revisa el estado de %',
        (select coalesce(folio, shopify_order_name, '(sin folio)') from public.sales_orders where id = v_order);
    end if;
    -- Un pedido no puede estar en dos listas abiertas a la vez.
    if exists (
      select 1 from public.pick_list_orders o join public.pick_lists pl on pl.id = o.pick_list_id
      where o.sales_order_id = v_order and pl.status in ('pendiente', 'en_proceso')
    ) then
      raise exception 'El pedido % ya tiene una lista de surtido abierta',
        (select coalesce(folio, shopify_order_name, '(sin folio)') from public.sales_orders where id = v_order);
    end if;
  end loop;

  insert into public.pick_lists (assigned_to, notes) values (p_assigned_to, nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_list;
  insert into public.pick_list_orders (pick_list_id, sales_order_id)
  select v_list, unnest(p_order_ids);

  -- Lo que falta por surtir de cada renglón con producto del catálogo.
  for l in
    select sol.id, sol.product_id, (sol.quantity - sol.quantity_fulfilled) as pending
    from public.sales_order_lines sol
    where sol.order_id = any (p_order_ids) and sol.product_id is not null
      and sol.quantity > sol.quantity_fulfilled
    order by sol.order_id, sol.line_number
  loop
    v_pending := l.pending;

    for s in
      select sl.location_id, sl.quantity, loc.pick_order
      from public.stock_levels sl
      join public.locations loc on loc.id = sl.location_id
      where sl.product_id = l.product_id and sl.quantity > 0 and loc.active
        -- Lo ya comprometido en otras listas abiertas no se vuelve a prometer.
        and sl.quantity > coalesce((
          select sum(pll.quantity_requested) from public.pick_list_lines pll
          join public.pick_lists pl on pl.id = pll.pick_list_id
          where pll.product_id = l.product_id and pll.location_id = sl.location_id
            and pll.status = 'pendiente' and pl.status in ('pendiente', 'en_proceso')
        ), 0)
      order by loc.pick_order
    loop
      exit when v_pending <= 0;
      v_take := least(
        v_pending,
        s.quantity - coalesce((
          select sum(pll.quantity_requested) from public.pick_list_lines pll
          join public.pick_lists pl on pl.id = pll.pick_list_id
          where pll.product_id = l.product_id and pll.location_id = s.location_id
            and pll.status = 'pendiente' and pl.status in ('pendiente', 'en_proceso')
        ), 0));
      if v_take <= 0 then continue; end if;

      insert into public.pick_list_lines (pick_list_id, sales_order_line_id, product_id, location_id, pick_order, quantity_requested)
      values (v_list, l.id, l.product_id, s.location_id, s.pick_order, v_take);
      v_pending := v_pending - v_take;
      v_lines := v_lines + 1;
    end loop;

    -- Lo que no se pudo cubrir queda a la vista, no se esconde.
    if v_pending > 0 then
      insert into public.pick_list_lines (pick_list_id, sales_order_line_id, product_id, location_id, pick_order, quantity_requested, status, notes)
      select v_list, l.id, l.product_id, loc.id, loc.pick_order, v_pending, 'sin_existencia',
        'No hay existencia registrada suficiente'
      from public.locations loc
      where loc.kind = 'recepcion' and loc.active
      order by loc.pick_order
      limit 1;
      v_lines := v_lines + 1;
    end if;
  end loop;

  if v_lines = 0 then
    raise exception 'No hay nada que surtir: los renglones no tienen producto del catálogo o ya están surtidos';
  end if;
  return v_list;
end;
$$;

-- ── Surtir ──────────────────────────────────────────────────────────────────
-- Registra lo que realmente se tomó, que puede no ser lo planeado. No mueve inventario.
create function public.confirm_pick(p_line_id uuid, p_quantity numeric, p_notes text default null)
returns public.pick_list_lines
language plpgsql security definer set search_path = ''
as $$
declare
  v_line public.pick_list_lines;
  v_list uuid;
begin
  perform private.require_role('{direccion,admin,almacen,logistica}');
  select * into v_line from public.pick_list_lines where id = p_line_id for update;
  if not found then raise exception 'El renglón no existe'; end if;
  if p_quantity is null or p_quantity < 0 then raise exception 'La cantidad debe ser cero o más'; end if;
  if p_quantity > v_line.quantity_requested then
    raise exception 'No se puede surtir más de lo pedido en este renglón (%).', v_line.quantity_requested;
  end if;

  v_list := v_line.pick_list_id;
  if exists (select 1 from public.pick_lists where id = v_list and status in ('surtida', 'cancelada')) then
    raise exception 'Esta lista ya está cerrada';
  end if;

  update public.pick_list_lines set
    quantity_picked = p_quantity,
    status = case
      when p_quantity = 0 then 'sin_existencia'
      when p_quantity < quantity_requested then 'parcial'
      else 'surtido' end,
    picked_by = private.current_app_user_id(),
    picked_at = now(),
    notes = coalesce(nullif(btrim(coalesce(p_notes, '')), ''), notes)
  where id = p_line_id
  returning * into v_line;

  -- La lista arranca sola en cuanto alguien toma el primer renglón.
  update public.pick_lists set status = 'en_proceso', started_at = coalesce(started_at, now())
  where id = v_list and status = 'pendiente';
  return v_line;
end;
$$;

create function public.set_pick_list_status(p_id uuid, p_status text, p_notes text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
begin
  perform private.require_role('{direccion,admin,almacen,logistica}');
  select status into v_status from public.pick_lists where id = p_id for update;
  if not found then raise exception 'La lista no existe'; end if;
  if v_status in ('surtida', 'cancelada') then
    raise exception 'Esta lista ya está %', v_status;
  end if;
  if p_status not in ('en_proceso', 'surtida', 'cancelada') then
    raise exception 'Estado no válido';
  end if;
  if p_status = 'surtida' and not exists (
    select 1 from public.pick_list_lines where pick_list_id = p_id and quantity_picked is not null
  ) then
    raise exception 'Confirma al menos un renglón antes de cerrar la lista';
  end if;

  update public.pick_lists set
    status = p_status,
    started_at = case when p_status = 'en_proceso' then coalesce(started_at, now()) else started_at end,
    completed_at = case when p_status in ('surtida', 'cancelada') then now() else completed_at end,
    notes = coalesce(nullif(btrim(coalesce(p_notes, '')), ''), notes)
  where id = p_id;
end;
$$;

-- ── De la lista al envío ────────────────────────────────────────────────────
-- Lo surtido, agrupado como lo espera `ship_order`: una entrada por renglón de pedido y
-- ubicación. Aquí es donde la lista alimenta al único lugar que mueve inventario.
create function public.pick_list_shipment_lines(p_list_id uuid, p_order_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'sales_order_line_id', x.sales_order_line_id,
    'location_id', x.location_id,
    'quantity', x.quantity)), '[]'::jsonb)
  from (
    select pll.sales_order_line_id, pll.location_id, sum(pll.quantity_picked) as quantity
    from public.pick_list_lines pll
    join public.sales_order_lines sol on sol.id = pll.sales_order_line_id
    where pll.pick_list_id = p_list_id and sol.order_id = p_order_id
      and pll.quantity_picked > 0
    group by pll.sales_order_line_id, pll.location_id
  ) x
$$;

-- Vista de la lista con su avance, que es lo que lee la pantalla.
create view public.pick_list_progress with (security_invoker = true) as
select
  pl.id, pl.folio, pl.status, pl.assigned_to, pl.notes, pl.created_at, pl.started_at, pl.completed_at,
  u.display_name as assigned_name,
  count(l.id) as lines,
  count(l.id) filter (where l.quantity_picked is not null) as confirmed,
  count(l.id) filter (where l.status = 'sin_existencia') as missing,
  coalesce(sum(l.quantity_requested), 0)::numeric(14, 3) as units_requested,
  coalesce(sum(l.quantity_picked), 0)::numeric(14, 3) as units_picked,
  (select string_agg(coalesce(so.folio, so.shopify_order_name, '(sin folio)'), ', ' order by so.folio)
     from public.pick_list_orders po join public.sales_orders so on so.id = po.sales_order_id
     where po.pick_list_id = pl.id) as orders
from public.pick_lists pl
left join public.pick_list_lines l on l.pick_list_id = pl.id
left join public.app_users u on u.id = pl.assigned_to
group by pl.id, u.display_name;

revoke all on public.pick_list_progress from anon, authenticated;
grant select on public.pick_list_progress to authenticated;

-- ── Seguridad ───────────────────────────────────────────────────────────────
-- Las listas se crean y cierran por función (que valida el rol); las tablas solo se leen.
do $$
declare
  t text;
begin
  foreach t in array array['pick_lists', 'pick_list_orders', 'pick_list_lines'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create policy "Miembros leen" on public.%I for select to authenticated using ((select private.is_member()))', t);
  end loop;
end;
$$;

create trigger set_updated_at before update on public.pick_lists
  for each row execute function private.set_updated_at();
create trigger audit_row after insert or update or delete on public.pick_lists
  for each row execute function private.audit_row();

do $$
declare
  f text;
begin
  foreach f in array array[
    'create_pick_list(uuid[], uuid, text)', 'confirm_pick(uuid, numeric, text)',
    'set_pick_list_status(uuid, text, text)', 'pick_list_shipment_lines(uuid, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

grant usage on all sequences in schema private to service_role;
revoke all on all functions in schema private from public, anon;
