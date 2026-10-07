-- Mitra Click · Sistema operativo · 9 · Agentes y reportes (versión por reglas)
-- Los agentes y los reportes leen las mismas métricas que el dashboard (migración 7)
-- y los mismos pendientes (migración 6). Aquí vive la versión por reglas, que funciona
-- sin llave de IA; la Edge Function `agent-narrate` solo redacta sobre esta evidencia.
--
-- Principios:
--   · Un agente propone y asigna; nunca modifica datos de negocio.
--   · Cada hallazgo guarda su evidencia (los números y registros que lo sustentan).
--   · Un hallazgo abierto no se repite en la siguiente corrida (dedupe_key).

alter table public.agent_findings add column dedupe_key text;
create unique index agent_findings_open_unique on public.agent_findings (agent, dedupe_key) where status = 'nuevo';

insert into public.control_settings (key, value, label, unit) values
  ('customer_inactive_days', 60, 'Cliente sin pedidos después de', 'días'),
  ('family_change_pct', 30, 'Cambio relevante en ventas de una familia', '%'),
  ('quote_relevant_amount', 20000, 'Cotización relevante a partir de', 'pesos'),
  ('rep_pending_follow_ups', 3, 'Vendedor con seguimiento pendiente a partir de', 'cotizaciones');

create function private.money(p numeric)
returns text
language sql immutable set search_path = ''
as $$ select '$' || to_char(coalesce(p, 0), 'FM999,999,999,990') $$;

create function private.pct_change(p_now numeric, p_before numeric)
returns numeric
language sql immutable set search_path = ''
as $$ select case when coalesce(p_before, 0) = 0 then null else round((p_now - p_before) / p_before * 100, 1) end $$;

-- ═══ Reportes ═══════════════════════════════════════════════════════════════
create function private.build_report(p_kind text, p_start date, p_end date)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_days integer := p_end - p_start + 1;
  v_prev_start date := p_start - v_days;
  v_prev_end date := p_start - 1;
  v_now jsonb := public.kpi_commercial(p_start, p_end);
  v_before jsonb := public.kpi_commercial(v_prev_start, v_prev_end);
  v_ops jsonb := public.kpi_operations(p_start, p_end);
  v_period jsonb := jsonb_build_object('start', p_start, 'end', p_end, 'previous_start', v_prev_start, 'previous_end', v_prev_end);
