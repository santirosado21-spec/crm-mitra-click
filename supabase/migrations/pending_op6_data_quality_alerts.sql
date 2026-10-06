-- Mitra Click · Sistema operativo · 6 · Calidad de datos, pendientes y alertas
-- Las diez validaciones del plan de trabajo, como una sola vista. Una función las
-- convierte en pendientes (issues) sin duplicar y cierra sola los que ya se corrigieron.
-- Lo que requiere criterio (p. ej. "producto en la familia incorrecta") no es una regla
-- fija: lo propone el agente de supervisión (fase H).

-- ── Umbrales configurables ──────────────────────────────────────────────────
create table public.control_settings (
  key text primary key,
  value numeric not null check (value >= 0),
  label text not null,
  unit text not null default 'días',
  updated_at timestamptz not null default now()
);
comment on table public.control_settings is 'Umbrales de las reglas de calidad de datos y de las alertas. Los ajusta dirección o administración.';

insert into public.control_settings (key, value, label) values
  ('quote_follow_up_days', 3, 'Cotización sin seguimiento después de'),
  ('remission_verify_days', 2, 'Remisión entregada sin verificar después de'),
  ('order_stale_days', 7, 'Pedido abierto sin cambios después de'),
  ('invoice_after_delivery_days', 3, 'Pedido entregado sin factura después de'),
  ('count_pending_days', 2, 'Diferencia de conteo sin resolver después de');

alter table public.control_settings enable row level security;
revoke all on public.control_settings from anon, authenticated;
grant select, update on public.control_settings to authenticated;
grant all on public.control_settings to service_role;
create policy "Miembros leen" on public.control_settings for select to authenticated using ((select private.is_member()));
create policy "Dirección y admin ajustan" on public.control_settings for update to authenticated
  using ((select private.has_any_role('{direccion,admin}'::public.app_role[])))
  with check ((select private.has_any_role('{direccion,admin}'::public.app_role[])));
create trigger set_updated_at before update on public.control_settings for each row execute function private.set_updated_at();
create trigger audit_row after update on public.control_settings for each row execute function private.audit_row();

-- Ajuste de un umbral desde la app (la llave de la tabla es `key`, no un id).
create function public.set_control_setting(p_key text, p_value numeric)
returns void
language plpgsql set search_path = ''
as $$
begin
  if p_value is null or p_value < 0 then
    raise exception 'El umbral no puede ser negativo';
  end if;
  update public.control_settings set value = p_value where key = p_key;
  if not found then
    raise exception 'Tu rol no tiene permiso para ajustar umbrales' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.set_control_setting(text, numeric) from public, anon;
grant execute on function public.set_control_setting(text, numeric) to authenticated;

create function private.setting(p_key text)
returns numeric
language sql stable set search_path = ''
as $$ select value from public.control_settings where key = p_key $$;

-- ── Las reglas ──────────────────────────────────────────────────────────────
-- Una fila por problema vigente. entity_type + entity_id dicen dónde está;
-- assigned_role, a qué área le toca corregirlo.
create view public.data_quality_findings with (security_invoker = true) as
-- 1 · Clientes con información incompleta
select 'cliente_incompleto'::text as rule_code, 'cliente'::text as entity_type, c.id as entity_id,
  'Cliente con información incompleta: ' || c.name as title,
  'Falta: ' || concat_ws(', ',
    case when c.email is null and c.phone is null then 'correo o teléfono' end,
    case when c.kind = 'empresa' and c.rfc is null then 'RFC' end,
    case when c.rep_id is null then 'vendedor asignado' end,
    case when c.shipping_address is null then 'domicilio de entrega' end) as detail,
  'baja'::text as severity, 'ventas'::public.app_role as assigned_role
from public.customers c
where c.active and ((c.email is null and c.phone is null) or (c.kind = 'empresa' and c.rfc is null) or c.rep_id is null or c.shipping_address is null)

union all
-- 2 · Productos sin familia o categoría
select 'producto_sin_clasificar', 'producto', p.id,
  'Producto sin ' || case when p.family_id is null then 'familia' else 'categoría' end || ': ' || p.name,
  'SKU ' || p.sku, 'media', 'compras'::public.app_role
from public.products p
where p.active and (p.family_id is null or p.category_id is null)

