-- MitraClick Intelligence · 4/4 · Modelos de lectura
-- sales_facts: una fila por línea vendida, de ambos negocios. Replica getSalesFacts()
-- (src/mitraclick/commercial/selectors.ts). security_invoker = true para que respete RLS.
-- Excluye pedidos cancelados.

create view public.sales_facts
with (security_invoker = true)
as
select
  o.id as order_id,
  o.external_id as order_folio,
  o.order_date,
  'mitra'::public.business_unit as business_unit,
  o.rep_id,
  o.client_id,
  null::text as channel,
  l.product_id,
  l.quantity,
  l.amount
from public.wholesale_orders o
join public.wholesale_order_lines l on l.order_id = o.id
where o.status <> 'cancelado'
union all
select
  r.id,
  r.external_id,
  r.order_date,
  'mitraclick'::public.business_unit,
  null::uuid,
  null::uuid,
  r.channel,
  l.product_id,
  l.quantity,
  l.amount
from public.retail_orders r
join public.retail_order_lines l on l.order_id = r.id
where r.status <> 'cancelado';

comment on view public.sales_facts is 'Hechos de venta por línea (Mitra mayorista + Mitra Click), sin cancelados. Respeta RLS.';

revoke all on public.sales_facts from anon, authenticated;
grant select on public.sales_facts to authenticated;
grant select on public.sales_facts to service_role;