begin
  if p_kind = 'ejecutivo' then
    return jsonb_build_object('period', v_period, 'commercial', v_now, 'previous', v_before, 'operations', v_ops,
      'top_families', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from (select family, sales, units from public.kpi_by_family(p_start, p_end) limit 3) f),
      'top_products', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from (select sku, product, sales, units from public.kpi_by_product(p_start, p_end) where units > 0 limit 5) p),
      'quotes_without_follow_up', (select count(*) from public.data_quality_findings where rule_code = 'cotizacion_sin_seguimiento'),
      'incomplete_records', (select count(*) from public.data_quality_findings where rule_code in ('cliente_incompleto', 'producto_sin_clasificar', 'producto_incompleto', 'pedido_incompleto')));
  elsif p_kind = 'comercial' then
    return jsonb_build_object('period', v_period, 'commercial', v_now, 'previous', v_before,
      'by_rep', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.kpi_by_rep(p_start, p_end) r),
      'open_quotes', (select coalesce(jsonb_agg(to_jsonb(q)), '[]') from (
        select q.folio, c.name as customer, q.total, q.status, q.last_follow_up_at from public.quotes q join public.customers c on c.id = q.customer_id
        where q.status in ('enviada', 'negociacion') order by q.total desc limit 10) q));
  elsif p_kind = 'productos' then
    return jsonb_build_object('period', v_period,
      'by_family', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.kpi_by_family(p_start, p_end) f),
      'previous_by_family', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.kpi_by_family(v_prev_start, v_prev_end) f),
      'top_products', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from (select sku, product, family, sales, units, margin from public.kpi_by_product(p_start, p_end) where units > 0 limit 10) p),
      'idle_with_stock', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from (select sku, product, stock from public.kpi_by_product(p_start, p_end) where units = 0 and stock > 0 order by stock desc limit 10) p),
      'idle_count', (select count(*) from public.kpi_by_product(p_start, p_end) where units = 0));
  elsif p_kind = 'operacion' then
    return jsonb_build_object('period', v_period, 'operations', v_ops, 'previous', public.kpi_operations(v_prev_start, v_prev_end),
      'late_orders', (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from (
        select coalesce(o.folio, o.shopify_order_name) as folio, c.name as customer, o.status, o.promised_on from public.sales_orders o left join public.customers c on c.id = o.customer_id
        where o.status in ('nuevo', 'confirmado', 'en_compra', 'en_surtido', 'enviado') and o.promised_on < current_date order by o.promised_on limit 10) o),
      'issues_by_rule', (select coalesce(jsonb_agg(to_jsonb(i)), '[]') from (select rule_code, count(*) as open from public.issues where status in ('abierto', 'en_proceso') group by rule_code order by 2 desc) i));
  elsif p_kind = 'inventario' then
    return jsonb_build_object('period', v_period, 'operations', v_ops,
      'movements_by_type', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from (select movement_type, count(*) as movements, sum(quantity_delta) as units from public.stock_movements where performed_at::date between p_start and p_end group by movement_type order by 1) m),
      'low_stock', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from (
        select p.sku, p.name as product, t.quantity, p.reorder_point from public.products p
        join (select product_id, sum(quantity) as quantity from public.stock_levels group by product_id) t on t.product_id = p.id
        where p.active and p.reorder_point > 0 and t.quantity <= p.reorder_point order by t.quantity limit 15) s),
      'count_differences', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from (
        select p.sku, p.name as product, c.system_quantity, c.counted_quantity, c.difference, c.status from public.stock_counts c join public.products p on p.id = c.product_id
        where c.counted_at::date between p_start and p_end and c.difference <> 0 order by abs(c.difference) desc limit 15) c));
  end if;
  raise exception 'Tipo de reporte no válido: %', p_kind;
end;
$$;

-- Lectura ejecutiva por reglas: primero lo que exige decisión, después los cambios.
create function private.executive_narrative(p jsonb)
returns text
language sql immutable set search_path = ''
as $$
  select concat_ws(E'\n',
    'Atención requerida: ' || coalesce(nullif(concat_ws(', ',
      nullif((p ->> 'quotes_without_follow_up')::int, 0)::text || ' cotizaciones sin seguimiento',
      nullif((p -> 'operations' ->> 'orders_late')::int, 0)::text || ' pedidos atrasados',
      nullif((p -> 'operations' ->> 'stock_negative')::int, 0)::text || ' existencias en negativo',
      nullif((p ->> 'incomplete_records')::int, 0)::text || ' registros con información incompleta'), ''), 'nada urgente') || '.',
    'Ventas del periodo: ' || private.money((p -> 'commercial' ->> 'sales')::numeric)
      || coalesce(' · variación ' || to_char(private.pct_change((p -> 'commercial' ->> 'sales')::numeric, (p -> 'previous' ->> 'sales')::numeric), 'FMSG990.0') || '% vs. periodo anterior', ' · sin periodo anterior para comparar')
      || ' · ' || (p -> 'commercial' ->> 'orders') || ' pedidos.',
    'Familia con mayor venta: ' || (p -> 'top_families' -> 0 ->> 'family')
      || coalesce(' · principales productos: ' || (select string_agg(x ->> 'product', ' y ') from (select x from jsonb_array_elements(p -> 'top_products') x limit 2) t), '') || '.',
    'Operación: ' || (p -> 'operations' ->> 'orders_to_deliver') || ' pedidos pendientes de entrega y ' || (p -> 'operations' ->> 'remissions_to_verify') || ' remisiones pendientes de verificar.',
    'Cobranza: ' || private.money((p -> 'commercial' ->> 'receivable')::numeric) || ' por cobrar'
      || case when (p -> 'commercial' ->> 'receivable_overdue')::numeric > 0 then ', de los cuales ' || private.money((p -> 'commercial' ->> 'receivable_overdue')::numeric) || ' están vencidos.' else '.' end
  )