union all
-- 3 · Productos con datos mínimos faltantes (precio o costo)
select 'producto_incompleto', 'producto', p.id,
  'Producto sin ' || concat_ws(' ni ', case when p.price is null then 'precio' end, case when p.cost is null then 'costo' end) || ': ' || p.name,
  'SKU ' || p.sku || '. Sin costo no se puede calcular margen.', 'media', 'compras'::public.app_role
from public.products p
where p.active and (p.price is null or p.cost is null)

union all
-- 4 · Categorías obsoletas o inconsistentes: producto activo en familia o categoría dada de baja
select 'clasificacion_obsoleta', 'producto', p.id,
  'Producto en clasificación dada de baja: ' || p.name,
  concat_ws(' · ', case when not f.active then 'Familia inactiva: ' || f.name end, case when cat.id is not null and not cat.active then 'Categoría inactiva: ' || cat.name end),
  'media', 'compras'::public.app_role
from public.products p
join public.product_families f on f.id = p.family_id
left join public.product_categories cat on cat.id = p.category_id
where p.active and (not f.active or (cat.id is not null and not cat.active))

union all
-- 4b · Categorías duplicadas: mismo nombre en más de una familia
select 'categoria_duplicada', 'categoria', cat.id,
  'Categoría repetida en varias familias: ' || cat.name,
  'También existe en: ' || (select string_agg(f2.name, ', ' order by f2.name) from public.product_categories c2 join public.product_families f2 on f2.id = c2.family_id
    where c2.active and c2.id <> cat.id and lower(btrim(c2.name)) = lower(btrim(cat.name))),
  'baja', 'compras'::public.app_role
from public.product_categories cat
where cat.active and exists (select 1 from public.product_categories c2 where c2.active and c2.id <> cat.id and lower(btrim(c2.name)) = lower(btrim(cat.name)))

union all
-- 5 · Cotizaciones sin seguimiento
select 'cotizacion_sin_seguimiento', 'cotizacion', q.id,
  'Cotización sin seguimiento: ' || coalesce(q.folio, ''),
  'Último seguimiento: ' || coalesce(to_char(q.last_follow_up_at at time zone 'America/Mexico_City', 'DD/MM/YYYY'), 'nunca') || ' · Total ' || q.total::text,
  'alta', 'ventas'::public.app_role
from public.quotes q
where q.status in ('enviada', 'negociacion')
  and coalesce(q.last_follow_up_at, q.created_at) < now() - make_interval(days => private.setting('quote_follow_up_days')::int)

union all
-- 6 · Pedidos con información pendiente
select 'pedido_incompleto', 'pedido', o.id,
  'Pedido con información pendiente: ' || coalesce(o.folio, o.shopify_order_name, ''),
  'Falta: ' || concat_ws(', ',
    case when o.customer_id is null then 'cliente' end,
    case when o.rep_id is null and o.channel = 'directo' then 'vendedor' end,
    case when o.promised_on is null then 'fecha prometida' end,
    case when o.shipping_address is null then 'domicilio de entrega' end),
  'media', 'ventas'::public.app_role
from public.sales_orders o
where o.status not in ('entregado', 'cancelado')
  and (o.customer_id is null or (o.rep_id is null and o.channel = 'directo') or o.promised_on is null or o.shipping_address is null)

union all
-- 7 · Remisiones pendientes de verificación
select 'remision_sin_verificar', 'remision', r.id,
  'Remisión sin verificar: ' || coalesce(r.folio, ''),
  'Entregada el ' || to_char(r.delivered_at at time zone 'America/Mexico_City', 'DD/MM/YYYY') || ' · Recibió: ' || coalesce(r.received_by_name, '—'),
  'alta', 'finanzas'::public.app_role
from public.remissions r
where r.status = 'entregada' and r.delivered_at < now() - make_interval(days => private.setting('remission_verify_days')::int)

union all
-- 8 · Documentos o evidencias faltantes: remisión entregada sin evidencia
select 'remision_sin_evidencia', 'remision', r.id,
  'Remisión entregada sin evidencia: ' || coalesce(r.folio, ''),
  'No tiene foto ni documento que respalde la entrega.', 'alta', 'logistica'::public.app_role
from public.remissions r
where r.status in ('entregada', 'verificada') and cardinality(r.evidence_paths) = 0

union all
-- 8b · Documentos faltantes: pedido entregado sin factura
select 'pedido_sin_factura', 'pedido', o.id,
  'Pedido entregado sin factura: ' || coalesce(o.folio, o.shopify_order_name, ''),
  'Total ' || o.total::text, 'media', 'finanzas'::public.app_role
