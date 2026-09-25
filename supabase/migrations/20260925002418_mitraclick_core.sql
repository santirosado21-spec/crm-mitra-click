-- MitraClick Intelligence · 1/4 · Modelo comercial normalizado
-- Espejo de `CommercialData` (src/mitraclick/domain.ts). Cada tabla alimentada por
-- una API lleva (source, external_id) único: la carga es un upsert idempotente.
-- Fechas de negocio en `date` (día calendario de Ciudad de México); dinero en numeric.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ── Tipos ────────────────────────────────────────────────────────────────────
create type public.business_unit as enum ('mitra', 'mitraclick');
create type public.data_source as enum ('erp', 'shopify', 'ga4', 'manual', 'demo');
create type public.wholesale_order_status as enum ('pendiente', 'surtido', 'cancelado');
create type public.retail_order_status as enum ('pendiente', 'enviado', 'entregado', 'cancelado');
create type public.quote_status as enum ('enviada', 'negociacion', 'ganada', 'perdida');

-- ── updated_at automático ───────────────────────────────────────────────────
create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Vendedores y metas ──────────────────────────────────────────────────────
create table public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  source public.data_source not null default 'erp',
  external_id text not null,
  name text not null,
  zone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
comment on table public.sales_reps is 'Vendedores de Mitra mayorista (ERP).';

create table public.rep_monthly_quotas (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.sales_reps (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  amount numeric(14, 2) not null check (amount >= 0),
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rep_id, month)
);
comment on table public.rep_monthly_quotas is 'Cuota mensual por vendedor. month = primer día del mes.';

create table public.business_goals (
  id uuid primary key default gen_random_uuid(),
  month date not null check (extract(day from month) = 1),
  business_unit public.business_unit not null,
  amount numeric(14, 2) not null check (amount >= 0),
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, business_unit)
);
comment on table public.business_goals is 'Meta mensual por unidad de negocio.';

-- ── Productos e inventario ──────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  source public.data_source not null default 'erp',
  external_id text not null,
  sku text not null,
  name text not null,
  brand text,
  category text,
  business_unit public.business_unit not null,
  unit text not null default 'pieza',
  list_price numeric(14, 2) not null default 0 check (list_price >= 0),
  reorder_point numeric(14, 3) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
create index products_business_unit_idx on public.products (business_unit);
create index products_sku_idx on public.products (sku);

create table public.inventory_levels (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse text not null default 'principal',
  quantity numeric(14, 3) not null default 0,
  as_of timestamptz not null default now(),
  source public.data_source not null default 'erp',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, warehouse)
);
comment on table public.inventory_levels is 'Existencia por producto y bodega. La app suma todas las bodegas.';

-- ── Clientes mayoristas ─────────────────────────────────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  source public.data_source not null default 'erp',
  external_id text not null,
  name text not null,
  client_type text,
  rep_id uuid references public.sales_reps (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
comment on table public.clients is 'Clientes mayoristas. Solo nombre comercial: sin datos personales.';
create index clients_rep_id_idx on public.clients (rep_id);

-- ── Pedidos mayoristas (ERP) ────────────────────────────────────────────────
create table public.wholesale_orders (
  id uuid primary key default gen_random_uuid(),
  source public.data_source not null default 'erp',
  external_id text not null,
  order_date date not null,
  client_id uuid references public.clients (id) on delete set null,
  rep_id uuid references public.sales_reps (id) on delete set null,
  amount numeric(14, 2) not null,
  status public.wholesale_order_status not null default 'surtido',
  currency text not null default 'MXN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
comment on column public.wholesale_orders.external_id is 'Folio del pedido en el ERP.';
create index wholesale_orders_order_date_idx on public.wholesale_orders (order_date);
create index wholesale_orders_rep_date_idx on public.wholesale_orders (rep_id, order_date);
create index wholesale_orders_client_id_idx on public.wholesale_orders (client_id);

create table public.wholesale_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.wholesale_orders (id) on delete cascade,
  line_number integer not null,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(14, 3) not null,
  unit_price numeric(14, 4) not null,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, line_number)
);
create index wholesale_order_lines_product_id_idx on public.wholesale_order_lines (product_id);

-- ── Órdenes Mitra Click (Shopify) ───────────────────────────────────────────
create table public.retail_orders (
  id uuid primary key default gen_random_uuid(),
  source public.data_source not null default 'shopify',
  external_id text not null,
  order_date date not null,
  channel text,
  amount numeric(14, 2) not null,
  status public.retail_order_status not null default 'pendiente',
  currency text not null default 'MXN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
comment on column public.retail_orders.channel is 'Canal de origen normalizado: Google, Redes sociales, Directo, Email, Referido.';
create index retail_orders_order_date_idx on public.retail_orders (order_date);

create table public.retail_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.retail_orders (id) on delete cascade,
  line_number integer not null,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(14, 3) not null,
  unit_price numeric(14, 4) not null,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, line_number)
);
create index retail_order_lines_product_id_idx on public.retail_order_lines (product_id);

-- ── Cotizaciones mayoristas ─────────────────────────────────────────────────
create table public.wholesale_quotes (
  id uuid primary key default gen_random_uuid(),
  source public.data_source not null default 'erp',
  external_id text not null,
  quote_date date not null,
  client_id uuid references public.clients (id) on delete set null,
  rep_id uuid references public.sales_reps (id) on delete set null,
  amount numeric(14, 2) not null,
  status public.quote_status not null default 'enviada',
  closed_date date check (closed_date is null or closed_date >= quote_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
create index wholesale_quotes_quote_date_idx on public.wholesale_quotes (quote_date);
create index wholesale_quotes_rep_id_idx on public.wholesale_quotes (rep_id);
create index wholesale_quotes_client_id_idx on public.wholesale_quotes (client_id);

-- ── Tráfico e-commerce (GA4) ────────────────────────────────────────────────
create table public.ecommerce_traffic_daily (
  id uuid primary key default gen_random_uuid(),
  source public.data_source not null default 'ga4',
  day date not null,
  visits integer not null default 0 check (visits >= 0),
  product_views integer not null default 0 check (product_views >= 0),
  carts integer not null default 0 check (carts >= 0),
  checkouts integer not null default 0 check (checkouts >= 0),
  orders integer not null default 0 check (orders >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, day)
);

-- ── Triggers de updated_at ──────────────────────────────────────────────────
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sales_reps', 'rep_monthly_quotas', 'business_goals', 'products', 'inventory_levels',
    'clients', 'wholesale_orders', 'wholesale_order_lines', 'retail_orders',
    'retail_order_lines', 'wholesale_quotes', 'ecommerce_traffic_daily'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;
