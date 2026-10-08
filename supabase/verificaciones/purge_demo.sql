-- Verificación de purge_demo(), para correr a mano en el SQL Editor de Supabase.
--
-- NO BORRA NADA: todo pasa dentro de un bloque que termina con `raise exception`, así que
-- Postgres revierte la transacción completa. El "ERROR: RESULTADO ..." que devuelve es la
-- salida esperada, no una falla. Correrlo con los datos demo ya sembrados.
--
-- Comprueba cuatro cosas:
--   1. Sin la bandera de purga, el libro de movimientos sigue siendo inmutable.
--   2. La purga se lleva todo lo marcado como demo.
--   3. Una ubicación demo que guarda movimientos reales se conserva y pasa a 'manual'.
--   4. Los datos reales ('manual') quedan intactos.

do $$
declare
  v_prod_real uuid; v_loc_real uuid; v_mov_id bigint;
  v_inmutable text := 'FALLA: el libro se dejó borrar sin bandera';
  v_res jsonb; v_quedan integer; v_real text; v_loc_fuente text;
begin
  -- Datos reales de control: un producto 'manual' con un movimiento en una ubicación que
  -- se sembró como demo. Es el escenario del día que entren los datos de verdad.
  insert into public.products (sku, name, unit, price, source)
  values ('REAL-CONTROL', 'Producto real de control', 'pieza', 100, 'manual')
  returning id into v_prod_real;

  select id into v_loc_real from public.locations where code = 'A-01-1' limit 1;

  insert into public.stock_movements (product_id, location_id, movement_type, quantity_delta, reference_type, reason, source)
  values (v_prod_real, v_loc_real, 'entrada', 5, 'carga_inicial', 'Control real', 'manual');

  -- 1. El libro no se deja borrar fuera de la purga.
  select id into v_mov_id from public.stock_movements where source = 'demo' limit 1;
  begin
    delete from public.stock_movements where id = v_mov_id;
  exception when others then
    v_inmutable := 'OK: protegido';
  end;

  -- 2 y 3. La purga.
  v_res := public.purge_demo();

  v_quedan := (select count(*) from public.products where source = 'demo')
            + (select count(*) from public.stock_movements where source = 'demo')
            + (select count(*) from public.sales_orders where source = 'demo')
            + (select count(*) from public.quotes where source = 'demo')
            + (select count(*) from public.customers where source = 'demo');

  v_loc_fuente := coalesce((select source::text from public.locations where id = v_loc_real), 'BORRADA (falla: guardaba un movimiento real)');

  -- 4. Lo real.
  v_real := (select count(*)::text from public.products where source = 'manual') || ' producto(s), '
         || (select count(*)::text from public.stock_movements where source = 'manual') || ' movimiento(s)';

  raise exception E'RESULTADO\n  1. libro sin bandera        -> %\n  2. rastros demo restantes   -> % (debe ser 0)\n  3. ubicación con dato real  -> % (debe ser manual)\n  4. sobrevive lo real        -> %\n  detalle de la purga        -> %',
    v_inmutable, v_quedan, v_loc_fuente, v_real, v_res::text;
end;
$$;
