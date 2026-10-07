-- Mitra Click · Sistema operativo · 3 · Modelo operativo
-- Un solo negocio (Mitra Click) con dos canales de venta: Shopify y venta directa.
-- Cadena de documentos: Cotización → Pedido → Compra → Recepción → Salida → Envío →
-- Remisión → Factura → Pago. Cada documento guarda el enlace al anterior.
-- Dinero: numeric(14,2). Cantidades: numeric(14,3). Fechas de negocio: date (CDMX).
-- `source` = de dónde nació el registro (manual, shopify, demo…): los datos de prueba
-- se siembran con source = 'demo' y se pueden borrar sin tocar lo real.

-- ═══ Maestros ═══════════════════════════════════════════════════════════════
create table public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid unique references public.app_users (id) on delete set null,
  name text not null,
  email text,
  phone text,
  active boolean not null default true,
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  name text not null,
  kind text not null default 'empresa' check (kind in ('empresa', 'persona')),
  contact_name text,
  email text,
  phone text,
  rfc text,
  billing_address text,
  shipping_address text,
  city text,
  state text,
  rep_id uuid references public.sales_reps (id) on delete set null,
  shopify_customer_id text unique,
  notes text,
  active boolean not null default true,
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_rep_id_idx on public.customers (rep_id);
create index customers_name_idx on public.customers (lower(name));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  name text not null,
  contact_name text,
  email text,
  phone text,
  rfc text,
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  payment_terms text,
  notes text,
  active boolean not null default true,
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ═══ Catálogo ═══════════════════════════════════════════════════════════════
create table public.product_families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_families_name_key on public.product_families (lower(btrim(name)));

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.product_families (id) on delete restrict,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_categories_family_name_key on public.product_categories (family_id, lower(btrim(name)));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  name text not null,
  description text,
  brand text,
  family_id uuid references public.product_families (id) on delete restrict,
  category_id uuid references public.product_categories (id) on delete restrict,
  unit text not null default 'pieza',
  cost numeric(14, 2) check (cost is null or cost >= 0),
  price numeric(14, 2) check (price is null or price >= 0),
  photo_url text,
  barcode text,
  reorder_point numeric(14, 3) not null default 0,
  shopify_product_id text,
  shopify_variant_id text unique,
  shopify_inventory_item_id text,
  active boolean not null default true,
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_sku_key on public.products (upper(btrim(sku)));
create index products_family_id_idx on public.products (family_id);
create index products_category_id_idx on public.products (category_id);
create index products_name_idx on public.products (lower(name));

-- La categoría debe pertenecer a la familia elegida.
create function private.check_product_classification()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.category_id is not null then
    if new.family_id is null then
      select c.family_id into new.family_id from public.product_categories c where c.id = new.category_id;
    elsif not exists (select 1 from public.product_categories c where c.id = new.category_id and c.family_id = new.family_id) then
      raise exception 'La categoría no pertenece a la familia seleccionada';
    end if;
  end if;
  return new;
end;
$$;
create trigger check_classification before insert or update of family_id, category_id on public.products
  for each row execute function private.check_product_classification();

-- Historial legible de reclasificaciones y cambios de precio/costo.
create table public.product_change_log (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  reason text,
  changed_by uuid references public.app_users (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index product_change_log_product_idx on public.product_change_log (product_id, changed_at desc);
create index product_change_log_changed_by_idx on public.product_change_log (changed_by);

create function private.log_product_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := private.current_app_user_id();
  v_reason text := nullif(current_setting('mitra.change_reason', true), '');
begin
  if new.family_id is distinct from old.family_id then
    insert into public.product_change_log (product_id, field, old_value, new_value, reason, changed_by)
    values (new.id, 'familia', (select name from public.product_families where id = old.family_id), (select name from public.product_families where id = new.family_id), v_reason, v_user);
  end if;
  if new.category_id is distinct from old.category_id then
    insert into public.product_change_log (product_id, field, old_value, new_value, reason, changed_by)
    values (new.id, 'categoria', (select name from public.product_categories where id = old.category_id), (select name from public.product_categories where id = new.category_id), v_reason, v_user);
  end if;
  if new.price is distinct from old.price then
    insert into public.product_change_log (product_id, field, old_value, new_value, reason, changed_by) values (new.id, 'precio', old.price::text, new.price::text, v_reason, v_user);
  end if;
  if new.cost is distinct from old.cost then
    insert into public.product_change_log (product_id, field, old_value, new_value, reason, changed_by) values (new.id, 'costo', old.cost::text, new.cost::text, v_reason, v_user);
  end if;
  if new.active is distinct from old.active then
    insert into public.product_change_log (product_id, field, old_value, new_value, reason, changed_by) values (new.id, 'activo', old.active::text, new.active::text, v_reason, v_user);
  end if;
  return new;
end;
$$;
create trigger log_changes after update on public.products
  for each row execute function private.log_product_changes();

-- ═══ Bodega ═════════════════════════════════════════════════════════════════
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  code text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, code)
);

