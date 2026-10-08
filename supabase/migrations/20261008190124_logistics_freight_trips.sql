-- Mitra Click · Cotizaciones de flete y viajes
--
-- Un viaje es planeación logística: no representa una salida de inventario. Los envíos
-- siguen naciendo exclusivamente de ship_order(), que es el único camino que descuenta
-- existencias. Una cotización puede originar un viaje, pero ninguno de los dos mueve stock.

create table public.freight_quotes (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  customer_id uuid references public.customers (id) on delete set null,
  status text not null default 'borrador'
    check (status in ('borrador', 'solicitada', 'cotizada', 'aceptada', 'rechazada', 'vencida')),
  origin text not null,
  destination text not null,
  distance_km numeric(10, 2) check (distance_km is null or distance_km >= 0),
  weight_kg numeric(12, 3) check (weight_kg is null or weight_kg >= 0),
  volume_m3 numeric(12, 3) check (volume_m3 is null or volume_m3 >= 0),
  vehicle_type text,
  carrier text,
  amount numeric(14, 2) check (amount is null or amount >= 0),
  valid_until date,
  notes text,
  source public.data_source not null default 'manual',
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.freight_quotes is 'Cotizaciones de transporte. No reservan ni mueven inventario.';
create index freight_quotes_status_idx on public.freight_quotes (status, created_at desc);
create index freight_quotes_customer_idx on public.freight_quotes (customer_id);

create table public.delivery_trips (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  freight_quote_id uuid references public.freight_quotes (id) on delete set null,
  status text not null default 'programado'
    check (status in ('programado', 'en_ruta', 'completado', 'incidencia', 'cancelado')),
  scheduled_on date not null,
  origin text not null,
  destination text not null,
  vehicle_type text,
  carrier text,
  driver text,
  vehicle_plate text,
  tracking_number text,
  quoted_amount numeric(14, 2) check (quoted_amount is null or quoted_amount >= 0),
  notes text,
  source public.data_source not null default 'manual',
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.delivery_trips is 'Programación de unidades y operadores. No mueve inventario; los envíos lo hacen mediante ship_order().';
create index delivery_trips_status_date_idx on public.delivery_trips (status, scheduled_on);
create index delivery_trips_quote_idx on public.delivery_trips (freight_quote_id);

create sequence private.freight_quote_folio_seq;
create sequence private.delivery_trip_folio_seq;
create trigger set_folio before insert on public.freight_quotes for each row
  execute function private.set_folio('FLE', 'private.freight_quote_folio_seq');
create trigger set_folio before insert on public.delivery_trips for each row
  execute function private.set_folio('VIA', 'private.delivery_trip_folio_seq');

do $$
begin
  perform private.secure_table('freight_quotes', '{direccion,admin,ventas,logistica}');
  perform private.secure_table('delivery_trips', '{direccion,admin,almacen,logistica}');
end;
$$;
