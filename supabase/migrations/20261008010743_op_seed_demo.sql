-- Mitra Click · Sistema operativo · 14 · Sembrador de datos de prueba
-- Datos de prueba para recorrer la app antes de que entren los datos reales. Todo nace
-- con source = 'demo' para poder distinguirlo y quitarlo después con purge_demo().
--
-- Escribe directo en las tablas en vez de pasar por save_order, ship_order y compañía:
-- esas funciones exigen un rol del JWT y el sembrador corre desde el servidor. Su lógica
-- ya está probada aparte; aquí lo que importa son los datos. Las existencias sí pasan
-- por stock_movements, porque el libro sigue siendo el único que mueve inventario.

create or replace function public.seed_demo()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_wh uuid; v_user uuid;
  v_fam_elec uuid; v_fam_sold uuid; v_fam_prot uuid; v_fam_jard uuid; v_fam_aire uuid;
  v_rep1 uuid; v_rep2 uuid; v_rep3 uuid;
  v_sup1 uuid;
  v_cust uuid[]; v_prod uuid[]; v_locs uuid[];
  v_doc uuid; v_po uuid; v_pol uuid; v_rec uuid; v_sh uuid; v_inv uuid; v_list uuid; v_mov bigint;
  v_sub numeric; v_tax numeric; v_ship numeric;
  i integer; j integer; n integer;
  r record;
  v_today date := (now() at time zone 'America/Mexico_City')::date;
