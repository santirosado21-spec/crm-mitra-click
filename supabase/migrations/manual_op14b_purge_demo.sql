-- Mitra Click · Sistema operativo · 14b · Purgador de datos de prueba
--
-- PARA CORRER A MANO en el SQL Editor de Supabase. El control de permisos del agente no
-- deja aplicarlo: toca el trigger de inmutabilidad del libro y contiene borrados masivos.
-- Al correrlo, renombrar este archivo con la versión que le asigne Supabase.
--
-- Contraparte de seed_demo(): quita lo sembrado y deja intacto lo real. Sirve para el día
-- en que entren los datos de verdad sin tener que reconstruir la base.
--
-- El libro de movimientos es inmutable por diseño (trigger no_update_delete). En vez de
-- desactivar el trigger, se le abre una excepción angosta y rastreable: solo borra si el
-- renglón es de prueba Y la bandera de purga está puesta. La bandera solo la pone
-- purge_demo(), que únicamente service_role puede ejecutar. Para cualquier otro camino
-- —la app, un usuario, cualquier otro rol— el libro sigue siendo inmutable.

create or replace function private.forbid_change()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and current_setting('app.purging_demo', true) = 'on'
    and to_jsonb(old) ->> 'source' = 'demo'
  then
    return old;
  end if;
  raise exception 'Los registros de % no se pueden modificar ni borrar; registra un movimiento de corrección', tg_table_name;
end;
$$;

create or replace function public.purge_demo()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_antes jsonb;
begin
  v_antes := jsonb_build_object(
    'ubicaciones', (select count(*) from public.locations where source = 'demo'),
    'productos', (select count(*) from public.products where source = 'demo'),
    'clientes', (select count(*) from public.customers where source = 'demo'),
    'cotizaciones', (select count(*) from public.quotes where source = 'demo'),
    'pedidos', (select count(*) from public.sales_orders where source = 'demo'),
    'movimientos', (select count(*) from public.stock_movements where source = 'demo'));

  perform set_config('app.purging_demo', 'on', true);

  -- Orden: primero lo que depende de otra cosa. Los renglones se van en cascada.
  delete from public.pick_lists pl
  where exists (
    select 1 from public.pick_list_orders po
    join public.sales_orders o on o.id = po.sales_order_id
    where po.pick_list_id = pl.id and o.source = 'demo');

  delete from public.payments where source = 'demo';
  delete from public.invoices where source = 'demo';
  delete from public.remissions where source = 'demo';
  delete from public.shipments where source = 'demo';
  delete from public.receipts where source = 'demo';
  delete from public.purchase_orders where source = 'demo';
  delete from public.sales_orders where source = 'demo';
  delete from public.quotes where source = 'demo';
  delete from public.stock_counts where source = 'demo';
  delete from public.incidents where source = 'demo';

  delete from public.stock_levels sl
  where exists (select 1 from public.products p where p.id = sl.product_id and p.source = 'demo');
  delete from public.stock_movements where source = 'demo';

  delete from public.tags t
  where exists (select 1 from public.products p where p.id = t.product_id and p.source = 'demo')
     or exists (select 1 from public.locations l where l.id = t.location_id and l.source = 'demo');
  delete from public.product_change_log pcl
  where exists (select 1 from public.products p where p.id = pcl.product_id and p.source = 'demo');

  delete from public.products where source = 'demo';
  delete from public.product_categories where source = 'demo';
  delete from public.product_families where source = 'demo';
  delete from public.locations where source = 'demo';
  delete from public.warehouses where source = 'demo';
  delete from public.customers where source = 'demo';
  delete from public.suppliers where source = 'demo';
  delete from public.sales_reps where source = 'demo';
  delete from public.leads where source_origin = 'demo';

  perform set_config('app.purging_demo', 'off', true);

  return jsonb_build_object('borrado', v_antes,
    'quedan_movimientos_demo', (select count(*) from public.stock_movements where source = 'demo'));
end;
$$;

comment on function public.purge_demo() is 'Borra lo marcado como demo y deja lo real intacto. Contraparte de seed_demo().';

revoke all on function public.purge_demo() from public, anon, authenticated;
grant execute on function public.purge_demo() to service_role;
