-- Mitra Click · Sistema operativo · 5 · Ciclo comercial
-- Cotización → Pedido → Compra → Recepción → Envío → Remisión → Factura → Pago.
--
-- Estas operaciones cruzan áreas (bodega actualiza lo surtido de un pedido; finanzas
-- actualiza su estado de pago), así que son SECURITY DEFINER: cada una valida primero
-- el rol de quien la llama con private.require_role y después escribe de forma atómica.
-- Totales, IVA (16 %) y transiciones de estado se calculan aquí, no en el navegador.

create function private.require_role(p_roles public.app_role[])
returns void
language plpgsql set search_path = ''
as $$
begin
  if not private.has_any_role(p_roles) then
    raise exception 'Tu rol no tiene permiso para esta acción' using errcode = '42501';
  end if;
end;
$$;

create function private.line_amount(p_quantity numeric, p_price numeric, p_discount numeric)
returns numeric
language sql immutable set search_path = ''
as $$ select round(p_quantity * p_price * (1 - coalesce(p_discount, 0) / 100), 2) $$;

-- ═══ Cotizaciones ═══════════════════════════════════════════════════════════
create function public.save_quote(p_id uuid, p_header jsonb, p_lines jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_status text;
  v_subtotal numeric(14, 2);
begin
  perform private.require_role('{direccion,admin,ventas}');
  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'Agrega al menos un renglón';
  end if;

  if v_id is null then
    insert into public.quotes (customer_id, rep_id, valid_until, notes)
    values ((p_header ->> 'customer_id')::uuid, nullif(p_header ->> 'rep_id', '')::uuid, nullif(p_header ->> 'valid_until', '')::date, nullif(p_header ->> 'notes', ''))
    returning id into v_id;
  else
    select status into v_status from public.quotes where id = v_id for update;
    if not found then raise exception 'La cotización no existe'; end if;
    if v_status not in ('borrador', 'enviada', 'negociacion') then
      raise exception 'Una cotización % ya no se puede modificar', v_status;
    end if;
    update public.quotes set
      customer_id = (p_header ->> 'customer_id')::uuid,
      rep_id = nullif(p_header ->> 'rep_id', '')::uuid,
      valid_until = nullif(p_header ->> 'valid_until', '')::date,
      notes = nullif(p_header ->> 'notes', '')
    where id = v_id;
    delete from public.quote_lines where quote_id = v_id;
  end if;

  insert into public.quote_lines (quote_id, line_number, product_id, description, quantity, unit_price, discount_pct, amount)
  select v_id, l.ord, nullif(l.value ->> 'product_id', '')::uuid, btrim(l.value ->> 'description'),
    (l.value ->> 'quantity')::numeric, (l.value ->> 'unit_price')::numeric, coalesce((l.value ->> 'discount_pct')::numeric, 0),
    private.line_amount((l.value ->> 'quantity')::numeric, (l.value ->> 'unit_price')::numeric, (l.value ->> 'discount_pct')::numeric)
  from jsonb_array_elements(p_lines) with ordinality as l(value, ord);

  select coalesce(sum(amount), 0) into v_subtotal from public.quote_lines where quote_id = v_id;
  update public.quotes set subtotal = v_subtotal, tax = round(v_subtotal * 0.16, 2), total = v_subtotal + round(v_subtotal * 0.16, 2) where id = v_id;
  return v_id;
end;
$$;

create function public.set_quote_status(p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform private.require_role('{direccion,admin,ventas}');
  select status into v_status from public.quotes where id = p_id for update;
  if not found then raise exception 'La cotización no existe'; end if;

  if not (
    (v_status = 'borrador' and p_status = 'enviada')
    or (v_status = 'enviada' and p_status in ('negociacion', 'perdida', 'vencida'))
    or (v_status = 'negociacion' and p_status in ('perdida', 'vencida'))
    or (v_status = 'vencida' and p_status = 'enviada')
  ) then
    raise exception 'Una cotización % no puede pasar a %', v_status, p_status;
  end if;
  if p_status = 'perdida' and v_note is null then
    raise exception 'Escribe por qué se perdió la cotización';
  end if;

  update public.quotes set
    status = p_status,
    lost_reason = case when p_status = 'perdida' then v_note else lost_reason end,
    last_follow_up_at = now()
  where id = p_id;
end;
$$;

-- Deja constancia de que se le dio seguimiento hoy (la regla "cotización sin seguimiento" la lee).
create function public.log_quote_follow_up(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_role('{direccion,admin,ventas}');
  update public.quotes set last_follow_up_at = now() where id = p_id and status in ('enviada', 'negociacion');
  if not found then raise exception 'Solo se da seguimiento a cotizaciones enviadas o en negociación'; end if;
end;
$$;

-- Cotización → Pedido: el pedido hereda cliente, vendedor y renglones. Sin recaptura.
create function public.convert_quote_to_order(p_quote_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  q public.quotes;
  v_order uuid;
begin
  perform private.require_role('{direccion,admin,ventas}');
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'La cotización no existe'; end if;
  if q.status not in ('enviada', 'negociacion') then
    raise exception 'Solo una cotización enviada o en negociación se convierte en pedido';
  end if;
  if exists (select 1 from public.sales_orders where quote_id = p_quote_id and status <> 'cancelado') then
    raise exception 'Esta cotización ya tiene un pedido';
  end if;

  insert into public.sales_orders (channel, quote_id, customer_id, rep_id, subtotal, tax, total, notes, shipping_address)
  values ('directo', q.id, q.customer_id, q.rep_id, q.subtotal, q.tax, q.total, q.notes, (select shipping_address from public.customers where id = q.customer_id))
  returning id into v_order;

  insert into public.sales_order_lines (order_id, line_number, product_id, description, quantity, unit_price, unit_cost, amount)
  select v_order, l.line_number, l.product_id, l.description, l.quantity,
    round(l.unit_price * (1 - l.discount_pct / 100), 4), p.cost, l.amount
  from public.quote_lines l left join public.products p on p.id = l.product_id
  where l.quote_id = p_quote_id;

  update public.quotes set status = 'ganada', last_follow_up_at = now() where id = p_quote_id;
  return v_order;
end;
$$;

-- ═══ Pedidos ════════════════════════════════════════════════════════════════
-- Pedido de venta directa capturado a mano. Los de Shopify llegan por el conector.
create function public.save_order(p_id uuid, p_header jsonb, p_lines jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_status text;
  v_channel text;
  v_subtotal numeric(14, 2);
  v_shipping numeric(14, 2) := coalesce(nullif(p_header ->> 'shipping', '')::numeric, 0);
begin
  perform private.require_role('{direccion,admin,ventas}');
  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'Agrega al menos un renglón';
  end if;
  if v_shipping < 0 then raise exception 'El envío no puede ser negativo'; end if;

  if v_id is null then
    insert into public.sales_orders (channel, customer_id, rep_id, promised_on, shipping, shipping_address, notes)
    values ('directo', (p_header ->> 'customer_id')::uuid, nullif(p_header ->> 'rep_id', '')::uuid, nullif(p_header ->> 'promised_on', '')::date, v_shipping, nullif(p_header ->> 'shipping_address', ''), nullif(p_header ->> 'notes', ''))
    returning id into v_id;
  else
    select status, channel into v_status, v_channel from public.sales_orders where id = v_id for update;
    if not found then raise exception 'El pedido no existe'; end if;
    if v_channel <> 'directo' then raise exception 'Los pedidos de Shopify se modifican en Shopify'; end if;
    if v_status <> 'nuevo' then raise exception 'Un pedido % ya no se puede modificar', v_status; end if;
    update public.sales_orders set
      customer_id = (p_header ->> 'customer_id')::uuid,
      rep_id = nullif(p_header ->> 'rep_id', '')::uuid,
      promised_on = nullif(p_header ->> 'promised_on', '')::date,
      shipping = v_shipping,
      shipping_address = nullif(p_header ->> 'shipping_address', ''),
      notes = nullif(p_header ->> 'notes', '')
    where id = v_id;
    delete from public.sales_order_lines where order_id = v_id;
  end if;

  insert into public.sales_order_lines (order_id, line_number, product_id, description, quantity, unit_price, unit_cost, amount)
  select v_id, l.ord, nullif(l.value ->> 'product_id', '')::uuid, btrim(l.value ->> 'description'), (l.value ->> 'quantity')::numeric,
    round((l.value ->> 'unit_price')::numeric * (1 - coalesce((l.value ->> 'discount_pct')::numeric, 0) / 100), 4),
    (select p.cost from public.products p where p.id = nullif(l.value ->> 'product_id', '')::uuid),
    private.line_amount((l.value ->> 'quantity')::numeric, (l.value ->> 'unit_price')::numeric, (l.value ->> 'discount_pct')::numeric)
  from jsonb_array_elements(p_lines) with ordinality as l(value, ord);

  select coalesce(sum(amount), 0) into v_subtotal from public.sales_order_lines where order_id = v_id;
  update public.sales_orders set subtotal = v_subtotal, tax = round(v_subtotal * 0.16, 2), total = v_subtotal + round(v_subtotal * 0.16, 2) + v_shipping where id = v_id;
  return v_id;
end;
$$;

create function public.set_order_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
begin
  perform private.require_role('{direccion,admin,ventas}');
  select status into v_status from public.sales_orders where id = p_id for update;
  if not found then raise exception 'El pedido no existe'; end if;

  if not (
    (v_status = 'nuevo' and p_status in ('confirmado', 'cancelado'))
    or (v_status in ('confirmado', 'en_compra') and p_status in ('en_surtido', 'cancelado'))
    or (v_status = 'en_surtido' and p_status = 'cancelado')
  ) then
    raise exception 'Un pedido % no puede pasar a %', v_status, p_status;
  end if;
  if p_status = 'cancelado' and exists (select 1 from public.shipments where sales_order_id = p_id) then
    raise exception 'El pedido ya tiene envíos y no se puede cancelar';
  end if;
  update public.sales_orders set status = p_status where id = p_id;
end;
$$;

-- ═══ Compras ════════════════════════════════════════════════════════════════
-- Con sales_order_id, la compra queda ligada al pedido que la originó.
create function public.save_purchase(p_id uuid, p_header jsonb, p_lines jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_status text;
  v_order uuid := nullif(p_header ->> 'sales_order_id', '')::uuid;
  v_subtotal numeric(14, 2);
begin
  perform private.require_role('{direccion,admin,compras}');
  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'Agrega al menos un renglón';
  end if;

  if v_id is null then
    insert into public.purchase_orders (supplier_id, sales_order_id, expected_on, notes)
    values ((p_header ->> 'supplier_id')::uuid, v_order, nullif(p_header ->> 'expected_on', '')::date, nullif(p_header ->> 'notes', ''))
    returning id into v_id;
    -- El pedido confirmado que espera mercancía pasa a "en compra".
    update public.sales_orders set status = 'en_compra' where id = v_order and status = 'confirmado';
  else
    select status into v_status from public.purchase_orders where id = v_id for update;
    if not found then raise exception 'La compra no existe'; end if;
    if v_status <> 'borrador' then raise exception 'Una compra % ya no se puede modificar', v_status; end if;
    update public.purchase_orders set
      supplier_id = (p_header ->> 'supplier_id')::uuid,
      expected_on = nullif(p_header ->> 'expected_on', '')::date,
      notes = nullif(p_header ->> 'notes', '')
    where id = v_id;
    delete from public.purchase_order_lines where purchase_order_id = v_id;
  end if;

  insert into public.purchase_order_lines (purchase_order_id, line_number, product_id, quantity, unit_cost, amount)
  select v_id, l.ord, (l.value ->> 'product_id')::uuid, (l.value ->> 'quantity')::numeric, (l.value ->> 'unit_price')::numeric,
    private.line_amount((l.value ->> 'quantity')::numeric, (l.value ->> 'unit_price')::numeric, 0)
  from jsonb_array_elements(p_lines) with ordinality as l(value, ord);

  select coalesce(sum(amount), 0) into v_subtotal from public.purchase_order_lines where purchase_order_id = v_id;
  update public.purchase_orders set subtotal = v_subtotal, tax = round(v_subtotal * 0.16, 2), total = v_subtotal + round(v_subtotal * 0.16, 2) where id = v_id;
  return v_id;
end;
$$;

create function public.set_purchase_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
begin
  perform private.require_role('{direccion,admin,compras}');
  select status into v_status from public.purchase_orders where id = p_id for update;
  if not found then raise exception 'La compra no existe'; end if;
  if not ((v_status = 'borrador' and p_status in ('enviada', 'cancelada')) or (v_status = 'enviada' and p_status = 'cancelada')) then
    raise exception 'Una compra % no puede pasar a %', v_status, p_status;
  end if;
  update public.purchase_orders set status = p_status where id = p_id;
end;
$$;

-- Recepción en bodega: crea la recepción, las entradas en el libro de movimientos y
-- actualiza lo recibido de cada renglón. p_lines: [{purchase_order_line_id, location_id, quantity}].
create function public.receive_purchase(p_purchase_id uuid, p_lines jsonb, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
  v_receipt uuid;
  v_movement bigint;
  r jsonb;
  l public.purchase_order_lines;
  v_quantity numeric;
begin
  perform private.require_role('{direccion,admin,compras,almacen}');
  select status into v_status from public.purchase_orders where id = p_purchase_id for update;
  if not found then raise exception 'La compra no existe'; end if;
  if v_status not in ('enviada', 'parcial') then
    raise exception 'Solo se recibe mercancía de una compra enviada al proveedor';
  end if;
  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'Indica qué se recibió';
  end if;

  insert into public.receipts (purchase_order_id, notes) values (p_purchase_id, nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_receipt;

  for r in select value from jsonb_array_elements(p_lines) loop
    v_quantity := (r ->> 'quantity')::numeric;
    select * into l from public.purchase_order_lines where id = (r ->> 'purchase_order_line_id')::uuid and purchase_order_id = p_purchase_id for update;
    if not found then raise exception 'Un renglón no pertenece a esta compra'; end if;
    if v_quantity is null or v_quantity <= 0 then raise exception 'La cantidad recibida debe ser mayor que cero'; end if;
    if l.quantity_received + v_quantity > l.quantity then
      raise exception 'Se recibe más de lo pedido (pendiente: %). Si llegó de más, repórtalo como incidencia', l.quantity - l.quantity_received;
    end if;

    insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reference_id, reason)
    values (l.product_id, (r ->> 'location_id')::uuid, 'entrada', v_quantity, 'recepcion', v_receipt, 'Recepción de compra')
    returning id into v_movement;

    insert into public.receipt_lines (receipt_id, purchase_order_line_id, product_id, location_id, quantity, movement_id)
    values (v_receipt, l.id, l.product_id, (r ->> 'location_id')::uuid, v_quantity, v_movement);

    update public.purchase_order_lines set quantity_received = quantity_received + v_quantity where id = l.id;
  end loop;

  update public.purchase_orders set status = case
    when exists (select 1 from public.purchase_order_lines where purchase_order_id = p_purchase_id and quantity_received < quantity) then 'parcial'
    else 'recibida' end
  where id = p_purchase_id;
  return v_receipt;
end;
$$;

-- ═══ Envíos y remisiones ════════════════════════════════════════════════════
-- Surtir y programar el envío: crea el envío, las salidas en el libro de movimientos y
-- la remisión pendiente. p_lines: [{sales_order_line_id, location_id, quantity}].
create function public.ship_order(p_order_id uuid, p_header jsonb, p_lines jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
  v_shipment uuid;
  v_movement bigint;
  r jsonb;
  l public.sales_order_lines;
  v_quantity numeric;
begin
  perform private.require_role('{direccion,admin,logistica,almacen}');
  select status into v_status from public.sales_orders where id = p_order_id for update;
  if not found then raise exception 'El pedido no existe'; end if;
  if v_status not in ('confirmado', 'en_compra', 'en_surtido') then
    raise exception 'Solo se surte un pedido confirmado';
  end if;
  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'Indica qué se envía';
  end if;

  insert into public.shipments (sales_order_id, carrier, route, driver, tracking_number, scheduled_on, notes)
  values (p_order_id, nullif(p_header ->> 'carrier', ''), nullif(p_header ->> 'route', ''), nullif(p_header ->> 'driver', ''),
    nullif(p_header ->> 'tracking_number', ''), nullif(p_header ->> 'scheduled_on', '')::date, nullif(p_header ->> 'notes', ''))
  returning id into v_shipment;

  for r in select value from jsonb_array_elements(p_lines) loop
    v_quantity := (r ->> 'quantity')::numeric;
    select * into l from public.sales_order_lines where id = (r ->> 'sales_order_line_id')::uuid and order_id = p_order_id for update;
    if not found then raise exception 'Un renglón no pertenece a este pedido'; end if;
    if l.product_id is null then raise exception 'El renglón "%" no tiene producto del catálogo; no mueve inventario', l.description; end if;
    if v_quantity is null or v_quantity <= 0 then raise exception 'La cantidad enviada debe ser mayor que cero'; end if;
    if l.quantity_fulfilled + v_quantity > l.quantity then
      raise exception 'Se envía más de lo pedido (pendiente: %)', l.quantity - l.quantity_fulfilled;
    end if;

    insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reference_id, reason)
    values (l.product_id, (r ->> 'location_id')::uuid, 'salida', -v_quantity, 'envio', v_shipment, 'Salida por envío')
    returning id into v_movement;

    insert into public.shipment_lines (shipment_id, sales_order_line_id, product_id, location_id, quantity, movement_id)
    values (v_shipment, l.id, l.product_id, (r ->> 'location_id')::uuid, v_quantity, v_movement);

    update public.sales_order_lines set quantity_fulfilled = quantity_fulfilled + v_quantity where id = l.id;
  end loop;

  insert into public.remissions (shipment_id, sales_order_id) values (v_shipment, p_order_id);

  -- Completo (todos los renglones con producto surtidos) → enviado; si no, sigue en surtido.
  update public.sales_orders set status = case
    when exists (select 1 from public.sales_order_lines where order_id = p_order_id and product_id is not null and quantity_fulfilled < quantity) then 'en_surtido'
    else 'enviado' end
  where id = p_order_id;
  return v_shipment;
end;
$$;

create function public.set_shipment_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
begin
  perform private.require_role('{direccion,admin,logistica,almacen}');
  select status into v_status from public.shipments where id = p_id for update;
  if not found then raise exception 'El envío no existe'; end if;
  if not (
    (v_status = 'programado' and p_status = 'en_ruta')
    or (v_status = 'en_ruta' and p_status = 'incidencia')
    or (v_status = 'incidencia' and p_status = 'en_ruta')
  ) then
    -- Cancelar un envío implicaría regresar mercancía: se hace con una entrada y una incidencia, a la vista.
    raise exception 'Un envío % no puede pasar a %', v_status, p_status;
  end if;
  update public.shipments set status = p_status, shipped_at = coalesce(shipped_at, now()) where id = p_id;
end;
$$;

-- Entrega: quién recibió y la evidencia (rutas dentro del bucket privado "remisiones").
create function public.register_delivery(p_shipment_id uuid, p_received_by_name text, p_evidence_paths text[], p_notes text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  s public.shipments;
  v_remission uuid;
begin
  perform private.require_role('{direccion,admin,logistica,almacen}');
  select * into s from public.shipments where id = p_shipment_id for update;
  if not found then raise exception 'El envío no existe'; end if;
  if s.status not in ('programado', 'en_ruta', 'incidencia') then
    raise exception 'Este envío ya está %', s.status;
  end if;
  if nullif(btrim(coalesce(p_received_by_name, '')), '') is null then
    raise exception 'Escribe quién recibió';
  end if;

  update public.shipments set status = 'entregado', shipped_at = coalesce(shipped_at, now()), delivered_at = now() where id = p_shipment_id;

  update public.remissions set
    status = 'entregada', delivered_at = now(), received_by_name = btrim(p_received_by_name),
    evidence_paths = coalesce(p_evidence_paths, '{}'), notes = nullif(btrim(coalesce(p_notes, '')), '')
  where shipment_id = p_shipment_id
  returning id into v_remission;

  -- El pedido queda entregado cuando está surtido completo y no le quedan envíos por entregar.
  update public.sales_orders o set status = 'entregado'
  where o.id = s.sales_order_id and o.status = 'enviado'
    and not exists (select 1 from public.shipments x where x.sales_order_id = o.id and x.status not in ('entregado', 'cancelado'));
  return v_remission;
end;
$$;

-- Verificación de la remisión por alguien distinto de quien entrega.
create function public.verify_remission(p_id uuid, p_approved boolean, p_notes text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  perform private.require_role('{direccion,admin,finanzas}');
  if not p_approved and v_note is null then
    raise exception 'Escribe por qué se rechaza la remisión';
  end if;
  update public.remissions set
    status = case when p_approved then 'verificada' else 'rechazada' end,
    verified_by = private.current_app_user_id(), verified_at = now(),
    notes = coalesce(v_note, notes)
  where id = p_id and status = 'entregada';
  if not found then raise exception 'Solo se verifica una remisión entregada y sin verificar'; end if;
end;
$$;

-- ═══ Facturas y pagos ═══════════════════════════════════════════════════════
-- Registro de la factura ya emitida fuera del sistema (no se timbra aquí).
create function public.register_invoice(p_order_id uuid, p_folio text, p_series text default null, p_issued_on date default current_date, p_due_on date default null, p_cfdi_uuid text default null, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  o public.sales_orders;
  v_id uuid;
begin
  perform private.require_role('{direccion,admin,finanzas}');
  select * into o from public.sales_orders where id = p_order_id;
  if not found then raise exception 'El pedido no existe'; end if;
  if o.status in ('nuevo', 'cancelado') then raise exception 'No se factura un pedido %', o.status; end if;
  if o.customer_id is null then raise exception 'El pedido no tiene cliente; asígnalo antes de facturar'; end if;
  if nullif(btrim(coalesce(p_folio, '')), '') is null then raise exception 'Escribe el folio de la factura'; end if;
  if exists (select 1 from public.invoices where sales_order_id = p_order_id and status <> 'cancelada') then
    raise exception 'Este pedido ya tiene una factura vigente';
  end if;

  insert into public.invoices (folio, series, sales_order_id, customer_id, issued_on, due_on, subtotal, tax, total, cfdi_uuid, notes)
  values (btrim(p_folio), nullif(btrim(coalesce(p_series, '')), ''), p_order_id, o.customer_id, coalesce(p_issued_on, current_date), p_due_on,
    o.subtotal + o.shipping, o.tax, o.total, nullif(btrim(coalesce(p_cfdi_uuid, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.cancel_invoice(p_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_role('{direccion,admin,finanzas}');
  if nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'Escribe el motivo de la cancelación'; end if;
  if exists (select 1 from public.payments where invoice_id = p_id) then
    raise exception 'La factura ya tiene pagos; no se puede cancelar';
  end if;
  update public.invoices set status = 'cancelada', notes = concat_ws(' · ', notes, 'Cancelada: ' || btrim(p_reason)) where id = p_id and status = 'emitida';
  if not found then raise exception 'Solo se cancela una factura emitida y sin pagos'; end if;
end;
$$;

-- Pago contra una factura: actualiza el estado de la factura y el de pago del pedido.
create function public.register_payment(p_invoice_id uuid, p_amount numeric, p_paid_on date default current_date, p_method text default null, p_reference text default null, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  i public.invoices;
  v_paid numeric(14, 2);
  v_id uuid;
begin
  perform private.require_role('{direccion,admin,finanzas}');
  select * into i from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'La factura no existe'; end if;
  if i.status = 'cancelada' then raise exception 'La factura está cancelada'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El importe debe ser mayor que cero'; end if;

  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = p_invoice_id;
  if v_paid + p_amount > i.total then
    raise exception 'El pago excede el saldo de la factura (saldo: %)', i.total - v_paid;
  end if;

  insert into public.payments (invoice_id, sales_order_id, customer_id, paid_on, amount, method, reference, notes)
  values (p_invoice_id, i.sales_order_id, i.customer_id, coalesce(p_paid_on, current_date), p_amount, nullif(p_method, ''),
    nullif(btrim(coalesce(p_reference, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_id;

  v_paid := v_paid + p_amount;
  update public.invoices set status = case when v_paid >= i.total then 'pagada' else 'parcial' end where id = p_invoice_id;
  update public.sales_orders set payment_status = case when v_paid >= i.total then 'pagado' else 'parcial' end where id = i.sales_order_id;
  return v_id;
end;
$$;

-- ═══ Lectura: estado de cuenta y línea de tiempo ════════════════════════════
create view public.invoice_balances with (security_invoker = true) as
select
  i.id, i.folio, i.series, i.sales_order_id, i.customer_id, i.issued_on, i.due_on, i.total, i.status,
  coalesce(p.paid, 0)::numeric(14, 2) as paid,
  (i.total - coalesce(p.paid, 0))::numeric(14, 2) as balance,
  (i.status in ('emitida', 'parcial') and i.due_on is not null and i.due_on < current_date) as overdue
from public.invoices i
left join (select invoice_id, sum(amount) as paid from public.payments group by invoice_id) p on p.invoice_id = i.id;

-- Una fila por cliente con facturas. `id` es el del cliente (lo usa la lista genérica de la app).
create view public.customer_statements with (security_invoker = true) as
select
  c.id, c.folio, c.name,
  count(b.id) filter (where b.status <> 'cancelada') as invoices,
  coalesce(sum(b.total) filter (where b.status <> 'cancelada'), 0)::numeric(14, 2) as invoiced,
  coalesce(sum(b.paid) filter (where b.status <> 'cancelada'), 0)::numeric(14, 2) as paid,
  coalesce(sum(b.balance) filter (where b.status <> 'cancelada'), 0)::numeric(14, 2) as balance,
  coalesce(sum(b.balance) filter (where b.overdue), 0)::numeric(14, 2) as overdue_balance,
  min(b.due_on) filter (where b.overdue) as oldest_due_on
from public.customers c
join public.invoice_balances b on b.customer_id = c.id
group by c.id, c.folio, c.name;

-- Todo lo que le pasó a un pedido, en orden: de la cotización al pago.
create function public.order_timeline(p_order_id uuid)
returns table (occurred_at timestamptz, kind text, title text, detail text, document_id uuid)
language sql stable set search_path = ''
as $$
  select q.created_at, 'cotizacion', 'Cotización ' || coalesce(q.folio, ''), 'Total ' || q.total::text, q.id
  from public.sales_orders o join public.quotes q on q.id = o.quote_id where o.id = p_order_id
  union all
  select o.created_at, 'pedido', 'Pedido ' || coalesce(o.folio, o.shopify_order_name, ''), case o.channel when 'shopify' then 'Shopify' else 'Venta directa' end, o.id
  from public.sales_orders o where o.id = p_order_id
  union all
  select p.created_at, 'compra', 'Compra ' || coalesce(p.folio, ''), s.name, p.id
  from public.purchase_orders p join public.suppliers s on s.id = p.supplier_id where p.sales_order_id = p_order_id
  union all
  select r.created_at, 'recepcion', 'Recepción ' || coalesce(r.folio, ''), 'De la compra ' || coalesce(p.folio, ''), r.id
  from public.receipts r join public.purchase_orders p on p.id = r.purchase_order_id where p.sales_order_id = p_order_id
  union all
  select s.created_at, 'envio', 'Envío ' || coalesce(s.folio, '') || ' programado', concat_ws(' · ', s.carrier, s.route, s.tracking_number), s.id
  from public.shipments s where s.sales_order_id = p_order_id
  union all
  select s.shipped_at, 'envio', 'Envío ' || coalesce(s.folio, '') || ' salió a ruta', s.driver, s.id
  from public.shipments s where s.sales_order_id = p_order_id and s.shipped_at is not null
  union all
  select r.delivered_at, 'remision', 'Remisión ' || coalesce(r.folio, '') || ' entregada', 'Recibió: ' || coalesce(r.received_by_name, '—'), r.id
  from public.remissions r where r.sales_order_id = p_order_id and r.delivered_at is not null
  union all
  select r.verified_at, 'remision', 'Remisión ' || coalesce(r.folio, '') || ' ' || r.status, r.notes, r.id
  from public.remissions r where r.sales_order_id = p_order_id and r.verified_at is not null
  union all
  select i.created_at, 'factura', 'Factura ' || concat_ws('-', i.series, i.folio), 'Total ' || i.total::text, i.id
  from public.invoices i where i.sales_order_id = p_order_id
  union all
  select p.created_at, 'pago', 'Pago ' || coalesce(p.folio, ''), concat_ws(' · ', p.amount::text, p.method, p.reference), p.id
  from public.payments p where p.sales_order_id = p_order_id
  order by 1
$$;

-- ═══ Evidencia de remisiones: bucket privado ════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('remisiones', 'remisiones', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "Miembros ven evidencia de remisiones" on storage.objects
  for select to authenticated
  using (bucket_id = 'remisiones' and (select private.is_member()));
create policy "Logística sube evidencia de remisiones" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'remisiones' and (select private.has_any_role('{direccion,admin,logistica,almacen}'::public.app_role[])));

-- ═══ Permisos de ejecución ══════════════════════════════════════════════════
do $$
declare
  f text;
begin
  foreach f in array array[
    'save_quote(uuid, jsonb, jsonb)', 'set_quote_status(uuid, text, text)', 'log_quote_follow_up(uuid)', 'convert_quote_to_order(uuid)',
    'save_order(uuid, jsonb, jsonb)', 'set_order_status(uuid, text)',
    'save_purchase(uuid, jsonb, jsonb)', 'set_purchase_status(uuid, text)', 'receive_purchase(uuid, jsonb, text)',
    'ship_order(uuid, jsonb, jsonb)', 'set_shipment_status(uuid, text)', 'register_delivery(uuid, text, text[], text)', 'verify_remission(uuid, boolean, text)',
    'register_invoice(uuid, text, text, date, date, text, text)', 'cancel_invoice(uuid, text)', 'register_payment(uuid, numeric, date, text, text, text)',
    'order_timeline(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

revoke all on public.invoice_balances, public.customer_statements from anon, authenticated;
grant select on public.invoice_balances, public.customer_statements to authenticated;
revoke all on all functions in schema private from public, anon;