-- Etiqueta física (NFC o QR). Solo guarda un código aleatorio: sin datos ni credenciales.
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_'),
  product_id uuid references public.products (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((product_id is not null) or (location_id is not null))
);
create index tags_product_id_idx on public.tags (product_id);
create index tags_location_id_idx on public.tags (location_id);

-- Libro de movimientos: única fuente de verdad del inventario. No se edita ni se borra.
create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  movement_type text not null check (movement_type in ('entrada', 'salida', 'ajuste', 'traspaso_entrada', 'traspaso_salida')),
  quantity_delta numeric(14, 3) not null check (quantity_delta <> 0),
  reference_type text not null default 'manual' check (reference_type in ('manual', 'pedido', 'compra', 'recepcion', 'envio', 'remision', 'conteo', 'incidencia', 'shopify', 'carga_inicial')),
  reference_id uuid,
  reason text,
  transfer_group uuid,
  performed_by uuid references public.app_users (id) on delete set null,
  performed_at timestamptz not null default now(),
  source public.data_source not null default 'manual',
  check (
    (movement_type in ('entrada', 'traspaso_entrada') and quantity_delta > 0)
    or (movement_type in ('salida', 'traspaso_salida') and quantity_delta < 0)
    or movement_type = 'ajuste'
  ),
  check (movement_type <> 'ajuste' or (reason is not null and btrim(reason) <> ''))
);
create index stock_movements_product_idx on public.stock_movements (product_id, performed_at desc);
create index stock_movements_location_idx on public.stock_movements (location_id, performed_at desc);
create index stock_movements_reference_idx on public.stock_movements (reference_type, reference_id);
create index stock_movements_performed_by_idx on public.stock_movements (performed_by);