begin
  if exists (select 1 from public.products where source = 'demo') then
    return jsonb_build_object('ya_sembrado', true,
      'productos', (select count(*) from public.products where source = 'demo'));
  end if;

  select id into v_user from public.app_users where active order by created_at limit 1;

  -- ── Bodega chica estándar: 3 anaqueles de 8 posiciones por 4 niveles + servicio ──
  insert into public.warehouses (name, address, source)
  values ('Bodega Mitra Click', 'Bodega principal', 'demo') returning id into v_wh;

  for i in 1..3 loop
    for j in 1..8 loop
      insert into public.locations (warehouse_id, code, description, zone, position, level, kind, max_units, source)
      select v_wh, chr(64 + i) || '-' || lpad(j::text, 2, '0') || '-' || k::text,
        'Anaquel ' || chr(64 + i), chr(64 + i), j, k,
        case when k = 1 then 'picking' else 'almacenaje' end,
        -- Solo el anaquel A lleva capacidad capturada: así se ve el tablero con
        -- porcentaje y sin él, que es la situación real al arrancar.
        case when i = 1 then 60 end, 'demo'
      from generate_series(1, 4) k;
    end loop;
  end loop;

  insert into public.locations (warehouse_id, code, description, zone, kind, source) values
    (v_wh, 'RECEPCION', 'Mercancía recibida, antes de acomodar', 'RECEPCION', 'recepcion', 'demo'),
    (v_wh, 'EMBARQUE', 'Pedidos surtidos esperando la moto', 'EMBARQUE', 'embarque', 'demo'),
    (v_wh, 'DEVOLUCIONES', 'Producto devuelto por revisar', 'DEVOLUCIONES', 'devoluciones', 'demo'),
    (v_wh, 'CUARENTENA', 'Producto dañado, fuera de lo vendible', 'CUARENTENA', 'cuarentena', 'demo');

  -- ── Catálogo: nombres y precios del catálogo público de Mitra Click ──────────
  insert into public.product_families (name, description, source) values ('Herramienta eléctrica', 'Taladros, esmeriladoras, sierras', 'demo') returning id into v_fam_elec;
  insert into public.product_families (name, description, source) values ('Soldadura', 'Soldadoras, caretas y consumibles', 'demo') returning id into v_fam_sold;
  insert into public.product_families (name, description, source) values ('Equipo de protección', 'Seguridad personal', 'demo') returning id into v_fam_prot;
  insert into public.product_families (name, description, source) values ('Jardinería', 'Desbrozadoras y podadoras', 'demo') returning id into v_fam_jard;
  insert into public.product_families (name, description, source) values ('Compresores y aire', 'Compresoras e hidrolavadoras', 'demo') returning id into v_fam_aire;

  insert into public.product_categories (family_id, name, source) values
    (v_fam_elec, 'Rotomartillos y taladros', 'demo'), (v_fam_elec, 'Esmeriladoras', 'demo'),
    (v_fam_elec, 'Sierras y cortadoras', 'demo'), (v_fam_elec, 'Sets y juegos', 'demo'),
    (v_fam_sold, 'Soldadoras', 'demo'), (v_fam_sold, 'Caretas y consumibles', 'demo'),
    (v_fam_prot, 'Protección personal', 'demo'),
    (v_fam_jard, 'Desbrozadoras y podadoras', 'demo'),
    (v_fam_aire, 'Compresoras', 'demo'), (v_fam_aire, 'Hidrolavadoras', 'demo');

  insert into public.products (sku, name, brand, family_id, category_id, unit, price, cost, reorder_point, source)
  select d.sku, d.name, d.brand, f.id, c.id, 'pieza', d.price, round(d.price * 0.62, 2), d.reorder, 'demo'
  from (values
    ('MC-1001','Rotomartillo Truper 1/2" 650 W con caja','Truper','Herramienta eléctrica','Rotomartillos y taladros',1006,4),
    ('MC-1002','Esmeriladora angular 650 W 4-1/2" G650','Black+Decker','Herramienta eléctrica','Esmeriladoras',618,6),
    ('MC-1003','Taladro atornillador GSR 1000 kit 11 pzas','Bosch','Herramienta eléctrica','Rotomartillos y taladros',1641,3),
    ('MC-1004','Taladro Matrix kit 6 en 1 multiherramienta 20 V','Black+Decker','Herramienta eléctrica','Sets y juegos',5118,2),
    ('MC-1005','Taladro rotomartillo 20 V con dos baterías DCD778D2','Dewalt','Herramienta eléctrica','Rotomartillos y taladros',4948,2),
    ('MC-1006','Rotomartillo taladro 1/2" 500 W 3200 rpm M0801G','Makita','Herramienta eléctrica','Rotomartillos y taladros',1112,5),
    ('MC-1007','Rotomartillo inalámbrico 18 V 260722CT','Milwaukee','Herramienta eléctrica','Rotomartillos y taladros',4274,2),
    ('MC-1008','Sierra inglete 10" telescópica con guía láser HXMS15L','Hyumax','Herramienta eléctrica','Sierras y cortadoras',4043,1),
    ('MC-1009','Cortadora de metales 14" 2000 W 2414NB','Makita','Herramienta eléctrica','Sierras y cortadoras',3983,1),
    ('MC-1010','Combo rotomartillo y esmeriladora MTK0003BX4','Makita','Herramienta eléctrica','Sets y juegos',2329,3),
    ('MC-1011','Set de brocas y puntas X-Line 34 pzas','Bosch','Herramienta eléctrica','Sets y juegos',228,12),
    ('MC-2001','Soldadora inversora 130 A 110/220 V HKS140','Husky Power','Soldadura','Soldadoras',1662,3),
    ('MC-2002','Soldadora inversora 130 A con escuadras HKS-140','Husky Power','Soldadura','Soldadoras',1496,3),
    ('MC-2003','Careta para soldar electrónica ajustable HKC35','Husky Power','Soldadura','Caretas y consumibles',271,10),
    ('MC-3001','Guantes de carnaza reforzados talla G','Truper','Equipo de protección','Protección personal',89,30),
    ('MC-3002','Lentes de seguridad antiempañantes','Truper','Equipo de protección','Protección personal',65,40),
    ('MC-3003','Casco de seguridad con ajuste de matraca','Truper','Equipo de protección','Protección personal',185,20),
    ('MC-4001','Desmalezadora podadora eléctrica GL300-B3','Black+Decker','Jardinería','Desbrozadoras y podadoras',778,4),
    ('MC-4002','Desbrozadora podadora 52 cc ST520D','Stallion','Jardinería','Desbrozadoras y podadoras',1846,2),
    ('MC-5001','Hidrolavadora de alta presión 1200 W BW13-B3','Black+Decker','Compresores y aire','Hidrolavadoras',2058,3),
    ('MC-5002','Compresor silencioso libre de aceite 2 HP 50 L','Goni','Compresores y aire','Compresoras',8449,1),
    ('MC-5003','Compresor de banda 120 V 5.0 HP 190 L','Goni','Compresores y aire','Compresoras',17255,1)
  ) as d(sku, name, brand, familia, categoria, price, reorder)
  join public.product_families f on f.name = d.familia and f.source = 'demo'
  join public.product_categories c on c.name = d.categoria and c.family_id = f.id;

  -- Uno sin costo y otro sin familia: así la pantalla de pendientes tiene qué detectar.
  update public.products set cost = null where sku = 'MC-1011';
  insert into public.products (sku, name, brand, unit, price, reorder_point, source)
  values ('MC-9001', 'Juego de dados 1/2" 24 pzas', 'Urrea', 'pieza', 740, 3, 'demo');

  -- ── Gente y empresas, todas ficticias ───────────────────────────────────────
  insert into public.sales_reps (name, email, phone, source) values ('Ana Beltrán', 'ana@ejemplo.mx', '55 1000 0001', 'demo') returning id into v_rep1;
  insert into public.sales_reps (name, email, phone, source) values ('Diego Nava', 'diego@ejemplo.mx', '55 1000 0002', 'demo') returning id into v_rep2;
  insert into public.sales_reps (name, email, phone, source) values ('Paola Ruiz', 'paola@ejemplo.mx', '55 1000 0003', 'demo') returning id into v_rep3;

  insert into public.suppliers (name, contact_name, email, lead_time_days, payment_terms, source)
  values ('Distribuidora Ferretera del Centro', 'Mario Lira', 'ventas@ejemplo.mx', 5, '30 días', 'demo') returning id into v_sup1;
  insert into public.suppliers (name, contact_name, email, lead_time_days, payment_terms, source)
  values ('Importaciones Técnicas Nava', 'Lucía Nava', 'compras@ejemplo.mx', 12, 'Contado', 'demo');

  insert into public.customers (name, kind, contact_name, email, phone, rfc, city, state, shipping_address, rep_id, source)
  select d.name, d.kind, d.contacto, d.email, d.tel, d.rfc, d.ciudad, 'CDMX', d.dir,
    (array[v_rep1, v_rep2, v_rep3])[1 + (d.n % 3)], 'demo'
  from (values
    (0,'Ferretería La Pirinola','empresa','Rosa Méndez','rosa@ejemplo.mx','55 2000 0001','FPI940210AB1','Iztapalapa','Av. Ermita 1204'),
    (1,'Taller Mecánico Nava','empresa','Hugo Nava','hugo@ejemplo.mx','55 2000 0002','TMN880512CD2','Azcapotzalco','Calle Norte 45 int 3'),
    (2,'Construcciones Vértice','empresa','Elena Soto','elena@ejemplo.mx','55 2000 0003','CVE010920EF3','Benito Juárez','Eje 5 Sur 880'),
    (3,'Herrería El Yunque','empresa','Marco Díaz','marco@ejemplo.mx','55 2000 0004',null,'Gustavo A. Madero','Av. Centenario 77'),
    (4,'Mantenimiento Integral Robles','empresa','Sofía Robles','sofia@ejemplo.mx','55 2000 0005','MIR150304GH4','Coyoacán','Calz. Tlalpan 2301'),
    (5,'Jardines y Paisaje Lomas','empresa','Iván Lomas','ivan@ejemplo.mx','55 2000 0006','JPL170811IJ5','Álvaro Obregón','Av. Toluca 410'),
    (6,'Luis Carrillo','persona','Luis Carrillo','luis@ejemplo.mx','55 2000 0007',null,'Cuauhtémoc','Dr. Vértiz 180 depto 5'),
    (7,'Karla Medina','persona','Karla Medina','karla@ejemplo.mx','55 2000 0008',null,'Miguel Hidalgo','Lago Alberto 320')
  ) as d(n, name, kind, contacto, email, tel, rfc, ciudad, dir);

  select array_agg(id order by name) into v_cust from public.customers where source = 'demo';
  select array_agg(id order by sku) into v_prod from public.products where source = 'demo' and family_id is not null;
  select array_agg(id order by pick_order) into v_locs from public.locations where source = 'demo' and kind = 'picking';

  -- ── Existencias iniciales ───────────────────────────────────────────────────
  i := 0;
  for r in select id, reorder_point from public.products where source = 'demo' and family_id is not null order by sku loop
    insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reason, performed_by, source)
    values (r.id, v_locs[1 + (i % array_length(v_locs, 1))], 'entrada',
      -- Dos productos quedan por debajo de su punto de reorden, para que avise el tablero.
      case when i in (3, 7) then greatest(1, r.reorder_point - 1) else r.reorder_point * 4 + (i % 7) end,
      'carga_inicial', 'Carga inicial de bodega', v_user, 'demo');
    i := i + 1;
  end loop;

  -- Respaldo en niveles altos, para que la vista de elevación tenga qué mostrar.
  insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reason, performed_by, source)
  select p.id, l.id, 'entrada', 12, 'carga_inicial', 'Respaldo en nivel alto', v_user, 'demo'
  from (select id, row_number() over (order by sku) as n from public.products where source = 'demo' and family_id is not null limit 6) p
  join (select id, row_number() over (order by pick_order) as n from public.locations where source = 'demo' and level = 2 limit 6) l on l.n = p.n;

  -- ── Cotizaciones ────────────────────────────────────────────────────────────
  for i in 1..6 loop
    insert into public.quotes (customer_id, rep_id, status, issued_on, valid_until, last_follow_up_at, source)
    values (v_cust[1 + (i % array_length(v_cust, 1))], (array[v_rep1, v_rep2, v_rep3])[1 + (i % 3)],
      (array['enviada','negociacion','ganada','perdida','enviada','negociacion'])[i],
      v_today - (i * 4), v_today + 15,
      -- Dos sin seguimiento desde hace rato: la regla de calidad debe detectarlas.
      case when i <= 2 then now() - interval '9 days' else now() - interval '1 day' end, 'demo')
    returning id into v_doc;

    for n in 1..2 loop
      insert into public.quote_lines (quote_id, line_number, product_id, description, quantity, unit_price, discount_pct, amount)
      select v_doc, n, p.id, p.name, n + 1, p.price, 0, (n + 1) * p.price
      from public.products p where p.id = v_prod[1 + ((i * 3 + n) % array_length(v_prod, 1))];
    end loop;

    select coalesce(sum(amount), 0) into v_sub from public.quote_lines where quote_id = v_doc;
    update public.quotes set subtotal = v_sub, tax = round(v_sub * 0.16, 2), total = v_sub + round(v_sub * 0.16, 2) where id = v_doc;
  end loop;

  -- ── Pedidos en varios estados ───────────────────────────────────────────────
  for i in 1..9 loop
    v_ship := case when i % 3 = 0 then 0 else 120 end;
    insert into public.sales_orders (channel, customer_id, rep_id, status, payment_status, ordered_on, promised_on, shipping, shipping_address, traffic_source, source)
    values (case when i % 3 = 0 then 'shopify' else 'directo' end,
      v_cust[1 + (i % array_length(v_cust, 1))], (array[v_rep1, v_rep2, v_rep3])[1 + (i % 3)],
      (array['nuevo','confirmado','confirmado','en_surtido','enviado','entregado','entregado','confirmado','cancelado'])[i],
      (array['pendiente','pendiente','pendiente','pendiente','pendiente','pagado','pagado','parcial','pendiente'])[i],
      v_today - (i * 2),
      -- Dos atrasados contra su fecha prometida.
      case when i in (2, 4) then v_today - 2 else v_today + (i % 4) end,
      v_ship,
      (select shipping_address from public.customers where id = v_cust[1 + (i % array_length(v_cust, 1))]),
      case when i % 3 = 0 then 'google / cpc' end, 'demo')
    returning id into v_doc;

    for n in 1..2 loop
      insert into public.sales_order_lines (order_id, line_number, product_id, description, quantity, unit_price, unit_cost, amount)
      select v_doc, n, p.id, p.name, n + 1, p.price, p.cost, (n + 1) * p.price
      from public.products p where p.id = v_prod[1 + ((i * 2 + n) % array_length(v_prod, 1))];
    end loop;

    select coalesce(sum(amount), 0) into v_sub from public.sales_order_lines where order_id = v_doc;
    v_tax := round(v_sub * 0.16, 2);
    update public.sales_orders set subtotal = v_sub, tax = v_tax, total = v_sub + v_tax + v_ship where id = v_doc;

    -- Los enviados y entregados ya salieron de bodega: su salida va al libro.
    if i in (5, 6, 7) then
      for r in select sol.id, sol.product_id, sol.quantity, sl.location_id
               from public.sales_order_lines sol
               join public.stock_levels sl on sl.product_id = sol.product_id and sl.quantity >= sol.quantity
               where sol.order_id = v_doc loop
        insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reference_id, reason, performed_by, source)
        values (r.product_id, r.location_id, 'salida', -r.quantity, 'envio', v_doc, 'Salida por envío', v_user, 'demo');
        update public.sales_order_lines set quantity_fulfilled = quantity where id = r.id;
      end loop;

      insert into public.shipments (sales_order_id, status, carrier, route, driver, scheduled_on, shipped_at, delivered_at, source)
      values (v_doc, case when i = 5 then 'en_ruta' else 'entregado' end, 'Moto 1', 'Centro', 'Repartidor demo',
        v_today, now() - interval '5 hours', case when i = 5 then null else now() - interval '2 hours' end, 'demo')
      returning id into v_sh;

      insert into public.remissions (shipment_id, sales_order_id, status, delivered_at, received_by_name, evidence_paths, source)
      values (v_sh, v_doc, case when i = 5 then 'pendiente' when i = 6 then 'entregada' else 'verificada' end,
        case when i = 5 then null else now() - interval '2 hours' end,
        case when i = 5 then null else 'Quien recibió (demo)' end,
        case when i = 7 then array['demo/evidencia.jpg'] else '{}' end, 'demo');
    end if;

    -- Factura y cobro de los entregados.
    if i in (6, 7) then
      insert into public.invoices (folio, series, sales_order_id, customer_id, issued_on, due_on, subtotal, tax, total, status, source)
      values ('100' || i, 'A', v_doc, v_cust[1 + (i % array_length(v_cust, 1))], v_today - 1,
        case when i = 6 then v_today - 1 else v_today + 20 end,
        v_sub + v_ship, v_tax, v_sub + v_tax + v_ship,
        case when i = 6 then 'pagada' else 'emitida' end, 'demo')
      returning id into v_inv;

      if i = 6 then
        insert into public.payments (invoice_id, sales_order_id, customer_id, paid_on, amount, method, reference, source)
        values (v_inv, v_doc, v_cust[1 + (i % array_length(v_cust, 1))], v_today, v_sub + v_tax + v_ship, 'transferencia', 'SPEI demo', 'demo');
      end if;
    end if;
  end loop;

  -- ── Una compra con su recepción parcial ─────────────────────────────────────
  insert into public.purchase_orders (supplier_id, status, ordered_on, expected_on, source)
  values (v_sup1, 'parcial', v_today - 10, v_today - 2, 'demo') returning id into v_po;

  for n in 1..3 loop
    insert into public.purchase_order_lines (purchase_order_id, line_number, product_id, quantity, unit_cost, amount, quantity_received)
    select v_po, n, p.id, 20, coalesce(p.cost, 100), 20 * coalesce(p.cost, 100), case when n = 1 then 20 else 0 end
    from public.products p where p.id = v_prod[n];
  end loop;

  select coalesce(sum(amount), 0) into v_sub from public.purchase_order_lines where purchase_order_id = v_po;
  update public.purchase_orders set subtotal = v_sub, tax = round(v_sub * 0.16, 2), total = v_sub + round(v_sub * 0.16, 2) where id = v_po;

  insert into public.receipts (purchase_order_id, received_on, received_by, source)
  values (v_po, v_today, v_user, 'demo') returning id into v_rec;

  select id into v_pol from public.purchase_order_lines where purchase_order_id = v_po and line_number = 1;
  insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reference_id, reason, performed_by, source)
  values (v_prod[1], (select id from public.locations where code = 'RECEPCION' and warehouse_id = v_wh),
    'entrada', 20, 'recepcion', v_rec, 'Recepción de compra', v_user, 'demo')
  returning id into v_mov;

  insert into public.receipt_lines (receipt_id, purchase_order_line_id, product_id, location_id, quantity, movement_id)
  values (v_rec, v_pol, v_prod[1], (select id from public.locations where code = 'RECEPCION' and warehouse_id = v_wh), 20, v_mov);

  -- ── Una lista de surtido a medias ───────────────────────────────────────────
  select id into v_doc from public.sales_orders where source = 'demo' and status = 'en_surtido' limit 1;
  if v_doc is not null then
    insert into public.pick_lists (status, started_at, notes, created_by)
    values ('en_proceso', now() - interval '20 minutes', 'Vuelta de la tarde', v_user) returning id into v_list;
    insert into public.pick_list_orders (pick_list_id, sales_order_id) values (v_list, v_doc);

    i := 0;
    for r in
      select sol.id as line_id, sol.product_id, sol.quantity, sl.location_id, l.pick_order
      from public.sales_order_lines sol
      join public.stock_levels sl on sl.product_id = sol.product_id and sl.quantity > 0
      join public.locations l on l.id = sl.location_id
      where sol.order_id = v_doc order by l.pick_order
    loop
      i := i + 1;
      insert into public.pick_list_lines (pick_list_id, sales_order_line_id, product_id, location_id, pick_order, quantity_requested, quantity_picked, status, picked_by, picked_at)
      values (v_list, r.line_id, r.product_id, r.location_id, r.pick_order, r.quantity,
        case when i = 1 then r.quantity end,
        case when i = 1 then 'surtido' else 'pendiente' end,
        case when i = 1 then v_user end,
        case when i = 1 then now() - interval '10 minutes' end);
    end loop;
  end if;

  -- ── Conteo con diferencia e incidencia ──────────────────────────────────────
  insert into public.stock_counts (product_id, location_id, counted_quantity, notes, counted_by, source)
  select sl.product_id, sl.location_id, greatest(0, sl.quantity - 2), 'Conteo de arranque', v_user, 'demo'
  from public.stock_levels sl join public.products p on p.id = sl.product_id
  where p.source = 'demo' and sl.quantity > 3 limit 2;

  insert into public.incidents (product_id, location_id, kind, description, quantity, reported_by, source)
  values (v_prod[2], v_locs[2], 'dañado', 'Caja golpeada al recibir; producto con rayón', 1, v_user, 'demo');

  -- ── Marketing ───────────────────────────────────────────────────────────────
  insert into public.leads (name, company, email, phone, source, status, rep_id, source_origin) values
    ('Tomás Quiroz', 'Constructora Quiroz', 'tomas@ejemplo.mx', '55 3000 0001', 'linkedin', 'contactado', v_rep1, 'demo'),
    ('Nadia Islas', 'Mantenimiento Islas', 'nadia@ejemplo.mx', '55 3000 0002', 'nfc_qr', 'en_conversacion', v_rep2, 'demo'),
    ('Beto Ramírez', null, 'beto@ejemplo.mx', '55 3000 0003', 'shopify', 'nuevo', null, 'demo');

  return jsonb_build_object(
    'ubicaciones', (select count(*) from public.locations where source = 'demo'),
    'productos', (select count(*) from public.products where source = 'demo'),
    'clientes', (select count(*) from public.customers where source = 'demo'),
    'cotizaciones', (select count(*) from public.quotes where source = 'demo'),
    'pedidos', (select count(*) from public.sales_orders where source = 'demo'),
    'movimientos', (select count(*) from public.stock_movements where source = 'demo'),
    'unidades', (select coalesce(sum(quantity), 0) from public.stock_levels));
end;
$$;

comment on function public.seed_demo() is 'Siembra datos de prueba marcados como demo. Idempotente: si ya hay, no hace nada.';

revoke all on function public.seed_demo() from public, anon, authenticated;
grant execute on function public.seed_demo() to service_role;
