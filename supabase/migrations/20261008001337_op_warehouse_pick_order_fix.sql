-- Mitra Click · Sistema operativo · 11b · Corrección del orden de recorrido
-- La primera versión de la fórmula desbordaba integer (65·128² · 10000 > 2.1e9).
-- Esta cabe holgadamente y es idéntica a `pickOrder` de src/mitraclick/lib/warehouse.ts.
--
-- La función anterior `private.pick_order(text,int,int)` quedó sin uso: no se puede
-- reemplazar una función por otra con distinto tipo de retorno, y borrarla requiere
-- autorización. Se puede eliminar sin consecuencias cuando convenga.
--
-- El archivo 20261008000832 ya contiene la versión corregida: aplicar solo ese basta en
-- una base nueva. Este queda para que el repositorio refleje lo que pasó en producción.

create function private.location_pick_order(p_zone text, p_position integer, p_level integer)
returns integer
language plpgsql immutable set search_path = ''
as $$
declare
  v_zone text := rpad(left(upper(btrim(coalesce(p_zone, ''))), 3), 3, ' ');
  v_weight integer := 0;
  v_code integer;
  i integer;
begin
  -- '0'–'9' → 1..10, 'A'–'Z' → 11..36, lo demás → 0. Base 37; máximo 50 652.
  for i in 1 .. 3 loop
    v_code := ascii(substr(v_zone, i, 1));
    v_weight := v_weight * 37 + case
      when v_code between 48 and 57 then v_code - 47
      when v_code between 65 and 90 then v_code - 54
      else 0 end;
  end loop;
  -- Zonas de servicio, después de cualquier anaquel (el máximo normal es ~5.1e8).
  if p_position is null or p_level is null then
    return 1000000000 + v_weight;
  end if;
  return v_weight * 10000 + p_position * 10 + p_level;
end;
$$;

create or replace function private.set_pick_order()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.zone := nullif(upper(btrim(coalesce(new.zone, ''))), '');
  if new.zone is null then
    new.zone := split_part(upper(btrim(new.code)), '-', 1);
  end if;
  new.pick_order := private.location_pick_order(new.zone, new.position, new.level);
  return new;
end;
$$;

alter table public.locations
  add constraint locations_position_max check (position is null or position <= 999),
  add constraint locations_level_max check (level is null or level <= 9);

revoke all on all functions in schema private from public, anon;