from public.sales_orders o
where o.status = 'entregado' and o.channel = 'directo'
  and o.updated_at < now() - make_interval(days => private.setting('invoice_after_delivery_days')::int)
  and not exists (select 1 from public.invoices i where i.sales_order_id = o.id and i.status <> 'cancelada')

union all
-- 9 · Movimientos que no corresponden con el estado real: existencia negativa
select 'existencia_negativa', 'producto', s.product_id,
  'Existencia negativa: ' || p.name,
  'Ubicación ' || l.code || ': ' || s.quantity::text || '. Salió más de lo registrado como entrada.', 'alta', 'almacen'::public.app_role
from public.stock_levels s
join public.products p on p.id = s.product_id
join public.locations l on l.id = s.location_id
where s.quantity < 0

union all
-- 9b · Pedido marcado como enviado o entregado sin salida de bodega
select 'pedido_sin_salida', 'pedido', o.id,
  'Pedido ' || o.status || ' sin salida de bodega: ' || coalesce(o.folio, o.shopify_order_name, ''),
  'Tiene renglones de catálogo que no registran salida de inventario.', 'alta', 'almacen'::public.app_role
from public.sales_orders o
where o.status in ('enviado', 'entregado')
  and exists (select 1 from public.sales_order_lines l where l.order_id = o.id and l.product_id is not null and l.quantity_fulfilled < l.quantity)

union all
-- 9c · Diferencia de conteo sin resolver
select 'conteo_sin_resolver', 'conteo', c.id,
  'Diferencia de conteo sin resolver: ' || p.name,
  'Sistema ' || c.system_quantity::text || ', contado ' || c.counted_quantity::text || ' (diferencia ' || c.difference::text || ')', 'media', 'direccion'::public.app_role
from public.stock_counts c join public.products p on p.id = c.product_id
where c.status = 'pendiente' and c.counted_at < now() - make_interval(days => private.setting('count_pending_days')::int)

union all
-- 10 · Información sin actualizarse: pedido abierto sin cambios
select 'pedido_detenido', 'pedido', o.id,
  'Pedido sin movimiento: ' || coalesce(o.folio, o.shopify_order_name, ''),
  'Sigue en "' || o.status || '" desde el ' || to_char(o.updated_at at time zone 'America/Mexico_City', 'DD/MM/YYYY'), 'media',
  (case when o.status in ('nuevo', 'confirmado') then 'ventas' when o.status = 'en_compra' then 'compras' else 'logistica' end)::public.app_role
from public.sales_orders o
where o.status in ('nuevo', 'confirmado', 'en_compra', 'en_surtido', 'enviado')
  and o.updated_at < now() - make_interval(days => private.setting('order_stale_days')::int)

union all
-- 10b · Compra enviada al proveedor que ya debió llegar
select 'compra_atrasada', 'compra', po.id,
  'Compra atrasada: ' || coalesce(po.folio, ''),
  'Se esperaba el ' || to_char(po.expected_on, 'DD/MM/YYYY') || ' · ' || s.name, 'media', 'compras'::public.app_role
from public.purchase_orders po join public.suppliers s on s.id = po.supplier_id
where po.status in ('enviada', 'parcial') and po.expected_on is not null and po.expected_on < current_date;

revoke all on public.data_quality_findings from anon, authenticated;
grant select on public.data_quality_findings to authenticated;

-- ── De hallazgos a pendientes ───────────────────────────────────────────────
-- · Crea un pendiente por hallazgo nuevo (el índice único evita duplicados abiertos).
-- · No reabre lo que una persona descartó.
-- · Cierra solo lo que ya se corrigió.
create function private.sync_issues()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_created integer;
  v_resolved integer;
