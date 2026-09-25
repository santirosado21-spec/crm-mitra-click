-- MitraClick Intelligence · 2/4 · Usuarios, perfiles de agente, bitácora y RLS
-- Modelo de acceso:
--   · anon: sin acceso a nada.
--   · authenticated: solo lectura, y solo si su usuario está activo en app_users.
--   · service_role (integraciones del lado servidor): escribe los datos comerciales.
-- No se usan claims de user_metadata ni funciones SECURITY DEFINER.

-- ── Usuarios autorizados ────────────────────────────────────────────────────
create table public.app_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  kind text not null default 'humano' check (kind in ('humano', 'cuenta_agentes')),
  role text not null default 'comercial' check (role in ('direccion', 'comercial', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.app_users is 'Lista de acceso. La cuenta de Google compartida de Grok Bot usa kind = cuenta_agentes. Se administra con service_role.';

create trigger set_updated_at before update on public.app_users
  for each row execute function private.set_updated_at();

create table public.agent_profiles (
  id text primary key,
  name text not null,
  description text not null
);
comment on table public.agent_profiles is 'Perfiles de Grok Bot que la cuenta de agentes elige al entrar.';

insert into public.agent_profiles (id, name, description) values
  ('ejecutivo', 'Agente Ejecutivo', 'Venta del día y del mes contra meta, Mitra mayorista y Mitra Click.'),
  ('vendedores', 'Agente de Vendedores', 'Quién vende, quién no y quién tiene que vender más.'),
  ('productos', 'Agente de Productos', 'Material más y menos vendido, agotados con demanda y sin movimiento.');

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  agent_profile text references public.agent_profiles (id),
  action text not null,
  entity text,
  entity_id text,
  details jsonb,
  occurred_at timestamptz not null default now()
);
comment on table public.audit_log is 'Qué hizo cada usuario o perfil de agente. Solo inserción: no se edita ni se borra desde la app.';
create index audit_log_user_id_idx on public.audit_log (user_id);
create index audit_log_agent_profile_idx on public.audit_log (agent_profile);
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.app_users enable row level security;
alter table public.agent_profiles enable row level security;
alter table public.audit_log enable row level security;

-- Cada usuario ve solo su propia fila (lo necesitan las demás políticas).
create policy "Usuario lee su registro" on public.app_users
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Miembros leen perfiles de agente" on public.agent_profiles
  for select to authenticated
  using (exists (select 1 from public.app_users u where u.user_id = (select auth.uid()) and u.active));

create policy "Miembro registra sus acciones" on public.audit_log
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.app_users u where u.user_id = (select auth.uid()) and u.active)
  );

create policy "Miembro lee sus acciones; dirección y admin leen todo" on public.audit_log
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.app_users u
      where u.user_id = (select auth.uid()) and u.active and u.role in ('direccion', 'admin')
    )
  );

-- Datos comerciales: lectura para miembros activos; escritura solo service_role.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sales_reps', 'rep_monthly_quotas', 'business_goals', 'products', 'inventory_levels',
    'clients', 'wholesale_orders', 'wholesale_order_lines', 'retail_orders',
    'retail_order_lines', 'wholesale_quotes', 'ecommerce_traffic_daily'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy "Miembros activos leen" on public.%I for select to authenticated '
      'using (exists (select 1 from public.app_users u where u.user_id = (select auth.uid()) and u.active))',
      table_name
    );
  end loop;
end;
$$;

-- ── Permisos de la Data API ─────────────────────────────────────────────────
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
grant insert on public.audit_log to authenticated;
grant all on all tables in schema public to service_role;
