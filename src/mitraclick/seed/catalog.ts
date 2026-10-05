// ── Catálogo demo ────────────────────────────────────────────────────────────
// Mitra Click: productos, marcas y precios de lista tomados del catálogo público
// de mitraclick.com (vía Dashboard V1). Mitra mayorista: catálogo industrial
// representativo. Vendedores y clientes son FICTICIOS: nunca usar nombres reales.

export interface RetailSeed {
  id: string
  name: string
  brand: string
  category: string
  price: number
  /** Peso de popularidad para el generador (1–10). */
  pop: number
}

export interface WholesaleSeed {
  id: string
  name: string
  brand: string
  category: string
  unit: string
  price: number
  pop: number
  /** Rango de cantidad por línea de pedido. */
  qty: [number, number]
}

export const RETAIL_PRODUCTS: RetailSeed[] = [
  { id: "P001", name: "Rotomartillo Truper 1/2\" 650 W con caja", brand: "Truper", category: "Rotomartillos y taladros", price: 1006, pop: 9 },
  { id: "P002", name: "Esmeriladora angular 650 W 4-1/2\" G650", brand: "Black+Decker", category: "Esmeriladoras", price: 618, pop: 10 },
  { id: "P003", name: "Taladro atornillador GSR 1000 Smart kit 11 pzas", brand: "Bosch", category: "Atornilladores", price: 1641, pop: 8 },
  { id: "P004", name: "Juego de llaves mezcladoras regadera cromo Riviera", brand: "Foset", category: "Plomería y mezcladoras", price: 594, pop: 5 },
  { id: "P005", name: "Taladro Matrix kit 6 en 1 multiherramienta 20 V", brand: "Black+Decker", category: "Sets y juegos", price: 5118, pop: 6 },
  { id: "P006", name: "Hidrolavadora de alta presión 1200 W BW13-B3", brand: "Black+Decker", category: "Hidrolavadoras", price: 2058, pop: 8 },
  { id: "P007", name: "Fuente de poder 4 cámaras CCTV PS12DC4C", brand: "Epcom", category: "Seguridad y CCTV", price: 299, pop: 3 },
  { id: "P008", name: "Soldadora inversora 130 A 110/220 V HKS140", brand: "Husky Power", category: "Soldadoras", price: 1662, pop: 7 },
  { id: "P009", name: "Soldadora inversora 130 A + escuadras HKS-140", brand: "Husky Power", category: "Soldadoras", price: 1496, pop: 6 },
  { id: "P010", name: "Sierra inglete 10\" telescópica guía láser HXMS15L", brand: "Hyumax", category: "Sierras de inglete", price: 4043, pop: 5 },
  { id: "P011", name: "Taladro rotomartillo 20 V + 2 baterías DCD778D2-B3", brand: "Dewalt", category: "Rotomartillos y taladros", price: 4948, pop: 9 },
  { id: "P012", name: "Rotomartillo taladro 1/2\" 500 W 3200 rpm M0801G", brand: "Makita", category: "Rotomartillos y taladros", price: 1112, pop: 10 },
  { id: "P013", name: "Pistola de pintura taller 0.9 L BDPH1200", brand: "Black+Decker", category: "Pistolas de pintura", price: 1834, pop: 4 },
  { id: "P014", name: "Pistola con accesorios + maletín 33000MPLUS", brand: "Goni", category: "Pistolas de pintura", price: 2544, pop: 3 },
  { id: "P015", name: "Rotomartillo inalámbrico 18 V 260722CT", brand: "Milwaukee", category: "Rotomartillos y taladros", price: 4274, pop: 6 },
  { id: "P016", name: "Set brocas y puntas X-Line 34 pzas madera/metal/concreto", brand: "Bosch", category: "Brocas y puntas", price: 228, pop: 10 },
  { id: "P017", name: "Equipo para pintar Airless 5/8 HP G7 tipo Graco", brand: "Goni", category: "Equipo para pintar", price: 9777, pop: 2 },
  { id: "P018", name: "Desmalezadora podadora eléctrica GL300-B3", brand: "Black+Decker", category: "Desbrozadoras y podadoras", price: 778, pop: 6 },
  { id: "P019", name: "Desbrozadora podadora 52 cc ST520D", brand: "Stallion", category: "Desbrozadoras y podadoras", price: 1846, pop: 5 },
  { id: "P020", name: "Cortadora de metales 14\" 2000 W 2414NB", brand: "Makita", category: "Cortadoras y sierras", price: 3983, pop: 6 },
  { id: "P021", name: "Compresor silencioso libre de aceite 2 HP 50 L médico", brand: "Goni", category: "Compresoras", price: 8449, pop: 3 },
  { id: "P022", name: "Compresor de banda 120 V 5.0 HP 190 L", brand: "Goni", category: "Compresoras", price: 17255, pop: 2 },
  { id: "P023", name: "Combo taladro rotomartillo + esmeriladora MTK0003BX4", brand: "Makita", category: "Sets y juegos", price: 2329, pop: 8 },
  { id: "P024", name: "Careta soldar electrónica ajustable HKC35", brand: "Husky Power", category: "Caretas y soldadura", price: 271, pop: 7 },
  { id: "P025", name: "Bolsa portaherramientas 13 bolsillos electricista", brand: "Toughbuilt", category: "Bolsas y organizadores", price: 639, pop: 5 },
  { id: "P026", name: "Autocle 3/8\"-1/4\" 37 piezas cromo negro 87-320", brand: "Stanley", category: "Autocles y dados", price: 871, pop: 8 },
  { id: "P027", name: "Atornillador + rotomartillo + 2 baterías CLX228", brand: "Makita", category: "Sets y juegos", price: 4299, pop: 7 },
  { id: "P028", name: "Cinta de empaque transparente 150 m", brand: "Pretul", category: "Cintas y adhesivos", price: 47, pop: 9 },
  { id: "P029", name: "Tornillo de banco 4\" tipo europeo hierro nodular", brand: "Truper", category: "Prensas y tornillos de banco", price: 841, pop: 4 },
  { id: "P030", name: "Terminales aisladas para cable kit 55 piezas", brand: "Volteck", category: "Material eléctrico", price: 65, pop: 7 },
  { id: "P031", name: "Tanque para pintura con manguera y pistola 10 L", brand: "Truper", category: "Equipo para pintar", price: 4703, pop: 2 },
  { id: "P032", name: "Taladro rotomartillo 1/2\" VVR 7.8 A 750 W DW505", brand: "Dewalt", category: "Rotomartillos y taladros", price: 3534, pop: 6 },
  { id: "P033", name: "Taladro rotomartillo SDS 800 W 3 modos D25260K", brand: "Dewalt", category: "Rotomartillos y taladros", price: 4456, pop: 5 },
  { id: "P034", name: "Taladro rotomartillo profesional 710 W HP1630", brand: "Makita", category: "Rotomartillos y taladros", price: 1703, pop: 9 },
  { id: "P035", name: "Taladro rotomartillo + llave impacto GSB 120-LI", brand: "Bosch", category: "Sets y juegos", price: 5034, pop: 4 },
  { id: "P036", name: "Taladro rotomartillo 1/2 + atornillador 18 V brushless", brand: "Makita", category: "Sets y juegos", price: 6191, pop: 4 },
  { id: "P037", name: "Taladro rotomartillo + esmeriladora HYK5000", brand: "Hyundai", category: "Sets y juegos", price: 1262, pop: 7 },
  { id: "P038", name: "Esmeriladora angular 4-1/2\" 850 W GA4534", brand: "Makita", category: "Esmeriladoras", price: 1240, pop: 8 },
  { id: "P039", name: "Sierra circular 7-1/4\" 1500 W con guía láser", brand: "Truper", category: "Cortadoras y sierras", price: 1450, pop: 7 },
  { id: "P040", name: "Sierra caladora 650 W con luz LED", brand: "Black+Decker", category: "Cortadoras y sierras", price: 985, pop: 6 },
  { id: "P041", name: "Compresor 25 L 2 HP libre de aceite", brand: "Stanley", category: "Compresoras", price: 4150, pop: 5 },
  { id: "P042", name: "Soldadora inversora 200 A digital ST200X", brand: "Stallion", category: "Soldadoras", price: 3280, pop: 4 },
  { id: "P043", name: "Hidrolavadora 1800 W 120 bar HYW180", brand: "Hyundai", category: "Hidrolavadoras", price: 3120, pop: 5 },
  { id: "P044", name: "Juego de desarmadores 6 piezas Comfort Grip", brand: "Stanley", category: "Herramienta manual", price: 312, pop: 10 },
  { id: "P045", name: "Martillo de uña curva 16 oz mango fibra", brand: "Truper", category: "Herramienta manual", price: 189, pop: 10 },
  { id: "P046", name: "Flexómetro Gripper 8 m contra impacto", brand: "Truper", category: "Medición y trazo", price: 145, pop: 10 },
  { id: "P047", name: "Nivel láser autonivelante 15 m con tripié", brand: "Bosch", category: "Medición y trazo", price: 2890, pop: 4 },
  { id: "P048", name: "Escalera de tijera aluminio 6 escalones tipo II", brand: "Truper", category: "Escaleras y andamios", price: 1980, pop: 5 },
  { id: "P049", name: "Lámpara de trabajo LED recargable 20 W", brand: "Volteck", category: "Iluminación", price: 520, pop: 6 },
  { id: "P050", name: "Reflector LED 50 W exterior", brand: "Volteck", category: "Iluminación", price: 385, pop: 6 },
  { id: "P051", name: "Guantes de carnaza reforzados (par)", brand: "Pretul", category: "Equipo de protección", price: 78, pop: 9 },
  { id: "P052", name: "Lentes de seguridad antiempañantes", brand: "Truper", category: "Equipo de protección", price: 95, pop: 8 },
  { id: "P053", name: "Kit videovigilancia 4 cámaras 1080p + DVR", brand: "Epcom", category: "Seguridad y CCTV", price: 4890, pop: 3 },
  { id: "P054", name: "Tijeras para podar bypass 8\"", brand: "Pretul", category: "Jardinería", price: 165, pop: 6 },
  { id: "P055", name: "Manguera reforzada 3/4\" 15 m con conexiones", brand: "Pretul", category: "Jardinería", price: 298, pop: 6 },
  { id: "P056", name: "Atornillador inalámbrico 12 V 2 baterías BCD701", brand: "Black+Decker", category: "Atornilladores", price: 1580, pop: 8 },
  { id: "P057", name: "Llave de impacto 1/2\" 18 V brushless M18", brand: "Milwaukee", category: "Atornilladores", price: 6840, pop: 3 },
  { id: "P058", name: "Cinta delimitadora precaución 200 m", brand: "Pretul", category: "Cintas y adhesivos", price: 112, pop: 5 },
  { id: "P059", name: "Organizador plástico 16 compartimentos", brand: "Toughbuilt", category: "Bolsas y organizadores", price: 425, pop: 5 },
  { id: "P060", name: "Prensa de tornillo tipo C 6\"", brand: "Truper", category: "Prensas y tornillos de banco", price: 310, pop: 5 },
]

