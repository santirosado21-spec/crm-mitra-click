-- Mitra Click · Sistema operativo · 7 · KPIs (diccionario de métricas)
-- Una sola definición por métrica. El dashboard, las alertas, los agentes y los reportes
-- leen de aquí: si una fórmula cambia, cambia en un solo lugar.
--
-- Definiciones:
--   Ventas        = subtotal (antes de IVA y envío) de pedidos no cancelados, por fecha de pedido.
--   Facturación   = total de facturas no canceladas, por fecha de emisión.
--   Cobranza      = pagos recibidos, por fecha de pago.
--   Ticket        = ventas / número de pedidos.
--   Margen        = importe − costo unitario × cantidad, solo en renglones con costo conocido;
--                   `margin_coverage` dice qué parte de la venta tiene costo (si es baja, el margen no es confiable).
--   Conversión    = cotizaciones ganadas / cotizaciones cerradas (ganadas + perdidas + vencidas) emitidas en el periodo.
--   Pipeline      = total de cotizaciones enviadas o en negociación hoy (no depende del periodo).
-- Las funciones son SECURITY INVOKER: respetan la RLS de quien consulta.

create view public.order_line_facts with (security_invoker = true) as
select
  o.id as order_id, o.ordered_on, o.channel, o.status, o.customer_id, o.rep_id,
  l.id as line_id, l.product_id, l.description, l.quantity, l.amount,
  case when l.unit_cost is not null then l.unit_cost * l.quantity end as cost,
  p.family_id, p.category_id
from public.sales_orders o
join public.sales_order_lines l on l.order_id = o.id
left join public.products p on p.id = l.product_id
where o.status <> 'cancelado';
revoke all on public.order_line_facts from anon, authenticated;
grant select on public.order_line_facts to authenticated;

-- ── Comercial ───────────────────────────────────────────────────────────────
create function public.kpi_commercial(p_start date, p_end date)
returns jsonb
language sql stable set search_path = ''
as $$
  with orders as (
    select * from public.sales_orders where status <> 'cancelado' and ordered_on between p_start and p_end
  ), lines as (
    select * from public.order_line_facts where ordered_on between p_start and p_end
  ), quotes as (
    select * from public.quotes where issued_on between p_start and p_end
  )
  select jsonb_build_object(
    'sales', coalesce((select sum(subtotal) from orders), 0),
    'orders', (select count(*) from orders),
    'avg_ticket', coalesce((select round(sum(subtotal) / nullif(count(*), 0), 2) from orders), 0),
    'sales_shopify', coalesce((select sum(subtotal) from orders where channel = 'shopify'), 0),
    'sales_direct', coalesce((select sum(subtotal) from orders where channel = 'directo'), 0),
    'invoiced', coalesce((select sum(total) from public.invoices where status <> 'cancelada' and issued_on between p_start and p_end), 0),
    'collected', coalesce((select sum(amount) from public.payments where paid_on between p_start and p_end), 0),
    'margin', coalesce((select sum(amount - cost) from lines where cost is not null), 0),
    'margin_pct', (select round(sum(amount - cost) / nullif(sum(amount), 0), 4) from lines where cost is not null),
    'margin_coverage', coalesce((select round(sum(amount) filter (where cost is not null) / nullif(sum(amount), 0), 4) from lines), 0),
    'quotes_issued', (select count(*) from quotes),
    'quotes_won', (select count(*) from quotes where status = 'ganada'),
    'quote_conversion', (select round(count(*) filter (where status = 'ganada')::numeric / nullif(count(*) filter (where status in ('ganada', 'perdida', 'vencida')), 0), 4) from quotes),
    'pipeline_value', coalesce((select sum(total) from public.quotes where status in ('enviada', 'negociacion')), 0),
    'pipeline_count', (select count(*) from public.quotes where status in ('enviada', 'negociacion')),
    'receivable', coalesce((select sum(balance) from public.invoice_balances where status in ('emitida', 'parcial')), 0),
    'receivable_overdue', coalesce((select sum(balance) from public.invoice_balances where overdue), 0)
  )
$$;

-- Ventas por día, para la gráfica del periodo (incluye días en cero).
create function public.kpi_sales_by_day(p_start date, p_end date)
returns table (day date, sales numeric, orders bigint)
language sql stable set search_path = ''
as $$
  select d::date, coalesce(sum(o.subtotal), 0), count(o.id)
  from generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') d
  left join public.sales_orders o on o.ordered_on = d::date and o.status <> 'cancelado'
  group by d order by d
$$;

-- ── Productos y familias ────────────────────────────────────────────────────
create function public.kpi_by_family(p_start date, p_end date)
returns table (family_id uuid, family text, sales numeric, units numeric, margin numeric, products bigint)
language sql stable set search_path = ''
as $$
  select f.family_id, coalesce(pf.name, 'Sin familia'), sum(f.amount), sum(f.quantity),
    sum(f.amount - f.cost) filter (where f.cost is not null), count(distinct f.product_id)
  from public.order_line_facts f
  left join public.product_families pf on pf.id = f.family_id
  where f.ordered_on between p_start and p_end
  group by f.family_id, pf.name
  order by 3 desc
$$;

