-- Mitra Click · Sistema operativo · 13 · Tablero de bodega con horas de corte
-- Lo que sí vale de Extensiv: no "cuántos pedidos hay", sino "cuánto me falta por
-- surtir antes de que se vaya la moto". Las horas se configuran como todo lo demás.

insert into public.control_settings (key, value, label, unit) values
  ('warehouse_start_hour', 8, 'La bodega abre a las', 'hora'),
  ('order_cutoff_hour', 14, 'Último pedido que sale el mismo día', 'hora'),
  ('fulfillment_cutoff_hour', 17, 'Todo surtido antes de las', 'hora')
on conflict (key) do nothing;

-- Operación de un día, en hora de la Ciudad de México.
create function public.kpi_warehouse(p_date date default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz text := 'America/Mexico_City';
  v_today date := coalesce(p_date, (now() at time zone v_tz)::date);
  v_now timestamptz := now();
  v_is_today boolean := v_today = (now() at time zone v_tz)::date;
  v_cutoff timestamptz := (v_today + make_interval(hours => private.setting('fulfillment_cutoff_hour')::int)) at time zone v_tz;
  v_order_cutoff timestamptz := (v_today + make_interval(hours => private.setting('order_cutoff_hour')::int)) at time zone v_tz;
  v_start timestamptz := (v_today + make_interval(hours => private.setting('warehouse_start_hour')::int)) at time zone v_tz;
begin
  if not private.is_member() then
    raise exception 'Tu cuenta no tiene acceso' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'date', v_today,
    'is_today', v_is_today,
    'start_hour', private.setting('warehouse_start_hour'),
    'order_cutoff_hour', private.setting('order_cutoff_hour'),
    'fulfillment_cutoff_hour', private.setting('fulfillment_cutoff_hour'),
    -- Minutos que quedan para el corte de surtido. Negativo: ya pasó.
    'minutes_to_cutoff', case when v_is_today then round(extract(epoch from (v_cutoff - v_now)) / 60) end,
    'past_order_cutoff', v_is_today and v_now > v_order_cutoff,
    'open_since_start', v_is_today and v_now >= v_start,

    -- Surtido: lo que la bodega tiene enfrente.
    'orders_to_pick', (select count(*) from public.sales_orders o
      where o.status in ('confirmado', 'en_compra', 'en_surtido')
        and exists (select 1 from public.sales_order_lines l where l.order_id = o.id and l.product_id is not null and l.quantity_fulfilled < l.quantity)),
    'orders_promised_today', (select count(*) from public.sales_orders
      where status in ('confirmado', 'en_compra', 'en_surtido', 'enviado') and promised_on = v_today),
    'orders_overdue', (select count(*) from public.sales_orders
      where status in ('nuevo', 'confirmado', 'en_compra', 'en_surtido', 'enviado') and promised_on < v_today),
    'orders_without_list', (select count(*) from public.sales_orders o
      where o.status in ('confirmado', 'en_compra', 'en_surtido')
        and not exists (select 1 from public.pick_list_orders po join public.pick_lists pl on pl.id = po.pick_list_id
          where po.sales_order_id = o.id and pl.status in ('pendiente', 'en_proceso', 'surtida'))),
    'lists_open', (select count(*) from public.pick_lists where status in ('pendiente', 'en_proceso')),
    'units_to_pick', coalesce((select sum(l.quantity_requested - coalesce(l.quantity_picked, 0))
      from public.pick_list_lines l join public.pick_lists pl on pl.id = l.pick_list_id
      where pl.status in ('pendiente', 'en_proceso') and l.quantity_picked is null), 0),
    'lines_without_stock', (select count(*) from public.pick_list_lines l join public.pick_lists pl on pl.id = l.pick_list_id
      where pl.status in ('pendiente', 'en_proceso') and l.status = 'sin_existencia'),

    -- Entrada.
    'receipts_today', (select count(*) from public.receipts where received_on = v_today),
    'purchases_open', (select count(*) from public.purchase_orders where status in ('enviada', 'parcial')),
    'purchases_due', (select count(*) from public.purchase_orders where status in ('enviada', 'parcial') and expected_on <= v_today),
    'units_received_today', coalesce((select sum(quantity) from public.receipt_lines rl
      join public.receipts r on r.id = rl.receipt_id where r.received_on = v_today), 0),

    -- Salida.
    'shipments_today', (select count(*) from public.shipments where shipped_at::date = v_today),
    'delivered_today', (select count(*) from public.shipments where delivered_at::date = v_today),
    'shipments_pending', (select count(*) from public.shipments where status in ('programado', 'en_ruta', 'incidencia')),
    'remissions_to_verify', (select count(*) from public.remissions where status = 'entregada'),

    -- Bodega.
    'locations', (select count(*) from public.locations where active),
    'locations_occupied', (select count(*) from public.location_contents where active and units > 0),
    'stock_negative', (select count(*) from public.stock_levels where quantity < 0),
    'counts_pending', (select count(*) from public.stock_counts where status = 'pendiente'),
    'incidents_open', (select count(*) from public.incidents where status = 'abierta'),

    -- Productividad del día: movimientos por persona, del libro.
    'movements_today', (select count(*) from public.stock_movements where (performed_at at time zone v_tz)::date = v_today),
    'by_person', (select coalesce(jsonb_agg(x order by x.movements desc), '[]') from (
      select coalesce(u.display_name, 'Sistema') as person, count(*) as movements,
        sum(abs(m.quantity_delta))::numeric(14,3) as units
      from public.stock_movements m left join public.app_users u on u.id = m.performed_by
      where (m.performed_at at time zone v_tz)::date = v_today
      group by u.display_name) x),

    -- Ocupación por zona, con el dato real del libro.
    'by_zone', (select coalesce(jsonb_agg(x order by x.zone), '[]') from (
      select zone, locations, occupied, empty, units, fill_rate
      from public.warehouse_occupancy) x),

    -- Movimientos por hora, para ver a qué ritmo va el día.
    'by_hour', (select coalesce(jsonb_agg(x order by x.hour), '[]') from (
      select extract(hour from (m.performed_at at time zone v_tz))::int as hour,
        count(*) filter (where m.quantity_delta > 0) as entradas,
        count(*) filter (where m.quantity_delta < 0) as salidas
      from public.stock_movements m
      where (m.performed_at at time zone v_tz)::date = v_today
      group by 1) x)
  );
end;
$$;

revoke all on function public.kpi_warehouse(date) from public, anon;
grant execute on function public.kpi_warehouse(date) to authenticated;
