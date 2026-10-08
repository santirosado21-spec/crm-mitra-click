-- Mitra Click · Datos demo visibles en la pantalla de Shopify
--
-- Separados del navegador y de los datos reales. Se identifican con prefijo demo- o
-- triggered_by = demo y se eliminan con purge_shopify_demo(). Solo service_role puede
-- sembrarlos o quitarlos, igual que seed_demo()/purge_demo().

create function public.seed_shopify_demo()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_products integer := 0;
  v_orders integer := 0;
  v_customers integer := 0;
begin
  if not exists (select 1 from public.products where source = 'demo') then
    raise exception 'Primero ejecuta seed_demo() para crear el catálogo de prueba';
  end if;

  for r in
    select p.id, row_number() over (order by p.created_at, p.id) as n
    from public.products p
    where p.source = 'demo'
    order by p.created_at, p.id
    limit 8
  loop
    update public.products
    set shopify_product_id = 'demo-product-' || r.n,
        shopify_variant_id = 'demo-variant-' || r.n,
        shopify_inventory_item_id = 'demo-inventory-' || r.n
    where id = r.id;

    insert into public.shopify_inventory_snapshots
      (shopify_inventory_item_id, shopify_location_id, product_id, available, received_at)
    values
      ('demo-inventory-' || r.n, 'demo-location-main', r.id, 3 + r.n * 2, now() - make_interval(mins => (r.n * 7)::integer))
    on conflict (shopify_inventory_item_id, shopify_location_id) do update
      set product_id = excluded.product_id,
          available = excluded.available,
          received_at = excluded.received_at;
    v_products := v_products + 1;
  end loop;

  with numbered as (
    select c.id, row_number() over (order by c.created_at, c.id) as n
    from public.customers c where c.source = 'demo'
  )
  update public.customers c
  set shopify_customer_id = 'demo-customer-' || numbered.n
  from numbered
  where c.id = numbered.id and numbered.n <= 5;
  get diagnostics v_customers = row_count;

  with numbered as (
    select o.id, row_number() over (order by o.created_at, o.id) as n
    from public.sales_orders o
    where o.source = 'demo' and o.channel = 'shopify'
  )
  update public.sales_orders o
  set shopify_order_id = 'demo-order-' || numbered.n,
      shopify_order_name = '#DEMO-' || lpad(numbered.n::text, 4, '0')
  from numbered
  where o.id = numbered.id;
  get diagnostics v_orders = row_count;

  if not exists (select 1 from public.sync_runs where source = 'shopify' and triggered_by = 'demo') then
    insert into public.sync_runs
      (source, entity, status, started_at, finished_at, rows_received, rows_upserted, triggered_by)
    values
      ('shopify', 'product', 'exitoso', now() - interval '4 hours', now() - interval '4 hours' + interval '8 seconds', v_products, v_products, 'demo'),
      ('shopify', 'customer', 'exitoso', now() - interval '3 hours', now() - interval '3 hours' + interval '5 seconds', v_customers, v_customers, 'demo'),
      ('shopify', 'order', 'exitoso', now() - interval '2 hours', now() - interval '2 hours' + interval '6 seconds', v_orders, v_orders, 'demo'),
      ('shopify', 'inventory', 'parcial', now() - interval '1 hour', now() - interval '1 hour' + interval '4 seconds', v_products, greatest(v_products - 1, 0), 'demo');
  end if;

  insert into raw.api_payloads (source, entity, external_id, payload, processed_at)
  values
    ('shopify', 'product', 'demo-product-batch', jsonb_build_object('demo', true, 'registros', v_products), now()),
    ('shopify', 'customer', 'demo-customer-batch', jsonb_build_object('demo', true, 'registros', v_customers), now()),
    ('shopify', 'order', 'demo-order-batch', jsonb_build_object('demo', true, 'registros', v_orders), now())
  on conflict (source, entity, external_id, payload_hash) do nothing;

  return jsonb_build_object(
    'productos', v_products,
    'clientes', v_customers,
    'pedidos', v_orders,
    'corridas', (select count(*) from public.sync_runs where source = 'shopify' and triggered_by = 'demo'));
end;
$$;

create function public.purge_shopify_demo()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_snapshots integer;
  v_runs integer;
  v_raw integer;
begin
  delete from public.shopify_inventory_snapshots
  where shopify_inventory_item_id like 'demo-%';
  get diagnostics v_snapshots = row_count;

  delete from public.sync_runs where source = 'shopify' and triggered_by = 'demo';
  get diagnostics v_runs = row_count;

  delete from raw.api_payloads where source = 'shopify' and external_id like 'demo-%';
  get diagnostics v_raw = row_count;

  update public.products
  set shopify_product_id = null, shopify_variant_id = null, shopify_inventory_item_id = null
  where source = 'demo' and shopify_product_id like 'demo-%';
  update public.customers set shopify_customer_id = null
  where source = 'demo' and shopify_customer_id like 'demo-%';
  update public.sales_orders set shopify_order_id = null, shopify_order_name = null
  where source = 'demo' and shopify_order_id like 'demo-%';

  return jsonb_build_object('inventarios', v_snapshots, 'corridas', v_runs, 'payloads', v_raw);
end;
$$;

comment on function public.seed_shopify_demo() is 'Siembra inventario y corridas demo visibles en Shopify. Requiere seed_demo().';
comment on function public.purge_shopify_demo() is 'Quita únicamente la simulación demo de Shopify.';

revoke all on function public.seed_shopify_demo() from public, anon, authenticated;
revoke all on function public.purge_shopify_demo() from public, anon, authenticated;
grant execute on function public.seed_shopify_demo() to service_role;
grant execute on function public.purge_shopify_demo() to service_role;