export const WHOLESALE_PRODUCTS: WholesaleSeed[] = [
  { id: 'W001', name: 'Varilla corrugada 3/8" tramo 12 m', brand: 'DeAcero', category: 'Acero y perfiles', unit: 'tramo', price: 185, pop: 10, qty: [80, 320] },
  { id: 'W002', name: 'Ángulo de acero 1-1/2" x 1/8" tramo 6 m', brand: 'Ternium', category: 'Acero y perfiles', unit: 'tramo', price: 420, pop: 7, qty: [20, 90] },
  { id: 'W003', name: 'PTR 2" x 2" calibre 14 tramo 6 m', brand: 'Ternium', category: 'Acero y perfiles', unit: 'tramo', price: 690, pop: 8, qty: [15, 70] },
  { id: 'W004', name: 'Lámina galvanizada calibre 26 (3.05 m)', brand: 'Ternium', category: 'Acero y perfiles', unit: 'hoja', price: 520, pop: 6, qty: [20, 120] },
  { id: 'W005', name: 'Placa de acero A36 1/4" hoja 4 x 8', brand: 'DeAcero', category: 'Acero y perfiles', unit: 'hoja', price: 6800, pop: 2, qty: [2, 8] },
  { id: 'W006', name: 'Viga IPR 6" x 4" (metro lineal)', brand: 'DeAcero', category: 'Acero y perfiles', unit: 'metro', price: 980, pop: 2, qty: [12, 48] },
  { id: 'W007', name: 'Tubo PVC hidráulico 2" tramo 6 m', brand: 'Tuboplus', category: 'Tubería y conexiones', unit: 'tramo', price: 310, pop: 7, qty: [20, 100] },
  { id: 'W008', name: 'Tubo galvanizado 1" cédula 40 tramo 6 m', brand: 'Tuboplus', category: 'Tubería y conexiones', unit: 'tramo', price: 890, pop: 5, qty: [10, 50] },
  { id: 'W009', name: 'Codo 90° acero soldable 2" cédula 40', brand: 'Urrea', category: 'Tubería y conexiones', unit: 'pieza', price: 85, pop: 6, qty: [40, 200] },
  { id: 'W010', name: 'Cable THW-LS calibre 12 rollo 100 m', brand: 'Condumex', category: 'Material eléctrico', unit: 'rollo', price: 1450, pop: 9, qty: [8, 40] },
  { id: 'W011', name: 'Cable THW-LS calibre 10 rollo 100 m', brand: 'Condumex', category: 'Material eléctrico', unit: 'rollo', price: 2150, pop: 6, qty: [5, 25] },
  { id: 'W012', name: 'Interruptor termomagnético 3 polos 50 A', brand: 'Square D', category: 'Material eléctrico', unit: 'pieza', price: 1890, pop: 4, qty: [4, 20] },
  { id: 'W013', name: 'Centro de carga 12 polos con puerta', brand: 'Square D', category: 'Material eléctrico', unit: 'pieza', price: 2450, pop: 3, qty: [2, 12] },
  { id: 'W014', name: 'Tubo conduit galvanizado pared gruesa 3/4"', brand: 'Condumex', category: 'Material eléctrico', unit: 'tramo', price: 260, pop: 6, qty: [30, 150] },
  { id: 'W015', name: 'Electrodo 6013 1/8" caja 20 kg', brand: 'Infra', category: 'Soldadura y consumibles', unit: 'caja', price: 1690, pop: 8, qty: [4, 30] },
  { id: 'W016', name: 'Microalambre ER70S-6 0.035" rollo 15 kg', brand: 'Infra', category: 'Soldadura y consumibles', unit: 'rollo', price: 1250, pop: 5, qty: [4, 24] },
  { id: 'W017', name: 'Disco de corte metal 7" caja 25 piezas', brand: 'Fiero', category: 'Soldadura y consumibles', unit: 'caja', price: 875, pop: 8, qty: [5, 40] },
  { id: 'W018', name: 'Disco de desbaste 4-1/2" caja 25 piezas', brand: 'Fiero', category: 'Soldadura y consumibles', unit: 'caja', price: 620, pop: 6, qty: [5, 30] },
  { id: 'W019', name: 'Tornillo hexagonal grado 5 1/2" x 2" caja 100', brand: 'Urrea', category: 'Tornillería y fijación', unit: 'caja', price: 540, pop: 6, qty: [5, 40] },
  { id: 'W020', name: 'Ancla expansiva 3/8" caja 50', brand: 'Fiero', category: 'Tornillería y fijación', unit: 'caja', price: 410, pop: 5, qty: [5, 30] },
  { id: 'W021', name: 'Casco de seguridad industrial clase E', brand: '3M', category: 'Equipo de protección', unit: 'pieza', price: 145, pop: 6, qty: [20, 120] },
  { id: 'W022', name: 'Bota de seguridad dieléctrica (par)', brand: 'Truper', category: 'Equipo de protección', unit: 'par', price: 890, pop: 4, qty: [10, 60] },
  { id: 'W023', name: 'Arnés de seguridad cuerpo completo', brand: '3M', category: 'Equipo de protección', unit: 'pieza', price: 1350, pop: 3, qty: [4, 25] },
  { id: 'W024', name: 'Primario anticorrosivo cubeta 19 L', brand: 'Comex', category: 'Pinturas y recubrimientos', unit: 'cubeta', price: 1850, pop: 5, qty: [4, 30] },
  { id: 'W025', name: 'Esmalte industrial cubeta 19 L', brand: 'Comex', category: 'Pinturas y recubrimientos', unit: 'cubeta', price: 2350, pop: 4, qty: [4, 24] },
  { id: 'W026', name: 'Impermeabilizante acrílico 5 años cubeta 19 L', brand: 'Fester', category: 'Pinturas y recubrimientos', unit: 'cubeta', price: 1650, pop: 4, qty: [6, 40] },
  { id: 'W027', name: 'Esmeriladora angular 7" 2200 W', brand: 'Makita', category: 'Herramienta eléctrica', unit: 'pieza', price: 3450, pop: 3, qty: [2, 12] },
  { id: 'W028', name: 'Rotomartillo SDS-max 1500 W', brand: 'Bosch', category: 'Herramienta eléctrica', unit: 'pieza', price: 9800, pop: 1, qty: [1, 4] },
  { id: 'W029', name: 'Cemento gris CPC 30R bulto 50 kg', brand: 'Cemex', category: 'Cemento y agregados', unit: 'bulto', price: 235, pop: 9, qty: [60, 400] },
  { id: 'W030', name: 'Mortero bulto 50 kg', brand: 'Cemex', category: 'Cemento y agregados', unit: 'bulto', price: 165, pop: 6, qty: [40, 250] },
]