-- Existencia por producto y ubicación: se deriva del libro (la mantiene un trigger).
create table public.stock_levels (
  product_id uuid not null references public.products (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  quantity numeric(14, 3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, location_id)
);
create index stock_levels_location_idx on public.stock_levels (location_id);

create function private.apply_stock_movement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.stock_levels as s (product_id, location_id, quantity, updated_at)
  values (new.product_id, new.location_id, new.quantity_delta, now())
  on conflict (product_id, location_id) do update
    set quantity = s.quantity + excluded.quantity, updated_at = now();
  return new;
end;
$$;
create trigger apply_movement after insert on public.stock_movements
  for each row execute function private.apply_stock_movement();

create function private.forbid_change()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'Los registros de % no se pueden modificar ni borrar; registra un movimiento de corrección', tg_table_name;
end;
$$;
create trigger no_update_delete before update or delete on public.stock_movements
  for each row execute function private.forbid_change();

-- Conteo físico: registra la diferencia, nunca sobrescribe la existencia.
create table public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  system_quantity numeric(14, 3) not null,
  counted_quantity numeric(14, 3) not null check (counted_quantity >= 0),
  difference numeric(14, 3) generated always as (counted_quantity - system_quantity) stored,
  status text not null default 'pendiente' check (status in ('sin_diferencia', 'pendiente', 'ajustado', 'descartado')),
  notes text,
  counted_by uuid references public.app_users (id) on delete set null,
  counted_at timestamptz not null default now(),
  resolved_by uuid references public.app_users (id) on delete set null,
  resolved_at timestamptz,
  resolution_reason text,
  adjustment_movement_id bigint references public.stock_movements (id) on delete restrict,
  source public.data_source not null default 'manual',
  check (status not in ('ajustado', 'descartado') or (resolution_reason is not null and btrim(resolution_reason) <> ''))
);
create index stock_counts_product_idx on public.stock_counts (product_id, counted_at desc);
create index stock_counts_location_idx on public.stock_counts (location_id);
create index stock_counts_status_idx on public.stock_counts (status) where status = 'pendiente';
create index stock_counts_counted_by_idx on public.stock_counts (counted_by);
create index stock_counts_resolved_by_idx on public.stock_counts (resolved_by);
create index stock_counts_adjustment_idx on public.stock_counts (adjustment_movement_id);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  product_id uuid references public.products (id) on delete restrict,
  location_id uuid references public.locations (id) on delete restrict,
  kind text not null check (kind in ('dañado', 'faltante', 'sobrante', 'ubicacion_incorrecta', 'etiqueta', 'otro')),
  description text not null,
  quantity numeric(14, 3),
  status text not null default 'abierta' check (status in ('abierta', 'resuelta')),
  reported_by uuid references public.app_users (id) on delete set null,
  reported_at timestamptz not null default now(),
  resolved_by uuid references public.app_users (id) on delete set null,
  resolved_at timestamptz,
  resolution text,
  source public.data_source not null default 'manual',
  updated_at timestamptz not null default now()
);
create index incidents_product_idx on public.incidents (product_id);
create index incidents_location_idx on public.incidents (location_id);
create index incidents_reported_by_idx on public.incidents (reported_by);
create index incidents_resolved_by_idx on public.incidents (resolved_by);

-- ═══ Documentos del ciclo comercial ═════════════════════════════════════════
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  rep_id uuid references public.sales_reps (id) on delete set null,
  status text not null default 'borrador' check (status in ('borrador', 'enviada', 'negociacion', 'ganada', 'perdida', 'vencida')),
  issued_on date not null default current_date,
  valid_until date,
  subtotal numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  last_follow_up_at timestamptz,
  lost_reason text,
  notes text,
  source public.data_source not null default 'manual',
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_customer_idx on public.quotes (customer_id);
create index quotes_rep_idx on public.quotes (rep_id);
create index quotes_status_idx on public.quotes (status, issued_on);
create index quotes_created_by_idx on public.quotes (created_by);

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  line_number integer not null,
  product_id uuid references public.products (id) on delete restrict,
  description text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 4) not null check (unit_price >= 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  amount numeric(14, 2) not null,
  unique (quote_id, line_number)
);
create index quote_lines_product_idx on public.quote_lines (product_id);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  channel text not null default 'directo' check (channel in ('directo', 'shopify')),
  quote_id uuid references public.quotes (id) on delete set null,
  customer_id uuid references public.customers (id) on delete restrict,
  rep_id uuid references public.sales_reps (id) on delete set null,
  status text not null default 'nuevo' check (status in ('nuevo', 'confirmado', 'en_compra', 'en_surtido', 'enviado', 'entregado', 'cancelado')),
  payment_status text not null default 'pendiente' check (payment_status in ('pendiente', 'parcial', 'pagado', 'reembolsado')),
  ordered_on date not null default current_date,
  promised_on date,
  subtotal numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  shipping numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  shopify_order_id text unique,
  shopify_order_name text,
  traffic_source text,
  shipping_address text,
  notes text,
  source public.data_source not null default 'manual',
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sales_orders_customer_idx on public.sales_orders (customer_id);
create index sales_orders_rep_idx on public.sales_orders (rep_id);
create index sales_orders_quote_idx on public.sales_orders (quote_id);
create index sales_orders_status_idx on public.sales_orders (status, ordered_on);
create index sales_orders_ordered_on_idx on public.sales_orders (ordered_on);
create index sales_orders_created_by_idx on public.sales_orders (created_by);

