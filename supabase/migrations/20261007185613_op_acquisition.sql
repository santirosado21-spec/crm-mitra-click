-- Mitra Click · Sistema operativo · 10 · Adquisición medible
-- Links NFC/QR con conteo de escaneos, leads con su fuente, embudo de prospección
-- (LinkedIn B2B y demás canales) y métricas de SEO cargadas desde Search Console.
-- Principio del plan: distinguir actividad de resultado, y medir solo lo trazable.

-- ── Links medibles ──────────────────────────────────────────────────────────
-- La Edge Function pública `go` llama a esta función: registra el escaneo y devuelve
-- a dónde redirigir. No guarda IP ni identificadores: solo el momento y el tipo de dispositivo.
create function public.track_link(p_code text, p_device text default null)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_url text;
begin
  select id, destination_url into v_id, v_url from public.tracked_links where code = p_code and active;
  if v_id is null then
    return null;
  end if;
  insert into public.link_events (link_id, device) values (v_id, case when p_device in ('movil', 'escritorio') then p_device else 'otro' end);
  return v_url;
end;
$$;
revoke all on function public.track_link(text, text) from public, anon, authenticated;
grant execute on function public.track_link(text, text) to service_role;

-- Escaneos por link: total, últimos 30 días y último escaneo.
create view public.tracked_link_stats with (security_invoker = true) as
select t.id, t.code, t.label, t.destination_url, t.channel, t.campaign, t.active, t.created_at,
  count(e.id) as scans,
  count(e.id) filter (where e.occurred_at >= now() - interval '30 days') as scans_30d,
  max(e.occurred_at) as last_scan_at,
  (select count(*) from public.leads l where l.tracked_link_id = t.id) as leads
from public.tracked_links t left join public.link_events e on e.link_id = t.id
group by t.id;
revoke all on public.tracked_link_stats from anon, authenticated;
grant select on public.tracked_link_stats to authenticated;

-- ── Leads ───────────────────────────────────────────────────────────────────
-- Registrar una actividad actualiza el último contacto y, si el lead era nuevo, lo marca contactado.
create function private.touch_lead()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.leads set
    last_contact_at = new.occurred_at,
    status = case
      when status = 'nuevo' and new.kind in ('solicitud', 'mensaje') then 'contactado'
      when status in ('nuevo', 'contactado') and new.kind in ('respuesta', 'conversacion', 'reunion') then 'en_conversacion'
      else status end
  where id = new.lead_id;
  return new;
end;
$$;
create trigger touch_lead after insert on public.lead_activities for each row execute function private.touch_lead();