/** Perfil demo de cada vendedor: `weight` = fuerza comercial relativa, `stoppedDaysAgo` = días sin vender. */
export interface RepSeed {
  id: string
  name: string
  zone: string
  monthlyQuota: number
  weight: number
  stoppedDaysAgo?: number
}

export const REPS: RepSeed[] = [
  { id: 'rep-1', name: 'Ricardo Castillo', zone: 'CDMX Norte', monthlyQuota: 650_000, weight: 1.35 },
  { id: 'rep-2', name: 'Mónica Espinosa', zone: 'Estado de México', monthlyQuota: 590_000, weight: 1.1 },
  { id: 'rep-3', name: 'Jorge Ibarra', zone: 'CDMX Sur', monthlyQuota: 550_000, weight: 1 },
  { id: 'rep-4', name: 'Lucía Herrera', zone: 'Querétaro', monthlyQuota: 530_000, weight: 0.95 },
  { id: 'rep-5', name: 'Arturo Burgos', zone: 'Puebla', monthlyQuota: 465_000, weight: 0.62 },
  { id: 'rep-6', name: 'Daniela Rosas', zone: 'Hidalgo', monthlyQuota: 460_000, weight: 0.55 },
  { id: 'rep-7', name: 'Fernando Salgado', zone: 'Toluca', monthlyQuota: 520_000, weight: 0.8, stoppedDaysAgo: 12 },
  { id: 'rep-8', name: 'Paola Medina', zone: 'Cuentas clave industriales', monthlyQuota: 630_000, weight: 1.2 },
]

