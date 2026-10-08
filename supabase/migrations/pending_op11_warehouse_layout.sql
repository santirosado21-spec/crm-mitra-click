-- Mitra Click · Sistema operativo · 11 · Layout de bodega y carga inicial
-- Hasta ahora una ubicación solo tenía un código. Para surtir hace falta saber DÓNDE
-- está: zona, posición, nivel y, sobre todo, en qué orden se recorre la bodega.
--
-- No se guardan coordenadas x/y: la posición en el mapa se deriva de (zona, posición,
-- nivel). Es el acierto del mapa del CEDIS y evita redibujar al mover un rack.

-- ── Orden de recorrido ──────────────────────────────────────────────────────
-- Mismo cálculo que `pickOrder` en src/mitraclick/lib/warehouse.ts: zona por zona,
-- avanzando por posición y tomando primero el nivel bajo (lo que está a la mano). Las
-- zonas de servicio (recepción, embarque) van al final: el recorrido termina ahí.
--
-- Cabe en integer. De ahí los límites: la zona se distingue por sus 3 primeros
-- caracteres, la posición llega a 999 y el nivel a 9. Si alguna vez no alcanza, hay que
-- ampliar la columna a bigint y esta función a la vez.
create function private.location_pick_order(p_zone text, p_position integer, p_level integer)
returns integer
language plpgsql immutable set search_path = ''
as $$
declare
  v_zone text := rpad(left(upper(btrim(coalesce(p_zone, ''))), 3), 3, ' ');
  v_weight integer := 0;
  v_code integer;
  i integer;
begin
  -- '0'–'9' → 1..10, 'A'–'Z' → 11..36, lo demás → 0. Base 37; máximo 50 652.
  for i in 1 .. 3 loop
    v_code := ascii(substr(v_zone, i, 1));
    v_weight := v_weight * 37 + case
      when v_code between 48 and 57 then v_code - 47
      when v_code between 65 and 90 then v_code - 54
      else 0 end;
  end loop;
  -- Zonas de servicio, después de cualquier anaquel (el máximo normal es ~5.1e8).
  if p_position is null or p_level is null then
    return 1000000000 + v_weight;
  end if;
  return v_weight * 10000 + p_position * 10 + p_level;
end;
$$;

-- ── Ubicaciones con lugar en la bodega ──────────────────────────────────────
alter table public.locations
  add column zone text,
  add column position integer check (position is null or (position > 0 and position <= 999)),
  -- El tope de 9 niveles es lo que cabe en la fórmula de pick_order.
  add column level integer check (level is null or (level > 0 and level <= 9)),
  add column kind text not null default 'almacenaje'
    check (kind in ('almacenaje', 'picking', 'recepcion', 'embarque', 'devoluciones', 'cuarentena')),
  add column width numeric(6, 2) check (width is null or width > 0),
  add column length numeric(6, 2) check (length is null or length > 0),
  add column height numeric(6, 2) check (height is null or height > 0),
  add column max_weight numeric(10, 2) check (max_weight is null or max_weight > 0),
  -- Capacidad en unidades. Sin esto NO se calcula porcentaje de ocupación: se informa
  -- que no hay dato, en vez de inventar una constante global como hacía el CEDIS.
  add column max_units numeric(14, 3) check (max_units is null or max_units > 0),
  add column pick_order integer not null default 0,
  -- La posición y el nivel van juntos: o los dos, o ninguno (zona de servicio).
  add constraint locations_position_level_together
    check ((position is null) = (level is null));

comment on column public.locations.pick_order is 'Orden de recorrido para surtir. Menor = más cerca del inicio.';
comment on column public.locations.max_units is 'Capacidad en unidades. Si es nula, la ocupación se reporta sin porcentaje.';

create index locations_zone_idx on public.locations (warehouse_id, zone, position, level);
create index locations_pick_order_idx on public.locations (pick_order);
create index locations_kind_idx on public.locations (kind);

-- Mantiene zona y orden al dar de alta o mover una ubicación, venga de donde venga.
create function private.set_pick_order()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.zone := nullif(upper(btrim(coalesce(new.zone, ''))), '');
  if new.zone is null then
    new.zone := split_part(upper(btrim(new.code)), '-', 1);
  end if;
  new.pick_order := private.location_pick_order(new.zone, new.position, new.level);
  return new;
end;
$$;
create trigger set_pick_order before insert or update of zone, position, level, code on public.locations
  for each row execute function private.set_pick_order();