create table public.sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders (id) on delete cascade,
  line_number integer not null,
  product_id uuid references public.products (id) on delete restrict,
  description text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 4) not null check (unit_price >= 0),
  unit_cost numeric(14, 4),
  amount numeric(14, 2) not null,
  quantity_fulfilled numeric(14, 3) not null default 0 check (quantity_fulfilled >= 0),
  unique (order_id, line_number)
);
create index sales_order_lines_product_idx on public.sales_order_lines (product_id);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  sales_order_id uuid references public.sales_orders (id) on delete set null,
  status text not null default 'borrador' check (status in ('borrador', 'enviada', 'parcial', 'recibida', 'cancelada')),
  ordered_on date not null default current_date,
  expected_on date,
  subtotal numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  notes text,
  source public.data_source not null default 'manual',
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchase_orders_supplier_idx on public.purchase_orders (supplier_id);
create index purchase_orders_sales_order_idx on public.purchase_orders (sales_order_id);
create index purchase_orders_status_idx on public.purchase_orders (status, ordered_on);
create index purchase_orders_created_by_idx on public.purchase_orders (created_by);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  line_number integer not null,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost numeric(14, 4) not null check (unit_cost >= 0),
  amount numeric(14, 2) not null,
  quantity_received numeric(14, 3) not null default 0 check (quantity_received >= 0),
  unique (purchase_order_id, line_number)
);
create index purchase_order_lines_product_idx on public.purchase_order_lines (product_id);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  purchase_order_id uuid references public.purchase_orders (id) on delete restrict,
  received_on date not null default current_date,
  received_by uuid references public.app_users (id) on delete set null,
  notes text,
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index receipts_purchase_order_idx on public.receipts (purchase_order_id);
create index receipts_received_by_idx on public.receipts (received_by);