$$;

create function private.generate_report(p_kind text, p_frequency text, p_period_start date, p_period_end date)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_content jsonb := private.build_report(p_kind, p_period_start, p_period_end);
  v_id uuid;
begin
  insert into public.reports (kind, frequency, period_start, period_end, content, narrative, generated_by)
  values (p_kind, p_frequency, p_period_start, p_period_end, v_content, case when p_kind = 'ejecutivo' then private.executive_narrative(v_content) end, 'reglas')
  on conflict (kind, frequency, period_start) do update
    set period_end = excluded.period_end, content = excluded.content, narrative = excluded.narrative, generated_by = 'reglas', generated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

-- Genera los cinco reportes del periodo que acaba de cerrar.
--   semanal: lunes a domingo anterior · quincenal: 1–15 o 16–fin · mensual: mes anterior.
create function private.generate_period_reports(p_frequency text, p_today date default current_date)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_start date;
  v_end date;
  k text;
begin
  if p_frequency = 'semanal' then
    v_start := date_trunc('week', p_today)::date - 7;
    v_end := v_start + 6;
  elsif p_frequency = 'quincenal' then
    if extract(day from p_today) <= 15 then
      v_start := (date_trunc('month', p_today) - interval '1 month')::date + 15;
      v_end := date_trunc('month', p_today)::date - 1;
    else
      v_start := date_trunc('month', p_today)::date;
      v_end := v_start + 14;
    end if;
  elsif p_frequency = 'mensual' then
    v_start := (date_trunc('month', p_today) - interval '1 month')::date;
    v_end := date_trunc('month', p_today)::date - 1;
  else
    raise exception 'Frecuencia no válida: %', p_frequency;
  end if;

  foreach k in array array['ejecutivo', 'comercial', 'productos', 'operacion', 'inventario'] loop
    perform private.generate_report(k, p_frequency, v_start, v_end);
  end loop;
  return 5;
end;
$$;

create function public.generate_reports(p_frequency text)
returns integer
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_role('{direccion,admin}');
  return private.generate_period_reports(p_frequency);
end;
$$;

-- ═══ Agentes ════════════════════════════════════════════════════════════════
create function private.add_finding(p_run bigint, p_agent text, p_key text, p_title text, p_detail text, p_evidence jsonb, p_action text, p_role public.app_role)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.agent_findings (run_id, agent, dedupe_key, title, detail, evidence, suggested_action, assigned_role)
  values (p_run, p_agent, p_key, p_title, p_detail, p_evidence, p_action, p_role)
  on conflict (agent, dedupe_key) where status = 'nuevo' do nothing
$$;

