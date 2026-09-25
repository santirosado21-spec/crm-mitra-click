-- MitraClick Intelligence · 5 · Funciones de carga (ingest) y limpieza
-- Punto único de entrada para cualquier fuente (API del ERP, webhook de Shopify, GA4,
-- CSV/Excel exportado): public.ingest_batch(fuente, entidad, filas JSON).
--   · Campos en español, iguales a docs/ERP_DATA_CONTRACT.md.
--   · Normaliza fechas (AAAA-MM-DD, DD/MM/AAAA, ISO con hora), montos ("$64,300.50"),
--     booleanos (sí/no/true/1) y estatus en español o inglés (Shopify).
--   · Upsert idempotente por (source, external_id): re-enviar lo mismo no duplica.
--   · Cada fila se procesa por separado: una fila mala se reporta y no tumba el lote.
--   · Guarda cada fila cruda en raw.api_payloads y registra la corrida en sync_runs.
--   · Si un pedido llega antes que su vendedor, cliente o producto, crea un registro
--     provisional (dimensión tardía) que la carga posterior del catálogo completa.
-- Solo service_role puede ejecutar estas funciones (nunca el navegador).

grant usage on schema private to service_role;

-- ── Normalizadores ──────────────────────────────────────────────────────────
create function private.clean_text(p text)
returns text language sql immutable set search_path = ''
as $$ select nullif(btrim(p), '') $$;