create table public.receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  purchase_order_line_id uuid references public.purchase_order_lines (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  movement_id bigint references public.stock_movements (id) on delete restrict
);
create index receipt_lines_receipt_idx on public.receipt_lines (receipt_id);
create index receipt_lines_po_line_idx on public.receipt_lines (purchase_order_line_id);
create index receipt_lines_product_idx on public.receipt_lines (product_id);
create index receipt_lines_location_idx on public.receipt_lines (location_id);
create index receipt_lines_movement_idx on public.receipt_lines (movement_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  sales_order_id uuid not null references public.sales_orders (id) on delete restrict,
  status text not null default 'programado' check (status in ('programado', 'en_ruta', 'entregado', 'incidencia', 'cancelado')),
  carrier text,
  route text,
  driver text,
  tracking_number text,
  scheduled_on date,
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  source public.data_source not null default 'manual',
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shipments_sales_order_idx on public.shipments (sales_order_id);
create index shipments_status_idx on public.shipments (status, scheduled_on);
create index shipments_created_by_idx on public.shipments (created_by);

create table public.shipment_lines (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  sales_order_line_id uuid references public.sales_order_lines (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  location_id uuid references public.locations (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  movement_id bigint references public.stock_movements (id) on delete restrict
);
create index shipment_lines_shipment_idx on public.shipment_lines (shipment_id);
create index shipment_lines_order_line_idx on public.shipment_lines (sales_order_line_id);
create index shipment_lines_product_idx on public.shipment_lines (product_id);
create index shipment_lines_location_idx on public.shipment_lines (location_id);
create index shipment_lines_movement_idx on public.shipment_lines (movement_id);

create table public.remissions (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  shipment_id uuid references public.shipments (id) on delete restrict,
  sales_order_id uuid not null references public.sales_orders (id) on delete restrict,
  status text not null default 'pendiente' check (status in ('pendiente', 'entregada', 'verificada', 'rechazada')),
  delivered_at timestamptz,
  received_by_name text,
  evidence_paths text[] not null default '{}',
  verified_by uuid references public.app_users (id) on delete set null,
  verified_at timestamptz,
  notes text,
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index remissions_shipment_idx on public.remissions (shipment_id);
create index remissions_sales_order_idx on public.remissions (sales_order_id);
create index remissions_status_idx on public.remissions (status);
create index remissions_verified_by_idx on public.remissions (verified_by);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  folio text not null,
  series text,
  sales_order_id uuid references public.sales_orders (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  issued_on date not null default current_date,
  due_on date,
  subtotal numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  total numeric(14, 2) not null,
  status text not null default 'emitida' check (status in ('emitida', 'parcial', 'pagada', 'cancelada')),
  cfdi_uuid text unique,
  notes text,
  source public.data_source not null default 'manual',
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series, folio)
);
create index invoices_sales_order_idx on public.invoices (sales_order_id);
create index invoices_customer_idx on public.invoices (customer_id);
create index invoices_status_idx on public.invoices (status, due_on);
create index invoices_created_by_idx on public.invoices (created_by);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  invoice_id uuid references public.invoices (id) on delete restrict,
  sales_order_id uuid references public.sales_orders (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  paid_on date not null default current_date,
  amount numeric(14, 2) not null check (amount > 0),
  method text check (method in ('transferencia', 'tarjeta', 'efectivo', 'cheque', 'shopify', 'otro')),
  reference text,
  notes text,
  source public.data_source not null default 'manual',
  recorded_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_sales_order_idx on public.payments (sales_order_id);
create index payments_customer_idx on public.payments (customer_id, paid_on);
create index payments_recorded_by_idx on public.payments (recorded_by);

-- ═══ Control: pendientes, alertas, reportes y agentes ═══════════════════════
create table public.issues (
  id bigint generated always as identity primary key,
  rule_code text not null,
  entity_type text not null,
  entity_id uuid,
  title text not null,
  detail text,
  severity text not null default 'media' check (severity in ('baja', 'media', 'alta')),
  status text not null default 'abierto' check (status in ('abierto', 'en_proceso', 'resuelto', 'descartado')),
  assigned_to uuid references public.app_users (id) on delete set null,
  assigned_role public.app_role,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.app_users (id) on delete set null,
  resolution_note text,
  updated_at timestamptz not null default now()
);
comment on table public.issues is 'Bandeja de pendientes: qué falta, dónde, quién es responsable y si quedó resuelto.';
create unique index issues_open_unique on public.issues (rule_code, entity_type, entity_id) where status in ('abierto', 'en_proceso');
create index issues_status_idx on public.issues (status, severity);
create index issues_assigned_to_idx on public.issues (assigned_to);
create index issues_resolved_by_idx on public.issues (resolved_by);

create table public.alerts (
  id bigint generated always as identity primary key,
  alert_code text not null,
  dedupe_key text not null unique,
  title text not null,
  detail text,
  severity text not null default 'media' check (severity in ('baja', 'media', 'alta')),
  payload jsonb,
  status text not null default 'nueva' check (status in ('nueva', 'vista', 'atendida')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index alerts_status_idx on public.alerts (status, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ejecutivo', 'comercial', 'productos', 'operacion', 'inventario')),
  frequency text not null check (frequency in ('semanal', 'quincenal', 'mensual')),
  period_start date not null,
  period_end date not null,
  content jsonb not null,
  narrative text,
  generated_by text not null default 'reglas' check (generated_by in ('reglas', 'ia')),
  generated_at timestamptz not null default now(),
  unique (kind, frequency, period_start)
);

create table public.agent_runs (
  id bigint generated always as identity primary key,
  agent text not null check (agent in ('supervision', 'comercial', 'marketing', 'ejecutivo')),
  mode text not null default 'reglas' check (mode in ('reglas', 'ia')),
  status text not null default 'en_curso' check (status in ('en_curso', 'exitoso', 'fallido')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  input_summary jsonb,
  output jsonb,
  error text
);
create index agent_runs_agent_idx on public.agent_runs (agent, started_at desc);

create table public.agent_findings (
  id bigint generated always as identity primary key,
  run_id bigint not null references public.agent_runs (id) on delete cascade,
  agent text not null,
  title text not null,
  detail text,
  evidence jsonb,
  suggested_action text,
  assigned_role public.app_role,
  status text not null default 'nuevo' check (status in ('nuevo', 'aceptado', 'descartado', 'convertido')),
  issue_id bigint references public.issues (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agent_findings_run_idx on public.agent_findings (run_id);
create index agent_findings_status_idx on public.agent_findings (status, created_at desc);
create index agent_findings_issue_idx on public.agent_findings (issue_id);

-- ═══ Adquisición: links medibles y leads ════════════════════════════════════
create table public.tracked_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/', '-_'),
  label text not null,
  destination_url text not null check (destination_url ~ '^https://'),
  channel text not null check (channel in ('nfc', 'qr', 'linkedin', 'redes', 'email', 'seo', 'otro')),
  campaign text,
  active boolean not null default true,
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tracked_links_created_by_idx on public.tracked_links (created_by);

-- Un escaneo o clic. Sin datos personales: ni IP ni identificadores del dispositivo.
create table public.link_events (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.tracked_links (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  device text check (device in ('movil', 'escritorio', 'otro'))
);
create index link_events_link_idx on public.link_events (link_id, occurred_at desc);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  source text not null default 'otro' check (source in ('shopify', 'linkedin', 'nfc_qr', 'seo', 'redes', 'referido', 'otro')),
  tracked_link_id uuid references public.tracked_links (id) on delete set null,
  status text not null default 'nuevo' check (status in ('nuevo', 'contactado', 'en_conversacion', 'calificado', 'cotizado', 'ganado', 'perdido')),
  rep_id uuid references public.sales_reps (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  last_contact_at timestamptz,
  notes text,
  source_origin public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx on public.leads (status, source);
create index leads_rep_idx on public.leads (rep_id);
create index leads_customer_idx on public.leads (customer_id);
create index leads_tracked_link_idx on public.leads (tracked_link_id);

create table public.lead_activities (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (kind in ('solicitud', 'mensaje', 'respuesta', 'conversacion', 'reunion', 'nota')),
  notes text,
  performed_by uuid references public.app_users (id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, occurred_at desc);
create index lead_activities_performed_by_idx on public.lead_activities (performed_by);

-- ═══ Folios ═════════════════════════════════════════════════════════════════
create sequence private.customer_folio_seq;
create sequence private.supplier_folio_seq;
create sequence private.quote_folio_seq;
create sequence private.sales_order_folio_seq;
create sequence private.purchase_order_folio_seq;
create sequence private.receipt_folio_seq;
create sequence private.shipment_folio_seq;
create sequence private.remission_folio_seq;
create sequence private.payment_folio_seq;
create sequence private.incident_folio_seq;

create trigger set_folio before insert on public.customers for each row execute function private.set_folio('CLI', 'private.customer_folio_seq');
create trigger set_folio before insert on public.suppliers for each row execute function private.set_folio('PRV', 'private.supplier_folio_seq');
create trigger set_folio before insert on public.quotes for each row execute function private.set_folio('COT', 'private.quote_folio_seq');
create trigger set_folio before insert on public.sales_orders for each row execute function private.set_folio('PED', 'private.sales_order_folio_seq');
create trigger set_folio before insert on public.purchase_orders for each row execute function private.set_folio('OC', 'private.purchase_order_folio_seq');
create trigger set_folio before insert on public.receipts for each row execute function private.set_folio('REC', 'private.receipt_folio_seq');
create trigger set_folio before insert on public.shipments for each row execute function private.set_folio('ENV', 'private.shipment_folio_seq');
create trigger set_folio before insert on public.remissions for each row execute function private.set_folio('REM', 'private.remission_folio_seq');
create trigger set_folio before insert on public.payments for each row execute function private.set_folio('PAG', 'private.payment_folio_seq');
create trigger set_folio before insert on public.incidents for each row execute function private.set_folio('INC', 'private.incident_folio_seq');

-- ═══ Seguridad por tabla: quién puede escribir ══════════════════════════════
do $$
begin
  -- Maestros
  perform private.secure_table('sales_reps', '{direccion,admin}');
  perform private.secure_table('customers', '{direccion,admin,ventas,finanzas}');
  perform private.secure_table('suppliers', '{direccion,admin,compras}');
  -- Catálogo
  perform private.secure_table('product_families', '{direccion,admin,compras}');
  perform private.secure_table('product_categories', '{direccion,admin,compras}');
  perform private.secure_table('products', '{direccion,admin,compras}');
  -- Bodega
  perform private.secure_table('warehouses', '{direccion,admin,almacen}');
  perform private.secure_table('locations', '{direccion,admin,almacen}');
  perform private.secure_table('tags', '{direccion,admin,almacen}', true);
  perform private.secure_table('stock_counts', '{direccion,admin,almacen}');
  perform private.secure_table('incidents', '{direccion,admin,almacen,logistica}');
  -- Documentos
  perform private.secure_table('quotes', '{direccion,admin,ventas}');
  perform private.secure_table('quote_lines', '{direccion,admin,ventas}', true);
  perform private.secure_table('sales_orders', '{direccion,admin,ventas}');
  perform private.secure_table('sales_order_lines', '{direccion,admin,ventas}', true);
  perform private.secure_table('purchase_orders', '{direccion,admin,compras}');
  perform private.secure_table('purchase_order_lines', '{direccion,admin,compras}', true);
  perform private.secure_table('receipts', '{direccion,admin,compras,almacen}');
  perform private.secure_table('receipt_lines', '{direccion,admin,compras,almacen}');
  perform private.secure_table('shipments', '{direccion,admin,logistica,almacen}');
  perform private.secure_table('shipment_lines', '{direccion,admin,logistica,almacen}');
  perform private.secure_table('remissions', '{direccion,admin,logistica,finanzas}');
  perform private.secure_table('invoices', '{direccion,admin,finanzas}');
  perform private.secure_table('payments', '{direccion,admin,finanzas}');
  -- Control
  perform private.secure_table('issues', '{direccion,admin,ventas,compras,almacen,logistica,finanzas,marketing}');
  perform private.secure_table('alerts', '{direccion,admin}');
  perform private.secure_table('agent_findings', '{direccion,admin}');
  -- Adquisición
  perform private.secure_table('tracked_links', '{direccion,admin,marketing,ventas}');
  perform private.secure_table('leads', '{direccion,admin,marketing,ventas}');
  perform private.secure_table('lead_activities', '{direccion,admin,marketing,ventas}', false, false);
end;
$$;

-- Tablas de solo lectura para la app (las escribe la base o el servidor).
do $$
declare
  t text;
begin
  foreach t in array array['product_change_log', 'stock_levels', 'reports', 'agent_runs', 'link_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create policy "Miembros leen" on public.%I for select to authenticated using ((select private.is_member()))', t);
  end loop;
end;
$$;

-- Libro de movimientos: se lee libremente y solo se inserta (nunca update/delete).
alter table public.stock_movements enable row level security;
revoke all on public.stock_movements from anon, authenticated;
grant select, insert on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
create policy "Miembros leen" on public.stock_movements
  for select to authenticated using ((select private.is_member()));
create policy "Bodega registra movimientos" on public.stock_movements
  for insert to authenticated
  with check (
    (select private.has_any_role('{direccion,admin,almacen,logistica,compras}'::public.app_role[]))
    and performed_by = (select private.current_app_user_id())
    and (movement_type <> 'ajuste' or (select private.has_any_role('{direccion,admin}'::public.app_role[])))
  );
create trigger audit_row after insert on public.stock_movements
  for each row execute function private.audit_row();

-- Quién lo hizo: se llena solo con el usuario en sesión (el servidor puede dejarlo nulo).
do $$
declare
  c record;
begin
  for c in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public' and data_type = 'uuid'
      and column_name in ('created_by', 'performed_by', 'recorded_by', 'reported_by', 'counted_by', 'received_by')
  loop
    execute format('alter table public.%I alter column %I set default private.current_app_user_id()', c.table_name, c.column_name);
  end loop;
end;
$$;

revoke all on all functions in schema private from public, anon;
grant usage on all sequences in schema private to service_role;