create function private.run_agent(p_agent text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_run bigint;
  v_week text := to_char(current_date, 'IYYY-IW');
  v_today date := current_date;
  r record;
  v_report jsonb;
begin
  if p_agent not in ('supervision', 'comercial', 'marketing', 'ejecutivo') then
    raise exception 'Agente no válido: %', p_agent;
  end if;
  insert into public.agent_runs (agent, mode) values (p_agent, 'reglas') returning id into v_run;

  -- Bloque interno: si algo falla se deshacen sus hallazgos, pero la corrida queda registrada como fallida.
  begin
  if p_agent = 'supervision' then
    -- Pone al día los pendientes y resume dónde se concentran, por área responsable.
    perform private.sync_issues();
    for r in
      select i.rule_code, i.assigned_role, count(*) as total, count(*) filter (where i.detected_at < now() - interval '7 days') as old,
        jsonb_agg(jsonb_build_object('issue_id', i.id, 'title', i.title) order by i.detected_at) filter (where true) as sample
      from public.issues i where i.status in ('abierto', 'en_proceso')
      group by i.rule_code, i.assigned_role having count(*) >= 3 or bool_or(i.severity = 'alta')
    loop
      perform private.add_finding(v_run, p_agent, r.rule_code || ':' || coalesce(r.assigned_role::text, '') || ':' || v_week,
        r.total || ' pendientes abiertos: ' || replace(r.rule_code, '_', ' '),
        case when r.old > 0 then r.old || ' llevan más de 7 días sin resolverse.' else 'Todos son de esta semana.' end,
        jsonb_build_object('rule_code', r.rule_code, 'open', r.total, 'older_than_7_days', r.old, 'sample', (select jsonb_agg(x) from (select x from jsonb_array_elements(r.sample) x limit 5) t)),
        'Revisar la bandeja de pendientes filtrada por esta regla y repartir los casos.', r.assigned_role);
    end loop;

  elsif p_agent = 'comercial' then
    -- Cotización relevante que lleva demasiado tiempo abierta.
    for r in
      select q.id, q.folio, q.total, c.name as customer, s.name as rep, coalesce(q.last_follow_up_at, q.created_at) as last_touch
      from public.quotes q join public.customers c on c.id = q.customer_id left join public.sales_reps s on s.id = q.rep_id
      where q.status in ('enviada', 'negociacion') and q.total >= private.setting('quote_relevant_amount')
        and coalesce(q.last_follow_up_at, q.created_at) < now() - make_interval(days => private.setting('quote_follow_up_days')::int)
    loop
      perform private.add_finding(v_run, p_agent, 'cotizacion:' || r.id::text,
        'Cotización relevante sin movimiento: ' || coalesce(r.folio, ''),
        r.customer || ' · ' || private.money(r.total) || ' · último contacto ' || to_char(r.last_touch at time zone 'America/Mexico_City', 'DD/MM/YYYY') || coalesce(' · ' || r.rep, ' · sin vendedor asignado'),
        jsonb_build_object('quote_id', r.id, 'total', r.total, 'last_touch', r.last_touch),
        'Contactar al cliente hoy y registrar el seguimiento en la cotización.', 'ventas');
    end loop;

    -- Cliente que compraba y dejó de moverse.
    for r in
      select c.id, c.name, max(o.ordered_on) as last_order, count(*) as orders, sum(o.subtotal) as sales, s.name as rep
      from public.customers c join public.sales_orders o on o.customer_id = c.id and o.status <> 'cancelado' left join public.sales_reps s on s.id = c.rep_id
      where c.active group by c.id, c.name, s.name
      having count(*) >= 2 and max(o.ordered_on) < v_today - private.setting('customer_inactive_days')::int
      order by sum(o.subtotal) desc limit 10
    loop
      perform private.add_finding(v_run, p_agent, 'cliente_inactivo:' || r.id::text || ':' || to_char(v_today, 'YYYY-MM'),
        'Cliente que dejó de comprar: ' || r.name,
        r.orders || ' pedidos por ' || private.money(r.sales) || ' · último el ' || to_char(r.last_order, 'DD/MM/YYYY') || coalesce(' · ' || r.rep, ''),
        jsonb_build_object('customer_id', r.id, 'last_order', r.last_order, 'orders', r.orders, 'sales', r.sales),
        'Llamar para entender si cambió de proveedor y ofrecer una cotización.', 'ventas');
    end loop;

    -- Familia que crece o cae de forma relevante (últimos 30 días contra los 30 anteriores).
    for r in
      select coalesce(n.family, b.family) as family, coalesce(n.sales, 0) as now_sales, coalesce(b.sales, 0) as before_sales,
        private.pct_change(coalesce(n.sales, 0), b.sales) as change
      from public.kpi_by_family(v_today - 59, v_today - 30) b
      left join public.kpi_by_family(v_today - 29, v_today) n on n.family_id is not distinct from b.family_id
      where coalesce(b.sales, 0) > 0 and abs(private.pct_change(coalesce(n.sales, 0), b.sales)) >= private.setting('family_change_pct')
    loop
      perform private.add_finding(v_run, p_agent, 'familia:' || r.family || ':' || v_week,
        'La familia ' || r.family || (case when r.change > 0 then ' creció ' else ' cayó ' end) || abs(r.change) || '%',
        'Últimos 30 días: ' || private.money(r.now_sales) || ' · 30 días anteriores: ' || private.money(r.before_sales),
        jsonb_build_object('family', r.family, 'sales_last_30', r.now_sales, 'sales_previous_30', r.before_sales, 'change_pct', r.change),
        case when r.change > 0 then 'Revisar existencias y si conviene empujarla comercialmente.' else 'Revisar precios, disponibilidad y si un cliente clave dejó de pedirla.' end, 'direccion');
    end loop;

    -- Vendedor con seguimiento acumulado.
    for r in select * from public.kpi_by_rep(v_today - 29, v_today) where pending_follow_ups >= private.setting('rep_pending_follow_ups') loop
      perform private.add_finding(v_run, p_agent, 'vendedor:' || r.rep_id::text || ':' || v_week,
        r.rep || ' tiene ' || r.pending_follow_ups || ' cotizaciones sin seguimiento',
        'Ventas de los últimos 30 días: ' || private.money(r.sales) || ' · ' || r.quotes_issued || ' cotizaciones emitidas.',
        jsonb_build_object('rep_id', r.rep_id, 'pending_follow_ups', r.pending_follow_ups, 'sales', r.sales),
        'Revisar con el vendedor sus cotizaciones abiertas esta semana.', 'direccion');
    end loop;

  elsif p_agent = 'marketing' then
    -- Actividad contra resultado por fuente: leads de los últimos 30 días y en qué terminaron.
    for r in
      select l.source, count(*) as leads, count(*) filter (where l.status in ('calificado', 'cotizado', 'ganado')) as opportunities,
        count(*) filter (where l.status = 'ganado') as won,
        (select count(*) from public.leads p where p.source = l.source and p.created_at >= now() - interval '60 days' and p.created_at < now() - interval '30 days') as before
      from public.leads l where l.created_at >= now() - interval '30 days' group by l.source
    loop
      if r.leads >= 5 and r.opportunities = 0 then
        perform private.add_finding(v_run, p_agent, 'sin_oportunidades:' || r.source || ':' || v_week,
          'El canal ' || r.source || ' genera contactos pero no oportunidades',
          r.leads || ' leads en 30 días y ninguno calificado, cotizado o ganado.',
          jsonb_build_object('source', r.source, 'leads', r.leads, 'opportunities', r.opportunities),
          'Revisar la calidad de los contactos de este canal y el seguimiento que se les da.', 'marketing');
      end if;
      if r.before >= 5 and abs(private.pct_change(r.leads, r.before)) >= 50 then
        perform private.add_finding(v_run, p_agent, 'variacion:' || r.source || ':' || v_week,
          'Los leads de ' || r.source || (case when r.leads > r.before then ' subieron ' else ' bajaron ' end) || abs(private.pct_change(r.leads, r.before)) || '%',
          r.leads || ' en los últimos 30 días contra ' || r.before || ' en los 30 anteriores.',
          jsonb_build_object('source', r.source, 'leads_last_30', r.leads, 'leads_previous_30', r.before),
          'Explicar la variación: campaña, publicación o cambio en el canal.', 'marketing');
      end if;
    end loop;

    -- Links NFC/QR activos sin un solo escaneo en 30 días.
    for r in
      select t.id, t.label, t.channel from public.tracked_links t
      where t.active and t.created_at < now() - interval '14 days'
        and not exists (select 1 from public.link_events e where e.link_id = t.id and e.occurred_at >= now() - interval '30 days')
    loop
      perform private.add_finding(v_run, p_agent, 'link_sin_uso:' || r.id::text || ':' || to_char(v_today, 'YYYY-MM'),
        'Link sin escaneos en 30 días: ' || r.label, 'Canal: ' || r.channel,
        jsonb_build_object('link_id', r.id, 'channel', r.channel),
        'Confirmar que la tarjeta o el código está en uso, o desactivar el link.', 'marketing');
    end loop;

    -- Leads sin contacto.
    for r in select count(*) as total from public.leads where status = 'nuevo' and created_at < now() - interval '2 days' having count(*) > 0 loop
      perform private.add_finding(v_run, p_agent, 'leads_sin_contactar:' || v_week,
        r.total || ' leads llevan más de 2 días sin contactar', 'Siguen en estado "nuevo".',
        jsonb_build_object('leads', r.total), 'Asignarlos a un vendedor y registrar el primer contacto.', 'ventas');
    end loop;

  elsif p_agent = 'ejecutivo' then
    -- Lectura de los últimos 7 días, con la misma evidencia que el reporte ejecutivo.
    v_report := private.build_report('ejecutivo', v_today - 6, v_today);
    perform private.add_finding(v_run, p_agent, 'lectura:' || v_today::text,
      'Lectura ejecutiva al ' || to_char(v_today, 'DD/MM/YYYY'), private.executive_narrative(v_report), v_report,
      'Revisar primero la atención requerida.', 'direccion');
  end if;

  update public.agent_runs set status = 'exitoso', finished_at = now(),
    output = jsonb_build_object('findings', (select count(*) from public.agent_findings where run_id = v_run))
  where id = v_run;
  exception when others then
    update public.agent_runs set status = 'fallido', finished_at = now(), error = sqlerrm where id = v_run;
  end;
  return v_run;
end;
$$;

create function public.run_agent(p_agent text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_role('{direccion,admin}');
  return private.run_agent(p_agent);
end;
$$;

-- Un hallazgo aceptado puede volverse un pendiente asignado, para darle seguimiento.
create function public.convert_finding_to_issue(p_id bigint)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  f public.agent_findings;
  v_issue bigint;
begin
  perform private.require_role('{direccion,admin}');
  select * into f from public.agent_findings where id = p_id for update;
  if not found then raise exception 'El hallazgo no existe'; end if;
  if f.status not in ('nuevo', 'aceptado') then raise exception 'Este hallazgo ya fue %', f.status; end if;

  insert into public.issues (rule_code, entity_type, title, detail, severity, assigned_role)
  values ('agente_' || f.agent, 'hallazgo', f.title, concat_ws(E'\n', f.detail, 'Acción sugerida: ' || f.suggested_action), 'media', f.assigned_role)
  returning id into v_issue;
  update public.agent_findings set status = 'convertido', issue_id = v_issue where id = p_id;
  return v_issue;
end;
$$;

-- Redacción con IA: la Edge Function `agent-narrate` guarda aquí el texto (solo servidor).
create function public.save_ai_narrative(p_target text, p_id text, p_narrative text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_target = 'report' then
    update public.reports set narrative = p_narrative, generated_by = 'ia' where id = p_id::uuid;
  elsif p_target = 'run' then
    update public.agent_runs set mode = 'ia', output = coalesce(output, '{}'::jsonb) || jsonb_build_object('narrative', p_narrative) where id = p_id::bigint;
  else
    raise exception 'Destino no válido';
  end if;
end;
$$;

revoke all on function public.generate_reports(text), public.run_agent(text), public.convert_finding_to_issue(bigint) from public, anon;
grant execute on function public.generate_reports(text), public.run_agent(text), public.convert_finding_to_issue(bigint) to authenticated;
revoke all on function public.save_ai_narrative(text, text, text) from public, anon, authenticated;
grant execute on function public.save_ai_narrative(text, text, text) to service_role;

-- ═══ Programación (hora del servidor: UTC; 13:00 UTC = 7:00 en la Ciudad de México) ═══
select cron.schedule('mitra-agentes-diario', '0 13 * * *',
  $$select private.run_agent('supervision'); select private.run_agent('comercial'); select private.run_agent('marketing'); select private.run_agent('ejecutivo');$$);
select cron.schedule('mitra-reportes-semanal', '30 13 * * 1', $$select private.generate_period_reports('semanal');$$);
select cron.schedule('mitra-reportes-quincenal', '40 13 1,16 * *', $$select private.generate_period_reports('quincenal');$$);
select cron.schedule('mitra-reportes-mensual', '50 13 1 * *', $$select private.generate_period_reports('mensual');$$);

revoke all on all functions in schema private from public, anon;
grant execute on function private.setting(text) to authenticated;
