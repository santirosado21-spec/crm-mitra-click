-- Mitra Click · Sistema operativo · 2 · Usuarios, roles, auditoría y folios
--
-- Modelo de acceso:
--   · anon: nada.
--   · authenticated: solo si su correo CONFIRMADO está dado de alta y activo en app_users.
--   · Lectura: todos los miembros. Escritura: según rol (ver private.secure_table).
--   · service_role: integraciones del lado servidor (Shopify, cargas, agentes).
--
-- La identidad se resuelve con auth.uid() → auth.users (correo confirmado), nunca con
-- claims editables por el usuario. Las funciones SECURITY DEFINER viven en `private`
-- (schema no expuesto en la Data API) y siempre filtran por auth.uid().

create type public.app_role as enum (
  'direccion', 'admin', 'ventas', 'compras', 'almacen', 'logistica', 'finanzas', 'marketing'
);

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email)) and email like '%@%'),
  display_name text not null,
  roles public.app_role[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.app_users is 'Personas autorizadas, por correo. Se pueden dar de alta antes de su primer inicio de sesión.';

create trigger set_updated_at before update on public.app_users
  for each row execute function private.set_updated_at();

-- ── Identidad del usuario en sesión ─────────────────────────────────────────
create function private.current_app_user_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select u.id
  from public.app_users u
  join auth.users a on lower(a.email) = u.email
  where a.id = (select auth.uid()) and a.email_confirmed_at is not null and u.active
  limit 1
$$;

create function private.current_roles()
returns public.app_role[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select u.roles from public.app_users u where u.id = private.current_app_user_id()),
    '{}'::public.app_role[]
  )
$$;

create function private.is_member()
returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.current_app_user_id() is not null $$;

create function private.has_any_role(p_roles public.app_role[])
returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.current_roles() && p_roles $$;

grant usage on schema private to authenticated;
grant execute on function private.current_app_user_id() to authenticated, service_role;
grant execute on function private.current_roles() to authenticated, service_role;
grant execute on function private.is_member() to authenticated, service_role;
grant execute on function private.has_any_role(public.app_role[]) to authenticated, service_role;

-- Lo que la app necesita saber de quien inició sesión (id, nombre, roles).
create function public.my_profile()
returns table (id uuid, email text, display_name text, roles public.app_role[])
language sql stable security invoker set search_path = ''
as $$
  select u.id, u.email, u.display_name, u.roles
  from public.app_users u
  where u.id = private.current_app_user_id()
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ── Auditoría: antes y después de cada cambio ───────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_by_user uuid references public.app_users (id) on delete set null,
  changed_at timestamptz not null default now()
);
comment on table public.audit_log is 'Bitácora automática de cambios. Solo la escriben los triggers; nadie la edita.';
create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);
create index audit_log_changed_by_user_idx on public.audit_log (changed_by_user);

create function private.audit_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and v_old - 'updated_at' = v_new - 'updated_at' then
    return new;
  end if;
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by, changed_by_user)
  values (tg_table_name, coalesce(v_new ->> 'id', v_old ->> 'id'), tg_op, v_old, v_new, (select auth.uid()), private.current_app_user_id());
  return coalesce(new, old);
end;
$$;

-- ── Folios consecutivos (COT-000001, PED-000001…) ───────────────────────────
create function private.set_folio()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.folio is null or btrim(new.folio) = '' then
    new.folio := tg_argv[0] || '-' || lpad(nextval(tg_argv[1]::regclass)::text, 6, '0');
  end if;
  return new;
end;
$$;

-- ── Seguridad estándar por tabla ────────────────────────────────────────────
-- Lectura: miembros. Alta y cambio: roles indicados. Baja: solo si p_allow_delete.
-- También instala updated_at (si la columna existe) y la auditoría.
create function private.secure_table(p_table text, p_write_roles public.app_role[], p_allow_delete boolean default false, p_audit boolean default true)
returns void
language plpgsql set search_path = ''
as $$
declare
  v_roles text := quote_literal(p_write_roles::text) || '::public.app_role[]';
begin
  execute format('alter table public.%I enable row level security', p_table);
  execute format('revoke all on public.%I from anon, authenticated', p_table);
  execute format('grant select, insert, update, delete on public.%I to authenticated', p_table);
  execute format('grant all on public.%I to service_role', p_table);

  execute format('create policy "Miembros leen" on public.%I for select to authenticated using ((select private.is_member()))', p_table);
  execute format('create policy "Rol autorizado crea" on public.%I for insert to authenticated with check ((select private.has_any_role(%s)))', p_table, v_roles);
  execute format('create policy "Rol autorizado modifica" on public.%I for update to authenticated using ((select private.has_any_role(%s))) with check ((select private.has_any_role(%s)))', p_table, v_roles, v_roles);
  if p_allow_delete then
    execute format('create policy "Rol autorizado borra" on public.%I for delete to authenticated using ((select private.has_any_role(%s)))', p_table, v_roles);
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = p_table and column_name = 'updated_at') then
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', p_table);
  end if;
  if p_audit then
    execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function private.audit_row()', p_table);
  end if;
end;
$$;

-- ── Políticas de las tablas de acceso ───────────────────────────────────────
alter table public.app_users enable row level security;
revoke all on public.app_users from anon, authenticated;
grant select, insert, update on public.app_users to authenticated;
grant all on public.app_users to service_role;

create policy "Miembros leen usuarios" on public.app_users
  for select to authenticated using ((select private.is_member()));
create policy "Dirección y admin dan de alta" on public.app_users
  for insert to authenticated with check ((select private.has_any_role('{direccion,admin}'::public.app_role[])));
create policy "Dirección y admin modifican" on public.app_users
  for update to authenticated
  using ((select private.has_any_role('{direccion,admin}'::public.app_role[])))
  with check ((select private.has_any_role('{direccion,admin}'::public.app_role[])));

create trigger audit_row after insert or update or delete on public.app_users
  for each row execute function private.audit_row();

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
create policy "Dirección y admin leen la bitácora" on public.audit_log
  for select to authenticated using ((select private.has_any_role('{direccion,admin}'::public.app_role[])));

create policy "Miembros leen" on public.sync_runs
  for select to authenticated using ((select private.is_member()));

revoke all on all functions in schema private from public, anon;