create function private.fold(p text)
returns text language sql immutable set search_path = ''
as $$ select lower(translate(btrim(coalesce(p, '')), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) $$;

create function private.to_num(p text)
returns numeric language plpgsql immutable set search_path = ''
as $$
declare
  v text := private.clean_text(p);
begin
  if v is null then return null; end if;
  v := replace(replace(replace(v, '$', ''), ',', ''), ' ', '');
  if v !~ '^-?\d+(\.\d+)?$' then
    raise exception 'Número no reconocido: "%"', p;
  end if;
  return v::numeric;
end;
$$;

create function private.to_date(p text)
returns date language plpgsql immutable set search_path = ''
as $$
declare
  v text := private.clean_text(p);
begin
  if v is null then return null; end if;
  if v ~ '^\d{4}-\d{2}-\d{2}' then return left(v, 10)::date; end if;
  if v ~ '^\d{1,2}/\d{1,2}/\d{4}$' then return to_date(v, 'DD/MM/YYYY'); end if;
  raise exception 'Fecha no reconocida: "%" (usa AAAA-MM-DD o DD/MM/AAAA)', p;
end;
$$;

create function private.to_month(p text)
returns date language plpgsql immutable set search_path = ''
as $$
declare
  v text := private.clean_text(p);
begin
  if v is null then return null; end if;
  if v ~ '^\d{4}-\d{2}$' then return (v || '-01')::date; end if;
  return date_trunc('month', private.to_date(v))::date;
end;
$$;

create function private.to_bool(p text, p_default boolean)
returns boolean language sql immutable set search_path = ''
as $$
  select case
    when private.clean_text(p) is null then p_default
    when private.fold(p) in ('true', 't', '1', 'si', 'yes', 'y', 'activo', 'activa') then true
    when private.fold(p) in ('false', 'f', '0', 'no', 'n', 'inactivo', 'inactiva', 'baja') then false
    else p_default
  end
$$;

create function private.to_business_unit(p text, p_source public.data_source)
returns public.business_unit language plpgsql immutable set search_path = ''
as $$
begin
  case private.fold(p)
    when 'mitra', 'mayorista', 'b2b', 'mitra mayorista' then return 'mitra';
    when 'mitraclick', 'mitra click', 'click', 'b2c', 'minorista', 'tienda', 'ecommerce', 'e-commerce' then return 'mitraclick';
    when '' then return case when p_source = 'shopify' then 'mitraclick'::public.business_unit else 'mitra'::public.business_unit end;
    else raise exception 'Unidad de negocio no reconocida: "%" (usa mitra o mitraclick)', p;
  end case;
end;
$$;

create function private.to_wholesale_status(p text)
returns public.wholesale_order_status language sql immutable set search_path = ''
as $$
  select case
    when private.fold(p) in ('cancelado', 'cancelada', 'cancelled', 'canceled', 'anulado', 'anulada') then 'cancelado'
    when private.fold(p) in ('pendiente', 'abierto', 'abierta', 'por surtir', 'pending', 'open') then 'pendiente'
    else 'surtido'
  end::public.wholesale_order_status
$$;

create function private.to_retail_status(p text)
returns public.retail_order_status language sql immutable set search_path = ''
as $$
  select case
    when private.fold(p) in ('cancelado', 'cancelada', 'cancelled', 'canceled', 'refunded', 'reembolsado', 'voided') then 'cancelado'
    when private.fold(p) in ('entregado', 'entregada', 'delivered', 'fulfilled', 'completado', 'completed') then 'entregado'
    when private.fold(p) in ('enviado', 'enviada', 'shipped', 'in_transit', 'en transito', 'partially_fulfilled') then 'enviado'
    else 'pendiente'
  end::public.retail_order_status
$$;

create function private.to_quote_status(p text)
returns public.quote_status language sql immutable set search_path = ''
as $$
  select case
    when private.fold(p) in ('ganada', 'ganado', 'aceptada', 'aceptado', 'won', 'cerrada ganada') then 'ganada'
    when private.fold(p) in ('perdida', 'perdido', 'rechazada', 'rechazado', 'lost', 'cancelada', 'vencida') then 'perdida'
    when private.fold(p) in ('negociacion', 'en negociacion', 'negotiation') then 'negociacion'
    else 'enviada'
  end::public.quote_status
$$;

create function private.req(r jsonb, p_key text)
returns text language plpgsql immutable set search_path = ''
as $$
declare
  v text := private.clean_text(r ->> p_key);
begin
  if v is null then raise exception 'Falta el campo "%"', p_key; end if;
  return v;
end;
$$;

-- ── Dimensiones (con alta provisional si aún no existen) ────────────────────
create function private.ensure_rep(p_source public.data_source, p_external_id text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
begin
  if private.clean_text(p_external_id) is null then return null; end if;
  select id into v_id from public.sales_reps where source = p_source and external_id = btrim(p_external_id);
  if v_id is null then
    insert into public.sales_reps (source, external_id, name)
    values (p_source, btrim(p_external_id), 'Vendedor ' || btrim(p_external_id) || ' (pendiente de catálogo)')
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create function private.ensure_client(p_source public.data_source, p_external_id text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
begin
  if private.clean_text(p_external_id) is null then return null; end if;
  select id into v_id from public.clients where source = p_source and external_id = btrim(p_external_id);
  if v_id is null then
    insert into public.clients (source, external_id, name)
    values (p_source, btrim(p_external_id), 'Cliente ' || btrim(p_external_id) || ' (pendiente de catálogo)')
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create function private.ensure_product(p_source public.data_source, p_external_id text, p_unit public.business_unit)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
  v_key text := private.clean_text(p_external_id);
begin
  if v_key is null then raise exception 'La línea no trae producto_id ni sku'; end if;
  select id into v_id from public.products where source = p_source and (external_id = v_key or sku = v_key) limit 1;
  if v_id is null then
    insert into public.products (source, external_id, sku, name, business_unit)
    values (p_source, v_key, v_key, 'Producto ' || v_key || ' (pendiente de catálogo)', p_unit)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- ── Líneas de pedido/orden ──────────────────────────────────────────────────
create function private.write_lines(p_source public.data_source, p_kind text, p_order_id uuid, p_lines jsonb, p_replace boolean)
returns numeric language plpgsql security invoker set search_path = ''
as $$
declare
  v_line jsonb;
  v_n int := 0;
  v_number int;
  v_qty numeric;
  v_price numeric;
  v_amount numeric;
  v_total numeric := 0;
  v_product uuid;
  v_unit public.business_unit := case when p_kind = 'retail' then 'mitraclick'::public.business_unit else 'mitra'::public.business_unit end;
begin
  if p_replace then
    if p_kind = 'retail' then delete from public.retail_order_lines where order_id = p_order_id;
    else delete from public.wholesale_order_lines where order_id = p_order_id;
    end if;
  end if;

  for v_line in select value from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    v_n := v_n + 1;
    v_number := coalesce(private.to_num(v_line ->> 'linea')::int, v_n);
    v_product := private.ensure_product(p_source, coalesce(v_line ->> 'producto_id', v_line ->> 'sku'), v_unit);
    v_qty := coalesce(private.to_num(v_line ->> 'cantidad'), 1);
    v_price := coalesce(private.to_num(v_line ->> 'precio_unitario'), 0);
    v_amount := coalesce(private.to_num(v_line ->> 'importe'), v_qty * v_price);
    v_total := v_total + v_amount;

    if p_kind = 'retail' then
      insert into public.retail_order_lines (order_id, line_number, product_id, quantity, unit_price, amount)
      values (p_order_id, v_number, v_product, v_qty, v_price, v_amount)
      on conflict (order_id, line_number) do update
        set product_id = excluded.product_id, quantity = excluded.quantity, unit_price = excluded.unit_price, amount = excluded.amount;
    else
      insert into public.wholesale_order_lines (order_id, line_number, product_id, quantity, unit_price, amount)
      values (p_order_id, v_number, v_product, v_qty, v_price, v_amount)
      on conflict (order_id, line_number) do update
        set product_id = excluded.product_id, quantity = excluded.quantity, unit_price = excluded.unit_price, amount = excluded.amount;
    end if;
  end loop;
  return v_total;
end;
$$;

-- ── Una fila de una entidad ─────────────────────────────────────────────────
create function private.ingest_row(p_source public.data_source, p_entity text, r jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
  v_lines_total numeric;
  v_amount numeric;
  v_product uuid;
begin
  case p_entity
    when 'vendedores' then
      insert into public.sales_reps (source, external_id, name, zone, active)
      values (p_source, private.req(r, 'id'), private.req(r, 'nombre'), private.clean_text(r ->> 'zona'), private.to_bool(r ->> 'activo', true))
      on conflict (source, external_id) do update
        set name = excluded.name, zone = excluded.zone, active = excluded.active;

    when 'cuotas' then
      insert into public.rep_monthly_quotas (rep_id, month, amount, source)
      values (private.ensure_rep(p_source, private.req(r, 'vendedor_id')), private.to_month(private.req(r, 'mes')), private.to_num(private.req(r, 'importe')), p_source)
      on conflict (rep_id, month) do update set amount = excluded.amount, source = excluded.source;

    when 'metas' then
      insert into public.business_goals (month, business_unit, amount, source)
      values (private.to_month(private.req(r, 'mes')), private.to_business_unit(private.req(r, 'unidad'), p_source), private.to_num(private.req(r, 'importe')), p_source)
      on conflict (month, business_unit) do update set amount = excluded.amount, source = excluded.source;

    when 'productos' then
      insert into public.products (source, external_id, sku, name, brand, category, business_unit, unit, list_price, reorder_point, active)
      values (
        p_source,
        coalesce(private.clean_text(r ->> 'id'), private.req(r, 'sku')),
        coalesce(private.clean_text(r ->> 'sku'), private.req(r, 'id')),
        private.req(r, 'nombre'),
        private.clean_text(r ->> 'marca'),
        private.clean_text(r ->> 'categoria'),
        private.to_business_unit(r ->> 'unidad_negocio', p_source),
        coalesce(private.clean_text(r ->> 'unidad'), 'pieza'),
        coalesce(private.to_num(r ->> 'precio_lista'), 0),
        coalesce(private.to_num(r ->> 'punto_reorden'), 0),
        private.to_bool(r ->> 'activo', true)
      )
      on conflict (source, external_id) do update
        set sku = excluded.sku, name = excluded.name, brand = excluded.brand, category = excluded.category,
            business_unit = excluded.business_unit, unit = excluded.unit, list_price = excluded.list_price,
            reorder_point = excluded.reorder_point, active = excluded.active;

    when 'existencias' then
      v_product := private.ensure_product(p_source, coalesce(r ->> 'producto_id', r ->> 'sku'), private.to_business_unit(r ->> 'unidad_negocio', p_source));
      insert into public.inventory_levels (product_id, warehouse, quantity, as_of, source)
      values (
        v_product,
        coalesce(private.clean_text(r ->> 'bodega'), 'principal'),
        private.to_num(private.req(r, 'existencia')),
        coalesce(private.to_date(r ->> 'fecha_corte')::timestamptz, now()),
        p_source
      )
      on conflict (product_id, warehouse) do update
        set quantity = excluded.quantity, as_of = excluded.as_of, source = excluded.source;

    when 'clientes' then
      insert into public.clients as c (source, external_id, name, client_type, rep_id)
      values (p_source, private.req(r, 'id'), private.req(r, 'nombre'), private.clean_text(r ->> 'tipo'), private.ensure_rep(p_source, r ->> 'vendedor_id'))
      on conflict (source, external_id) do update
        set name = excluded.name, client_type = excluded.client_type, rep_id = coalesce(excluded.rep_id, c.rep_id);

    when 'pedidos' then
      v_amount := private.to_num(r ->> 'importe');
      insert into public.wholesale_orders (source, external_id, order_date, client_id, rep_id, amount, status)
      values (
        p_source, private.req(r, 'folio'), private.to_date(private.req(r, 'fecha')),
        private.ensure_client(p_source, r ->> 'cliente_id'), private.ensure_rep(p_source, r ->> 'vendedor_id'),
        coalesce(v_amount, 0), private.to_wholesale_status(r ->> 'estatus')
      )
      on conflict (source, external_id) do update
        set order_date = excluded.order_date, client_id = excluded.client_id, rep_id = excluded.rep_id,
            amount = excluded.amount, status = excluded.status
      returning id into v_id;
      if jsonb_typeof(r -> 'lineas') = 'array' then
        v_lines_total := private.write_lines(p_source, 'wholesale', v_id, r -> 'lineas', true);
        if v_amount is null then update public.wholesale_orders set amount = v_lines_total where id = v_id; end if;
      end if;

    when 'lineas_pedido' then
      select id into v_id from public.wholesale_orders where source = p_source and external_id = private.req(r, 'folio_pedido');
      if v_id is null then raise exception 'El pedido "%" no existe: carga primero los pedidos', r ->> 'folio_pedido'; end if;
      if private.clean_text(r ->> 'linea') is null then raise exception 'Falta el campo "linea" (número de línea dentro del pedido)'; end if;
      perform private.write_lines(p_source, 'wholesale', v_id, jsonb_build_array(r), false);

    when 'ordenes' then
      v_amount := private.to_num(r ->> 'importe');
      insert into public.retail_orders (source, external_id, order_date, channel, amount, status)
      values (
        p_source, private.req(r, 'folio'), private.to_date(private.req(r, 'fecha')),
        private.clean_text(r ->> 'canal'), coalesce(v_amount, 0), private.to_retail_status(r ->> 'estatus')
      )
      on conflict (source, external_id) do update
        set order_date = excluded.order_date, channel = excluded.channel, amount = excluded.amount, status = excluded.status
      returning id into v_id;
      if jsonb_typeof(r -> 'lineas') = 'array' then
        v_lines_total := private.write_lines(p_source, 'retail', v_id, r -> 'lineas', true);
        if v_amount is null then update public.retail_orders set amount = v_lines_total where id = v_id; end if;
      end if;

    when 'lineas_orden' then
      select id into v_id from public.retail_orders where source = p_source and external_id = private.req(r, 'folio_orden');
      if v_id is null then raise exception 'La orden "%" no existe: carga primero las órdenes', r ->> 'folio_orden'; end if;
      if private.clean_text(r ->> 'linea') is null then raise exception 'Falta el campo "linea" (número de línea dentro de la orden)'; end if;
      perform private.write_lines(p_source, 'retail', v_id, jsonb_build_array(r), false);

    when 'cotizaciones' then
      insert into public.wholesale_quotes (source, external_id, quote_date, client_id, rep_id, amount, status, closed_date)
      values (
        p_source, private.req(r, 'folio'), private.to_date(private.req(r, 'fecha')),
        private.ensure_client(p_source, r ->> 'cliente_id'), private.ensure_rep(p_source, r ->> 'vendedor_id'),
        private.to_num(private.req(r, 'importe')), private.to_quote_status(r ->> 'estatus'), private.to_date(r ->> 'fecha_cierre')
      )
      on conflict (source, external_id) do update
        set quote_date = excluded.quote_date, client_id = excluded.client_id, rep_id = excluded.rep_id,
            amount = excluded.amount, status = excluded.status, closed_date = excluded.closed_date;

    when 'trafico' then
      insert into public.ecommerce_traffic_daily (source, day, visits, product_views, carts, checkouts, orders)
      values (
        p_source, private.to_date(private.req(r, 'fecha')),
        coalesce(private.to_num(r ->> 'visitas'), 0)::int, coalesce(private.to_num(r ->> 'vistas_producto'), 0)::int,
        coalesce(private.to_num(r ->> 'carritos'), 0)::int, coalesce(private.to_num(r ->> 'checkouts'), 0)::int,
        coalesce(private.to_num(r ->> 'ordenes'), 0)::int
      )
      on conflict (source, day) do update
        set visits = excluded.visits, product_views = excluded.product_views, carts = excluded.carts,
            checkouts = excluded.checkouts, orders = excluded.orders;

    else
      raise exception 'Entidad desconocida: "%"', p_entity;
  end case;
end;
$$;

-- ── Punto de entrada ────────────────────────────────────────────────────────
create function public.ingest_batch(
  p_source public.data_source,
  p_entity text,
  p_rows jsonb,
  p_triggered_by text default 'api'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entity text := private.fold(p_entity);
  v_run bigint;
  v_row jsonb;
  v_raw bigint;
  v_idx int := 0;
  v_ok int := 0;
  v_failed int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_key text;
  v_total int;
begin
  if v_entity not in ('vendedores', 'cuotas', 'metas', 'productos', 'existencias', 'clientes', 'pedidos',
                      'lineas_pedido', 'ordenes', 'lineas_orden', 'cotizaciones', 'trafico') then
    raise exception 'Entidad desconocida: "%". Usa vendedores, cuotas, metas, productos, existencias, clientes, pedidos, lineas_pedido, ordenes, lineas_orden, cotizaciones o trafico.', p_entity;
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Las filas deben ser un arreglo JSON';
  end if;
  v_total := jsonb_array_length(p_rows);

  insert into public.sync_runs (source, entity, triggered_by, rows_received)
  values (p_source, v_entity, coalesce(p_triggered_by, 'api'), v_total)
  returning id into v_run;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_idx := v_idx + 1;
    v_key := coalesce(v_row ->> 'folio', v_row ->> 'folio_pedido', v_row ->> 'folio_orden', v_row ->> 'id', v_row ->> 'sku', v_row ->> 'producto_id', v_row ->> 'fecha', v_row ->> 'mes');

    insert into raw.api_payloads (source, entity, external_id, payload)
    values (p_source, v_entity, v_key, v_row)
    on conflict (source, entity, external_id, payload_hash) do update set received_at = now(), error = null
    returning id into v_raw;

    begin
      perform private.ingest_row(p_source, v_entity, v_row);
      update raw.api_payloads set processed_at = now(), error = null where id = v_raw;
      v_ok := v_ok + 1;
    exception when others then
      v_failed := v_failed + 1;
      update raw.api_payloads set error = sqlerrm where id = v_raw;
      if v_failed <= 100 then
        v_errors := v_errors || jsonb_build_object('fila', v_idx, 'id', v_key, 'error', sqlerrm);
      end if;
    end;
  end loop;

  update public.sync_runs
  set status = case when v_failed = 0 then 'exitoso' when v_ok = 0 then 'fallido' else 'parcial' end,
      finished_at = now(),
      rows_upserted = v_ok,
      error = case when v_failed > 0 then v_failed || ' filas con error. Primera: ' || (v_errors -> 0 ->> 'error') end
  where id = v_run;

  return jsonb_build_object(
    'sync_run_id', v_run,
    'entidad', v_entity,
    'recibidas', v_total,
    'procesadas', v_ok,
    'con_error', v_failed,
    'errores', v_errors
  );
end;
$$;

comment on function public.ingest_batch(public.data_source, text, jsonb, text) is
  'Carga idempotente de filas (campos en español) para una entidad. Solo service_role. Ver docs/DATABASE.md.';

-- ── Limpieza por fuente (p. ej. borrar los datos de prueba) ─────────────────
create function public.purge_source(p_source public.data_source, p_confirmation text default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
begin
  if p_source not in ('demo', 'manual') and coalesce(p_confirmation, '') <> 'BORRAR ' || p_source then
    raise exception 'Para borrar datos de "%" confirma con p_confirmation = ''BORRAR %''', p_source, p_source;
  end if;

  delete from public.wholesale_orders where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('pedidos', v_n);
  delete from public.retail_orders where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('ordenes', v_n);
  delete from public.wholesale_quotes where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('cotizaciones', v_n);
  delete from public.inventory_levels where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('existencias', v_n);
  delete from public.clients where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('clientes', v_n);
  delete from public.rep_monthly_quotas where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('cuotas', v_n);
  delete from public.business_goals where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('metas', v_n);
  delete from public.ecommerce_traffic_daily where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('trafico', v_n);
  delete from public.products where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('productos', v_n);
  delete from public.sales_reps where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('vendedores', v_n);
  delete from raw.api_payloads where source = p_source; get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('crudos', v_n);

  insert into public.sync_runs (source, entity, status, finished_at, triggered_by, rows_received, rows_upserted)
  values (p_source, 'purga', 'exitoso', now(), 'purge_source', 0, 0);

  return v_counts;
end;
$$;

comment on function public.purge_source(public.data_source, text) is
  'Borra todos los datos de una fuente. demo y manual sin confirmación; erp/shopify/ga4 requieren p_confirmation = ''BORRAR <fuente>''. Solo service_role.';

-- ── Permisos: solo service_role ─────────────────────────────────────────────
revoke all on function public.ingest_batch(public.data_source, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.purge_source(public.data_source, text) from public, anon, authenticated;
grant execute on function public.ingest_batch(public.data_source, text, jsonb, text) to service_role;
grant execute on function public.purge_source(public.data_source, text) to service_role;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