export const WHOLESALE_CLIENT_NAMES = [
  'Constructora Vallejo Industrial', 'Grupo Edificador Anáhuac', 'Metalmecánica Azcapotzalco',
  'Estructuras Tlalnepantla', 'Instalaciones Eléctricas Lindavista', 'Desarrollos Satélite',
  'Taller de Soldadura Naucalpan', 'Ferretería Mayorista Ecatepec', 'Obras Civiles Iztapalapa',
  'Mantenimiento Industrial Vallejo', 'Constructora Coyoacán', 'Herrería Tláhuac',
  'Industrias del Bajío Querétaro', 'Montajes Eléctricos El Marqués', 'Pailería San Juan del Río',
  'Distribuidora Ferretera Puebla', 'Construcciones Cholula', 'Maquinados Atlixco',
  'Constructora Pachuca Centro', 'Refacciones Industriales Tulancingo', 'Obras Hidráulicas Tizayuca',
  'Aceros y Estructuras Lerma', 'Manufacturas Toluca Norte', 'Instalaciones Metepec',
  'Planta Automotriz Proveedor Tier 2', 'Envases Industriales del Centro', 'Alimentos Procesados Cuautitlán',
  'Logística y Naves Tepotzotlán', 'Farmacéutica Planta Xochimilco', 'Mantenimiento Hospitalario Sur',
]

export const RETAIL_CHANNELS = ['Google', 'Redes sociales', 'Directo', 'Email', 'Referido'] as const
export const RETAIL_CHANNEL_WEIGHTS = [45, 22, 18, 8, 7]