-- Las ubicaciones que ya existían se quedan sin zona; el trigger se la pone.
update public.locations set zone = null where true;

-- ── Generación de un layout completo ────────────────────────────────────────
-- p_zones: [{"zone":"A","positions":8,"levels":4,"kind":null,"description":"Anaquel A"}]
-- Idempotente: una ubicación que ya existe se actualiza; no se duplica ni se borra.
create function public.generate_locations(p_warehouse_id uuid, p_zones jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  z jsonb;
  v_zone text;
  v_kind text;
  v_desc text;
  v_positions integer;
  v_levels integer;
  v_pos integer;
  v_lvl integer;
  v_inserted boolean;
  v_created integer := 0;
  v_updated integer := 0;
  v_total integer;
begin
  perform private.require_role('{direccion,admin,almacen}');
  if not exists (select 1 from public.warehouses where id = p_warehouse_id) then
    raise exception 'El almacén no existe';
  end if;
  if jsonb_array_length(coalesce(p_zones, '[]'::jsonb)) = 0 then
    raise exception 'Indica al menos una zona';
  end if;

  for z in select value from jsonb_array_elements(p_zones) loop
    v_zone := upper(btrim(coalesce(z ->> 'zone', '')));
    v_positions := coalesce((z ->> 'positions')::int, 0);
    v_levels := coalesce((z ->> 'levels')::int, 0);
    v_desc := nullif(btrim(coalesce(z ->> 'description', '')), '');
    v_kind := nullif(z ->> 'kind', '');

    if v_zone = '' then
      raise exception 'Cada zona necesita nombre';
    end if;
    if v_positions < 0 or v_levels < 0 then
      raise exception 'Zona %: las posiciones y los niveles no pueden ser negativos', v_zone;
    end if;
    if v_positions > 999 or v_levels > 9 then
      raise exception 'Zona %: el máximo son 999 posiciones y 9 niveles', v_zone;
    end if;
    if v_positions * v_levels > 500 then
      raise exception 'Zona %: % ubicaciones es demasiado; el máximo son 500 por zona', v_zone, v_positions * v_levels;
    end if;

    -- Zona de servicio: una sola ubicación con el nombre de la zona.
    if v_positions = 0 or v_levels = 0 then
      insert into public.locations (warehouse_id, code, description, zone, position, level, kind)
      values (p_warehouse_id, v_zone, v_desc, v_zone, null, null, coalesce(v_kind, 'almacenaje'))
      on conflict (warehouse_id, code) do update
        set description = coalesce(excluded.description, public.locations.description),
            zone = excluded.zone, kind = excluded.kind
      returning (xmax = 0) into v_inserted;
      if v_inserted then v_created := v_created + 1; else v_updated := v_updated + 1; end if;
      continue;
    end if;

    for v_pos in 1 .. v_positions loop
      for v_lvl in 1 .. v_levels loop
        insert into public.locations (warehouse_id, code, description, zone, position, level, kind)
        values (p_warehouse_id, v_zone || '-' || lpad(v_pos::text, 2, '0') || '-' || v_lvl::text,
          v_desc, v_zone, v_pos, v_lvl,
          -- El nivel 1 se alcanza con la mano: ahí se hace picking.
          coalesce(v_kind, case when v_lvl = 1 then 'picking' else 'almacenaje' end))
        on conflict (warehouse_id, code) do update
          set zone = excluded.zone, position = excluded.position, level = excluded.level,
              kind = excluded.kind
        returning (xmax = 0) into v_inserted;
        if v_inserted then v_created := v_created + 1; else v_updated := v_updated + 1; end if;
      end loop;
    end loop;
  end loop;

  select count(*) into v_total from public.locations where warehouse_id = p_warehouse_id;
  return jsonb_build_object('created', v_created, 'updated', v_updated, 'total', v_total);
end;
$$;

-- ── Carga inicial de existencias ────────────────────────────────────────────
-- Lo que ya está físicamente en la bodega. Entra como movimiento con reference_type
-- = 'carga_inicial', así que queda en el libro como todo lo demás.
--
-- Idempotente por (ubicación, producto): volver a cargar el mismo archivo NO suma otra
-- vez. Ajusta por la diferencia contra lo ya cargado como inicial, que es lo que una
-- segunda pasada del conteo de arranque debe hacer. No toca entradas ni salidas reales.
create function public.load_initial_stock(p_rows jsonb, p_notes text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  r jsonb;
  v_product uuid;
  v_location uuid;
  v_qty numeric;
  v_already numeric;
  v_delta numeric;
  v_loaded integer := 0;
  v_adjusted integer := 0;
  v_skipped integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_reason text := coalesce(nullif(btrim(coalesce(p_notes, '')), ''), 'Carga inicial de bodega');
begin
  perform private.require_role('{direccion,admin,almacen}');

  for r in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    begin
      v_qty := (r ->> 'quantity')::numeric;
      if v_qty is null or v_qty < 0 then
        raise exception 'La cantidad debe ser cero o más';
      end if;

      select id into v_product from public.products
      where upper(btrim(sku)) = upper(btrim(coalesce(r ->> 'sku', '')));
      if v_product is null then
        raise exception 'No existe un producto con el SKU %', coalesce(nullif(r ->> 'sku', ''), '(vacío)');
      end if;

      select id into v_location from public.locations
      where upper(btrim(code)) = upper(btrim(coalesce(r ->> 'location', '')));
      if v_location is null then
        raise exception 'No existe la ubicación %', coalesce(nullif(r ->> 'location', ''), '(vacía)');
      end if;

      select coalesce(sum(quantity_delta), 0) into v_already
      from public.stock_movements
      where product_id = v_product and location_id = v_location and reference_type = 'carga_inicial';

      v_delta := v_qty - v_already;
      if v_delta = 0 then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reason)
      values (v_product, v_location, case when v_delta > 0 then 'entrada' else 'salida' end, v_delta, 'carga_inicial',
        case when v_already = 0 then v_reason else v_reason || ' (corrección: antes ' || v_already || ')' end);

      if v_already = 0 then v_loaded := v_loaded + 1; else v_adjusted := v_adjusted + 1; end if;
    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'key', nullif(concat_ws(' · ', nullif(r ->> 'location', ''), nullif(r ->> 'sku', '')), ''),
        'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('loaded', v_loaded, 'adjusted', v_adjusted, 'skipped', v_skipped, 'errors', v_errors);
end;
$$;

-- ── Ocupación ───────────────────────────────────────────────────────────────
-- Honesta: `units` siempre es real (sale del libro). El porcentaje solo aparece donde
-- alguien capturó `max_units`; si no, es null y la pantalla dice que no hay dato.
create view public.warehouse_occupancy with (security_invoker = true) as
select
  l.warehouse_id, w.name as warehouse, l.zone,
  count(*) as locations,
  count(*) filter (where coalesce(s.quantity, 0) > 0) as occupied,
  count(*) filter (where coalesce(s.quantity, 0) <= 0) as empty,
  coalesce(sum(s.quantity), 0)::numeric(14, 3) as units,
  count(*) filter (where l.max_units is not null) as with_capacity,
  case when sum(l.max_units) > 0
    then round(coalesce(sum(s.quantity) filter (where l.max_units is not null), 0) / sum(l.max_units), 4)
  end as fill_rate
from public.locations l
join public.warehouses w on w.id = l.warehouse_id
left join (select location_id, sum(quantity) as quantity from public.stock_levels group by location_id) s
  on s.location_id = l.id
where l.active
group by l.warehouse_id, w.name, l.zone;

revoke all on public.warehouse_occupancy from anon, authenticated;
grant select on public.warehouse_occupancy to authenticated;

-- Qué hay en cada ubicación: lo que leen el mapa y la ficha de etiqueta.
create view public.location_contents with (security_invoker = true) as
select
  l.id, l.warehouse_id, l.code, l.zone, l.position, l.level, l.kind, l.pick_order,
  l.max_units, l.active,
  coalesce(sum(s.quantity), 0)::numeric(14, 3) as units,
  count(*) filter (where s.quantity <> 0) as products,
  case when l.max_units > 0 then round(coalesce(sum(s.quantity), 0) / l.max_units, 4) end as fill_rate
from public.locations l
left join public.stock_levels s on s.location_id = l.id
group by l.id;

revoke all on public.location_contents from anon, authenticated;
grant select on public.location_contents to authenticated;

revoke all on function public.generate_locations(uuid, jsonb) from public, anon;
revoke all on function public.load_initial_stock(jsonb, text) from public, anon;
grant execute on function public.generate_locations(uuid, jsonb) to authenticated;
grant execute on function public.load_initial_stock(jsonb, text) to authenticated;
revoke all on all functions in schema private from public, anon;
