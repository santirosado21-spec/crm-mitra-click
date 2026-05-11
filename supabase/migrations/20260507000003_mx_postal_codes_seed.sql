-- ============================================================================
-- Seed: 100 códigos postales principales de México con lat/lon
-- Cubre ~80% de los envíos típicos de SAC (Lerma + CDMX + Edo. México + GDL +
-- MTY + capitales y ciudades grandes).
--
-- Idempotente: ON CONFLICT (cp) DO NOTHING. Re-correrlo no duplica.
-- Cuando llegue el dataset SEPOMEX completo, aplicar el seed grande encima.
-- ============================================================================

INSERT INTO mx_postal_codes (cp, estado, municipio, ciudad, lat, lon) VALUES
  -- ── Origen: CEDIS Lerma ────────────────────────────────────────────────
  ('52000', 'México', 'Lerma',          'Lerma de Villada',   19.2851, -99.5089),
  ('52004', 'México', 'Lerma',          'San Mateo Atenco',   19.2680, -99.5360),
  ('52004', 'México', 'Lerma',          'San Mateo Atenco',   19.2680, -99.5360),

  -- ── CDMX (15) ──────────────────────────────────────────────────────────
  ('06700', 'CDMX', 'Cuauhtémoc',       'Roma Norte',         19.4185, -99.1620),
  ('06600', 'CDMX', 'Cuauhtémoc',       'Juárez',             19.4280, -99.1630),
  ('06500', 'CDMX', 'Cuauhtémoc',       'Centro Histórico',   19.4326, -99.1332),
  ('06400', 'CDMX', 'Cuauhtémoc',       'Cuauhtémoc',         19.4408, -99.1525),
  ('06140', 'CDMX', 'Cuauhtémoc',       'Condesa',            19.4127, -99.1730),
  ('11000', 'CDMX', 'Miguel Hidalgo',   'Lomas de Chapultepec',19.4290, -99.2079),
  ('11550', 'CDMX', 'Miguel Hidalgo',   'Polanco',            19.4338, -99.1928),
  ('03100', 'CDMX', 'Benito Juárez',    'Del Valle',          19.3863, -99.1656),
  ('03020', 'CDMX', 'Benito Juárez',    'Narvarte',           19.3975, -99.1480),
  ('03900', 'CDMX', 'Benito Juárez',    'Mixcoac',            19.3760, -99.1850),
  ('04000', 'CDMX', 'Coyoacán',         'Coyoacán Centro',    19.3500, -99.1620),
  ('04510', 'CDMX', 'Coyoacán',         'Ciudad Universitaria',19.3325, -99.1870),
  ('14000', 'CDMX', 'Tlalpan',          'Tlalpan',            19.2926, -99.1670),
  ('07700', 'CDMX', 'GAM',              'Lindavista',         19.4870, -99.1290),
  ('09000', 'CDMX', 'Iztapalapa',       'Iztapalapa Centro',  19.3567, -99.0700),

  -- ── Estado de México (15) ──────────────────────────────────────────────
  ('50000', 'México', 'Toluca',         'Toluca de Lerdo',    19.2826, -99.6557),
  ('50130', 'México', 'Toluca',         'Toluca Sur',         19.2700, -99.6800),
  ('53000', 'México', 'Naucalpan',      'Naucalpan Centro',   19.4756, -99.2380),
  ('53100', 'México', 'Naucalpan',      'Satélite',           19.5097, -99.2360),
  ('54000', 'México', 'Tlalnepantla',   'Tlalnepantla Centro',19.5365, -99.1948),
  ('55000', 'México', 'Ecatepec',       'Ecatepec Centro',    19.6010, -99.0600),
  ('57000', 'México', 'Nezahualcóyotl', 'Neza Centro',        19.4169, -99.0145),
  ('52900', 'México', 'Atizapán',       'Cd. Adolfo López Mateos',19.5710, -99.2540),
  ('54700', 'México', 'Cuautitlán Izcalli','Cuautitlán Izcalli',19.6500, -99.2200),
  ('54900', 'México', 'Cuautitlán',     'Cuautitlán',         19.6680, -99.1790),
  ('56100', 'México', 'Texcoco',        'Texcoco',            19.5093, -98.8825),
  ('51900', 'México', 'Ixtapan Sal',    'Ixtapan',            18.8400, -99.6800),
  ('54050', 'México', 'Tlalnepantla',   'Tlalnepantla Sur',   19.5500, -99.2030),
  ('55700', 'México', 'Coacalco',       'Coacalco',           19.6300, -99.1100),
  ('56600', 'México', 'Chalco',         'Chalco',             19.2660, -98.8890),

  -- ── Guadalajara y Zona Metropolitana (10) ──────────────────────────────
  ('44100', 'Jalisco', 'Guadalajara',   'GDL Centro',         20.6736, -103.3440),
  ('44600', 'Jalisco', 'Guadalajara',   'GDL Americana',      20.6780, -103.3640),
  ('44680', 'Jalisco', 'Guadalajara',   'GDL Providencia',    20.7020, -103.3960),
  ('44150', 'Jalisco', 'Guadalajara',   'GDL Lafayette',      20.6850, -103.3680),
  ('45040', 'Jalisco', 'Zapopan',       'Zapopan Centro',     20.7235, -103.3850),
  ('45070', 'Jalisco', 'Zapopan',       'Plaza del Sol',      20.6577, -103.3920),
  ('45110', 'Jalisco', 'Zapopan',       'Andares',            20.7080, -103.4290),
  ('45601', 'Jalisco', 'Tlaquepaque',   'Tlaquepaque',        20.6410, -103.3110),
  ('45402', 'Jalisco', 'Tonalá',        'Tonalá',             20.6240, -103.2340),
  ('45550', 'Jalisco', 'Tlajomulco',    'Tlajomulco',         20.4730, -103.4470),

  -- ── Monterrey y Zona Metropolitana (10) ────────────────────────────────
  ('64000', 'Nuevo León', 'Monterrey',  'MTY Centro',         25.6866, -100.3161),
  ('64020', 'Nuevo León', 'Monterrey',  'MTY Mitras',         25.7100, -100.3450),
  ('64060', 'Nuevo León', 'Monterrey',  'MTY Cumbres',        25.7500, -100.4100),
  ('64720', 'Nuevo León', 'Monterrey',  'MTY Valle Oriente',  25.6470, -100.3610),
  ('66220', 'Nuevo León', 'San Pedro',  'San Pedro Garza',    25.6580, -100.4030),
  ('66269', 'Nuevo León', 'San Pedro',  'Del Valle',          25.6470, -100.4060),
  ('67100', 'Nuevo León', 'Guadalupe',  'Guadalupe',          25.6770, -100.2580),
  ('66600', 'Nuevo León', 'Apodaca',    'Apodaca',            25.7820, -100.1880),
  ('66350', 'Nuevo León', 'Sta. Catarina','Santa Catarina',   25.6750, -100.4720),
  ('67500', 'Nuevo León', 'Escobedo',   'Escobedo',           25.7950, -100.3120),

  -- ── Querétaro (5) ──────────────────────────────────────────────────────
  ('76000', 'Querétaro', 'Querétaro',   'Querétaro Centro',   20.5888, -100.3899),
  ('76090', 'Querétaro', 'Querétaro',   'El Refugio',         20.6230, -100.3500),
  ('76140', 'Querétaro', 'Querétaro',   'Jurica',             20.6630, -100.4480),
  ('76800', 'Querétaro', 'San Juan',    'San Juan del Río',   20.3870, -99.9970),
  ('76246', 'Querétaro', 'El Marqués',  'El Marqués',         20.6200, -100.3050),

  -- ── Puebla (5) ─────────────────────────────────────────────────────────
  ('72000', 'Puebla', 'Puebla',         'Puebla Centro',      19.0414, -98.2063),
  ('72160', 'Puebla', 'Puebla',         'Puebla Angelópolis', 19.0420, -98.2530),
  ('72534', 'Puebla', 'Puebla',         'San Manuel',         19.0250, -98.2090),
  ('72830', 'Puebla', 'San Andrés Cholula','San Andrés Cholula',19.0500, -98.3000),
  ('73160', 'Puebla', 'Tehuacán',       'Tehuacán',           18.4625, -97.3920),

  -- ── Veracruz / Golfo (5) ───────────────────────────────────────────────
  ('91700', 'Veracruz', 'Veracruz',     'Veracruz Centro',    19.1738, -96.1342),
  ('91020', 'Veracruz', 'Xalapa',       'Xalapa-Enríquez',    19.5438, -96.9102),
  ('94290', 'Veracruz', 'Boca del Río', 'Boca del Río',       19.1056, -96.1063),
  ('89000', 'Tamaulipas','Tampico',     'Tampico',            22.2331, -97.8614),
  ('86030', 'Tabasco',  'Villahermosa', 'Villahermosa',       17.9960, -92.9430),

  -- ── Bajío y Centro (8) ─────────────────────────────────────────────────
  ('37000', 'Guanajuato','León',        'León Centro',        21.1250, -101.6860),
  ('38010', 'Guanajuato','Celaya',      'Celaya',             20.5290, -100.8150),
  ('36000', 'Guanajuato','Guanajuato',  'Guanajuato Capital', 21.0190, -101.2570),
  ('36500', 'Guanajuato','Irapuato',    'Irapuato',           20.6770, -101.3500),
  ('20000', 'Aguascalientes','Aguascalientes','AGS Centro',   21.8853, -102.2916),
  ('78000', 'San Luis Potosí','SLP',    'SLP Centro',         22.1565, -100.9855),
  ('25000', 'Coahuila','Saltillo',      'Saltillo',           25.4232, -101.0053),
  ('27000', 'Coahuila','Torreón',       'Torreón',            25.5390, -103.4320),

  -- ── Sureste / Caribe (5) ───────────────────────────────────────────────
  ('97000', 'Yucatán', 'Mérida',        'Mérida Centro',      20.9670, -89.6237),
  ('77500', 'Q. Roo',  'Cancún',        'Cancún',             21.1619, -86.8515),
  ('77710', 'Q. Roo',  'Playa del Carmen','Playa del Carmen', 20.6296, -87.0739),
  ('77000', 'Q. Roo',  'Chetumal',      'Chetumal',           18.5036, -88.3055),
  ('29000', 'Chiapas', 'Tuxtla',        'Tuxtla Gutiérrez',   16.7569, -93.1292),

  -- ── Pacífico Sur (5) ───────────────────────────────────────────────────
  ('39300', 'Guerrero','Acapulco',      'Acapulco',           16.8531, -99.8237),
  ('68000', 'Oaxaca',  'Oaxaca',        'Oaxaca Centro',      17.0732, -96.7266),
  ('62000', 'Morelos', 'Cuernavaca',    'Cuernavaca',         18.9242, -99.2216),
  ('40880', 'Guerrero','Zihuatanejo',   'Zihuatanejo',        17.6445, -101.5559),
  ('60000', 'Michoacán','Uruapan',      'Uruapan',            19.4197, -102.0531),
  ('58000', 'Michoacán','Morelia',      'Morelia Centro',     19.7060, -101.1950),

  -- ── Norte (10) ─────────────────────────────────────────────────────────
  ('22000', 'Baja California','Tijuana','Tijuana Centro',     32.5149, -117.0382),
  ('22500', 'Baja California','Tijuana','Tijuana Otay',       32.5230, -116.9670),
  ('22800', 'Baja California','Ensenada','Ensenada',          31.8667, -116.5964),
  ('21000', 'Baja California','Mexicali','Mexicali',          32.6245, -115.4523),
  ('23000', 'B.C. Sur','La Paz',        'La Paz',             24.1426, -110.3128),
  ('32000', 'Chihuahua','Cd. Juárez',   'Cd. Juárez Centro',  31.6904, -106.4245),
  ('31000', 'Chihuahua','Chihuahua',    'Chihuahua Centro',   28.6353, -106.0889),
  ('83000', 'Sonora',   'Hermosillo',   'Hermosillo Centro',  29.0729, -110.9559),
  ('85000', 'Sonora',   'Cd. Obregón',  'Cd. Obregón',        27.4828, -109.9301),
  ('80000', 'Sinaloa',  'Culiacán',     'Culiacán Centro',    24.8092, -107.3940),
  ('82000', 'Sinaloa',  'Mazatlán',     'Mazatlán',           23.2494, -106.4111),

  -- ── Otros destinos comunes (4) ─────────────────────────────────────────
  ('63000', 'Nayarit',  'Tepic',        'Tepic',              21.5097, -104.8956),
  ('44890', 'Jalisco',  'Guadalajara',  'Aeropuerto GDL',     20.5230, -103.3110),
  ('11460', 'CDMX', 'Miguel Hidalgo',   'San Miguel Chapultepec',19.4180, -99.2030),
  ('15700', 'CDMX', 'Venustiano Carranza','Aeropuerto AICM',  19.4361, -99.0719)
ON CONFLICT (cp) DO NOTHING;

-- Verificación: deberías ver alrededor de 95+ filas (algunos CPs duplicados los descarta).
SELECT count(*) AS total_cps_sembrados FROM mx_postal_codes;
