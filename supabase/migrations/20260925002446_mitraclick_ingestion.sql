-- MitraClick Intelligence · 3/4 · Capa de aterrizaje de las APIs
-- raw.api_payloads guarda lo que llega de cada API (ERP, Shopify, GA4) antes de
-- normalizarlo, para auditar y re-procesar. El schema raw NO se expone en la Data API.
-- public.sync_runs es la bitácora de cada sincronización (alimenta "Estado de fuentes").

create schema if not exists raw;
revoke all on schema raw from public, anon, authenticated;
grant usage on schema raw to service_role;

create table raw.api_payloads (
  id bigint generated always as identity primary key,
  source public.data_source not null,
  entity text not null,
  external_id text,
  payload jsonb not null,
  payload_hash text generated always as (md5(payload::text)) stored,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (source, entity, external_id, payload_hash)
);
comment on table raw.api_payloads is 'Respuesta cruda de cada API. Un mismo registro con el mismo contenido no se duplica (payload_hash).';
create index api_payloads_pending_idx on raw.api_payloads (source, entity) where processed_at is null;

alter table raw.api_payloads enable row level security;
grant all on raw.api_payloads to service_role;

create table public.sync_runs (
  id bigint generated always as identity primary key,
  source public.data_source not null,
  entity text not null,
  status text not null default 'en_curso' check (status in ('en_curso', 'exitoso', 'parcial', 'fallido')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_received integer not null default 0,
  rows_upserted integer not null default 0,
  error text,
  triggered_by text
);
comment on table public.sync_runs is 'Una fila por corrida de sincronización. Escribe service_role; leen los miembros.';
create index sync_runs_source_entity_started_idx on public.sync_runs (source, entity, started_at desc);

alter table public.sync_runs enable row level security;
create policy "Miembros activos leen" on public.sync_runs
  for select to authenticated
  using (exists (select 1 from public.app_users u where u.user_id = (select auth.uid()) and u.active));

revoke all on public.sync_runs from anon, authenticated;
grant select on public.sync_runs to authenticated;
grant all on public.sync_runs to service_role;