-- Todos los productos activos con su venta del periodo (cero si no se movieron):
-- sirve tanto para "mayor movimiento" como para "menor movimiento".
create function public.kpi_by_product(p_start date, p_end date, p_family_id uuid default null)
returns table (product_id uuid, sku text, product text, family text, sales numeric, units numeric, margin numeric, orders bigint, stock numeric)
language sql stable set search_path = ''
as $$
  select p.id, p.sku, p.name, pf.name,
    coalesce(s.sales, 0), coalesce(s.units, 0), s.margin, coalesce(s.orders, 0),
    coalesce((select sum(quantity) from public.stock_levels where product_id = p.id), 0)
  from public.products p
  left join public.product_families pf on pf.id = p.family_id
  left join (
    select f.product_id, sum(f.amount) as sales, sum(f.quantity) as units,
      sum(f.amount - f.cost) filter (where f.cost is not null) as margin, count(distinct f.order_id) as orders
    from public.order_line_facts f where f.ordered_on between p_start and p_end group by f.product_id
  ) s on s.product_id = p.id
  where p.active and (p_family_id is null or p.family_id = p_family_id)
  order by 5 desc, 3
$$;

-- ── Vendedores ──────────────────────────────────────────────────────────────
create function public.kpi_by_rep(p_start date, p_end date)
returns table (rep_id uuid, rep text, sales numeric, orders bigint, families bigint, quotes_issued bigint, quotes_won bigint, quote_conversion numeric, pending_follow_ups bigint)
language sql stable set search_path = ''
as $$
  select r.id, r.name,
    coalesce((select sum(o.subtotal) from public.sales_orders o where o.rep_id = r.id and o.status <> 'cancelado' and o.ordered_on between p_start and p_end), 0),
    (select count(*) from public.sales_orders o where o.rep_id = r.id and o.status <> 'cancelado' and o.ordered_on between p_start and p_end),
    (select count(distinct f.family_id) from public.order_line_facts f where f.rep_id = r.id and f.ordered_on between p_start and p_end),
    (select count(*) from public.quotes q where q.rep_id = r.id and q.issued_on between p_start and p_end),
    (select count(*) from public.quotes q where q.rep_id = r.id and q.status = 'ganada' and q.issued_on between p_start and p_end),
    (select round(count(*) filter (where q.status = 'ganada')::numeric / nullif(count(*) filter (where q.status in ('ganada', 'perdida', 'vencida')), 0), 4)
      from public.quotes q where q.rep_id = r.id and q.issued_on between p_start and p_end),
    (select count(*) from public.issues i join public.quotes q on q.id = i.entity_id
      where i.rule_code = 'cotizacion_sin_seguimiento' and i.status in ('abierto', 'en_proceso') and q.rep_id = r.id)
  from public.sales_reps r
  where r.active
  order by 3 desc, 2
$$;

-- ── Operación: foto de hoy (no depende del periodo, salvo los tiempos) ──────
create function public.kpi_operations(p_start date, p_end date)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'orders_in_process', (select count(*) from public.sales_orders where status in ('nuevo', 'confirmado', 'en_compra', 'en_surtido')),
    'orders_to_deliver', (select count(*) from public.sales_orders where status in ('confirmado', 'en_compra', 'en_surtido', 'enviado')),
    'orders_late', (select count(*) from public.sales_orders where status in ('nuevo', 'confirmado', 'en_compra', 'en_surtido', 'enviado') and promised_on < current_date),
    'purchases_pending', (select count(*) from public.purchase_orders where status in ('enviada', 'parcial')),
    'shipments_pending', (select count(*) from public.shipments where status in ('programado', 'en_ruta', 'incidencia')),
    'remissions_to_verify', (select count(*) from public.remissions where status = 'entregada'),
    'incidents_open', (select count(*) from public.incidents where status = 'abierta'),
    'counts_pending', (select count(*) from public.stock_counts where status = 'pendiente'),
    'stock_negative', (select count(*) from public.stock_levels where quantity < 0),
    'stock_low', (select count(*) from public.products p
      join (select product_id, sum(quantity) as quantity from public.stock_levels group by product_id) t on t.product_id = p.id
      where p.active and p.reorder_point > 0 and t.quantity <= p.reorder_point),
    'stock_movements', (select count(*) from public.stock_movements where performed_at::date between p_start and p_end),
    'issues_open', (select count(*) from public.issues where status in ('abierto', 'en_proceso')),
    'issues_high', (select count(*) from public.issues where status in ('abierto', 'en_proceso') and severity = 'alta'),
    'alerts_new', (select count(*) from public.alerts where status = 'nueva'),
    -- Días promedio entre el pedido y su entrega, para pedidos entregados en el periodo.
    'days_order_to_delivery', (select round(avg(extract(epoch from (s.delivered_at - o.created_at)) / 86400)::numeric, 1)
      from public.shipments s join public.sales_orders o on o.id = s.sales_order_id
      where s.delivered_at::date between p_start and p_end),
    -- Días promedio entre la compra y su primera recepción.
    'days_purchase_to_receipt', (select round(avg(r.received_on - po.ordered_on)::numeric, 1)
      from public.receipts r join public.purchase_orders po on po.id = r.purchase_order_id
      where r.received_on between p_start and p_end),
    -- Días promedio entre la factura y su pago completo.
    'days_invoice_to_payment', (select round(avg(x.last_paid - i.issued_on)::numeric, 1)
      from public.invoices i join (select invoice_id, max(paid_on) as last_paid from public.payments group by invoice_id) x on x.invoice_id = i.id
      where i.status = 'pagada' and x.last_paid between p_start and p_end)
  )
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'kpi_commercial(date, date)', 'kpi_sales_by_day(date, date)', 'kpi_by_family(date, date)',
    'kpi_by_product(date, date, uuid)', 'kpi_by_rep(date, date)', 'kpi_operations(date, date)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