-- Lead → Cliente: crea el cliente (o liga uno existente con el mismo correo) sin recapturar.
create function public.convert_lead_to_customer(p_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  l public.leads;
  v_customer uuid;
begin
  perform private.require_role('{direccion,admin,ventas,marketing}');
  select * into l from public.leads where id = p_id for update;
  if not found then raise exception 'El lead no existe'; end if;
  if l.customer_id is not null then return l.customer_id; end if;

  if l.email is not null then
    select id into v_customer from public.customers where lower(email) = lower(l.email) order by created_at limit 1;
  end if;
  if v_customer is null then
    insert into public.customers (name, kind, contact_name, email, phone, rep_id, notes)
    values (coalesce(l.company, l.name), case when l.company is not null then 'empresa' else 'persona' end,
      case when l.company is not null then l.name end, lower(l.email), l.phone, l.rep_id, 'Viene de un lead (' || l.source || ')')
    returning id into v_customer;
  end if;

  update public.leads set customer_id = v_customer, status = case when status in ('nuevo', 'contactado', 'en_conversacion') then 'calificado' else status end where id = p_id;
  return v_customer;
end;
$$;
revoke all on function public.convert_lead_to_customer(uuid) from public, anon;
grant execute on function public.convert_lead_to_customer(uuid) to authenticated;

-- ── Embudo de adquisición por fuente ────────────────────────────────────────
--   Prospectos   = leads creados en el periodo.
--   Contactados  = con al menos una solicitud o mensaje.
--   Respuestas   = con al menos una respuesta.
--   Conversaciones = con conversación o reunión.
--   Oportunidades = calificados, cotizados o ganados.
--   Seguimiento pendiente = contactados o en conversación sin contacto en más de 5 días.
create function public.kpi_acquisition(p_start date, p_end date)
returns table (source text, prospects bigint, contacted bigint, replies bigint, conversations bigint, opportunities bigint, won bigint, pending_follow_up bigint)
language sql stable set search_path = ''
as $$
  select l.source, count(*),
    count(*) filter (where exists (select 1 from public.lead_activities a where a.lead_id = l.id and a.kind in ('solicitud', 'mensaje'))),
    count(*) filter (where exists (select 1 from public.lead_activities a where a.lead_id = l.id and a.kind = 'respuesta')),
    count(*) filter (where exists (select 1 from public.lead_activities a where a.lead_id = l.id and a.kind in ('conversacion', 'reunion'))),
    count(*) filter (where l.status in ('calificado', 'cotizado', 'ganado')),
    count(*) filter (where l.status = 'ganado'),
    count(*) filter (where l.status in ('contactado', 'en_conversacion') and coalesce(l.last_contact_at, l.created_at) < now() - interval '5 days')
  from public.leads l
  where l.created_at::date between p_start and p_end
  group by l.source
  order by 2 desc
$$;
revoke all on function public.kpi_acquisition(date, date) from public, anon;
grant execute on function public.kpi_acquisition(date, date) to authenticated;

-- ── SEO: métricas de Search Console ─────────────────────────────────────────
create table public.seo_metrics (
  id bigint generated always as identity primary key,
  period_start date not null,
  period_end date not null,
  dimension text not null check (dimension in ('consulta', 'pagina')),
  term text not null,
  clicks integer not null default 0 check (clicks >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  position numeric(6, 2),
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (period_start, period_end, dimension, term)
);
comment on table public.seo_metrics is 'Consultas y páginas de Google Search Console por periodo. Se carga por CSV.';
create index seo_metrics_period_idx on public.seo_metrics (period_start desc, dimension);

alter table public.seo_metrics enable row level security;
revoke all on public.seo_metrics from anon, authenticated;
grant select on public.seo_metrics to authenticated;
grant all on public.seo_metrics to service_role;
create policy "Miembros leen" on public.seo_metrics for select to authenticated using ((select private.is_member()));

-- Carga idempotente: volver a subir el mismo periodo reemplaza sus cifras.
create function public.import_seo_metrics(p_start date, p_end date, p_dimension text, p_rows jsonb)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  perform private.require_role('{direccion,admin,marketing}');
  if p_start is null or p_end is null or p_end < p_start then raise exception 'Indica el periodo que cubre el archivo'; end if;
  if p_dimension not in ('consulta', 'pagina') then raise exception 'Dimensión no válida'; end if;

  with upserted as (
    insert into public.seo_metrics (period_start, period_end, dimension, term, clicks, impressions, position)
    select p_start, p_end, p_dimension, btrim(r ->> 'term'), coalesce((r ->> 'clicks')::int, 0), coalesce((r ->> 'impressions')::int, 0), nullif(r ->> 'position', '')::numeric
    from jsonb_array_elements(p_rows) r
    where nullif(btrim(r ->> 'term'), '') is not null
    on conflict (period_start, period_end, dimension, term) do update
      set clicks = excluded.clicks, impressions = excluded.impressions, position = excluded.position
    returning 1
  )
  select count(*) into v_count from upserted;
  return v_count;
end;
$$;
revoke all on function public.import_seo_metrics(date, date, text, jsonb) from public, anon;
grant execute on function public.import_seo_metrics(date, date, text, jsonb) to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on function private.setting(text) to authenticated;
