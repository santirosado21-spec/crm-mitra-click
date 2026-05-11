-- Actualiza el catalogo base de transporte con operadores y maniobristas.
-- Seguro para correr mas de una vez: inserta faltantes y marca maniobristas por notas.

WITH catalogo(nombre, es_propio, sueldo_diario, notas) AS (
  VALUES
    ('Ruben Rodarte Martinez', true, 420, 'Operador de transporte'),
    ('Estanislao Valverde Gonzalez', true, 420, 'Operador de transporte'),
    ('Jose Luis Martinez Gonzalez', true, 420, 'Operador de transporte'),
    ('Luis Manuel Lopez Celis', true, 420, 'Operador de transporte'),
    ('Guadalupe Hernadez Jimenez', true, 420, 'Maniobrista'),
    ('Roberto Jimenez', true, 420, 'Maniobrista')
)
INSERT INTO operadores (nombre, es_propio, sueldo_diario, notas, activo)
SELECT c.nombre, c.es_propio, c.sueldo_diario, c.notas, true
FROM catalogo c
WHERE NOT EXISTS (
  SELECT 1
  FROM operadores op
  WHERE lower(op.nombre) = lower(c.nombre)
);

UPDATE operadores
SET notas = 'Maniobrista',
    es_propio = true,
    activo = true,
    updated_at = now()
WHERE lower(nombre) IN (
  lower('Guadalupe Hernadez Jimenez'),
  lower('Roberto Jimenez')
);

UPDATE operadores
SET notas = 'Operador de transporte',
    es_propio = true,
    activo = true,
    updated_at = now()
WHERE lower(nombre) IN (
  lower('Ruben Rodarte Martinez'),
  lower('Estanislao Valverde Gonzalez'),
  lower('Jose Luis Martinez Gonzalez'),
  lower('Luis Manuel Lopez Celis')
)
AND (notas IS NULL OR notas = '' OR notas ILIKE 'Operador%');