begin
  with inserted as (
    insert into public.issues (rule_code, entity_type, entity_id, title, detail, severity, assigned_role)
    select f.rule_code, f.entity_type, f.entity_id, f.title, f.detail, f.severity, f.assigned_role
    from public.data_quality_findings f
    where not exists (
      select 1 from public.issues i
      where i.rule_code = f.rule_code and i.entity_type = f.entity_type and i.entity_id = f.entity_id and i.status in ('abierto', 'en_proceso', 'descartado')
    )
    on conflict do nothing
    returning 1
  )
  select count(*) into v_created from inserted;

  with closed as (
    update public.issues i set status = 'resuelto', resolved_at = now(), resolution_note = 'Corregido en el sistema'
    where i.status in ('abierto', 'en_proceso')
      -- Solo las reglas fijas: los pendientes que crean los agentes o las personas no se cierran solos.
      and i.rule_code = any (array[
        'cliente_incompleto', 'producto_sin_clasificar', 'producto_incompleto', 'clasificacion_obsoleta', 'categoria_duplicada',
        'cotizacion_sin_seguimiento', 'pedido_incompleto', 'remision_sin_verificar', 'remision_sin_evidencia', 'pedido_sin_factura',
        'existencia_negativa', 'pedido_sin_salida', 'conteo_sin_resolver', 'pedido_detenido', 'compra_atrasada'])
      and not exists (
        select 1 from public.data_quality_findings f
        where f.rule_code = i.rule_code and f.entity_type = i.entity_type and f.entity_id = i.entity_id
      )
    returning 1
  )
  select count(*) into v_resolved from closed;

  -- El detalle de un pendiente abierto se mantiene al día (p. ej. cambia qué dato falta).
  update public.issues i set title = f.title, detail = f.detail
  from public.data_quality_findings f
  where i.status in ('abierto', 'en_proceso') and f.rule_code = i.rule_code and f.entity_type = i.entity_type and f.entity_id = i.entity_id
    and (i.title, i.detail) is distinct from (f.title, f.detail);

  return jsonb_build_object('created', v_created, 'resolved', v_resolved);
end;
$$;

-- ── Alertas por excepción ───────────────────────────────────────────────────
-- Solo lo que dirección debe saber sin entrar a buscar. `dedupe_key` evita repetir
-- la misma alerta: una por factura vencida, una por producto y semana en reorden.
create function private.sync_alerts()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_created integer;
begin
  with candidates as (
    select 'factura_vencida' as alert_code, 'factura_vencida:' || b.id::text as dedupe_key,
      'Factura vencida: ' || concat_ws('-', b.series, b.folio) as title,
      c.name || ' · Saldo ' || b.balance::text || ' · Venció el ' || to_char(b.due_on, 'DD/MM/YYYY') as detail,
      'alta' as severity, jsonb_build_object('invoice_id', b.id, 'customer_id', b.customer_id, 'balance', b.balance) as payload
    from public.invoice_balances b join public.customers c on c.id = b.customer_id
    where b.overdue

    union all
    select 'punto_de_reorden', 'punto_de_reorden:' || p.id::text || ':' || to_char(current_date, 'IYYY-IW'),
      'En punto de reorden: ' || p.name,
      'Existencia ' || t.quantity::text || ' · Punto de reorden ' || p.reorder_point::text,
      'media', jsonb_build_object('product_id', p.id, 'quantity', t.quantity, 'reorder_point', p.reorder_point)
    from public.products p
    join (select product_id, sum(quantity) as quantity from public.stock_levels group by product_id) t on t.product_id = p.id
    where p.active and p.reorder_point > 0 and t.quantity <= p.reorder_point

    union all
    select 'pendientes_graves', 'pendientes_graves:' || to_char(current_date, 'IYYY-IW'),
      count(*)::text || ' pendientes de severidad alta sin atender',
      'Revisa la bandeja de pendientes.', 'alta', jsonb_build_object('count', count(*))
    from public.issues where status = 'abierto' and severity = 'alta'
    having count(*) >= 5
  ), inserted as (
    insert into public.alerts (alert_code, dedupe_key, title, detail, severity, payload)
    select alert_code, dedupe_key, title, detail, severity, payload from candidates
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_created from inserted;
  return v_created;
end;
$$;

-- Revisión bajo demanda desde la app (botón "Revisar ahora").
create function public.run_data_quality_check()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_issues jsonb;
begin
  if not private.is_member() then
    raise exception 'Tu cuenta no tiene acceso' using errcode = '42501';
  end if;
  v_issues := private.sync_issues();
  return v_issues || jsonb_build_object('alerts', private.sync_alerts());
end;
$$;
revoke all on function public.run_data_quality_check() from public, anon;
grant execute on function public.run_data_quality_check() to authenticated;

-- Revisión automática cada hora.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('mitra-calidad-de-datos', '5 * * * *', $$select private.sync_issues(); select private.sync_alerts();$$);

revoke all on all functions in schema private from public, anon;
-- La vista de hallazgos corre con los permisos de quien consulta y lee los umbrales.
grant execute on function private.setting(text) to authenticated;
