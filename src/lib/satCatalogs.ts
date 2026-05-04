/*
  SAT catalogs — subset needed for CFDI 4.0 generation.
  Only the entries relevant for a 3PL warehouse operation.
  Reference: http://omawww.sat.gob.mx/tramitesyservicios/Paginas/anexo_20.htm
*/

/* ─── Régimen Fiscal (C_RegimenFiscal) ─── */
export const REGIMENES_FISCAL = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza',
} as const

export type RegimenFiscal = keyof typeof REGIMENES_FISCAL

/* ─── Uso CFDI (C_UsoCFDI) ─── */
export const USOS_CFDI = {
  'G01': 'Adquisición de mercancías',
  'G02': 'Devoluciones, descuentos o bonificaciones',
  'G03': 'Gastos en general',
  'I01': 'Construcciones',
  'I02': 'Mobiliario y equipo de oficina por inversiones',
  'I03': 'Equipo de transporte',
  'I04': 'Equipo de computo y accesorios',
  'I05': 'Dados, troqueles, moldes, matrices y herramental',
  'I06': 'Comunicaciones telefónicas',
  'I07': 'Comunicaciones satelitales',
  'I08': 'Otra maquinaria y equipo',
  'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
  'D02': 'Gastos médicos por incapacidad o discapacidad',
  'D03': 'Gastos funerales',
  'D04': 'Donativos',
  'D05': 'Intereses reales efectivamente pagados por créditos hipotecarios',
  'D06': 'Aportaciones voluntarias al SAR',
  'D07': 'Primas por seguros de gastos médicos',
  'D08': 'Gastos de transportación escolar obligatoria',
  'D09': 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones',
  'D10': 'Pagos por servicios educativos (colegiaturas)',
  'S01': 'Sin efectos fiscales',
  'CP01': 'Pagos',
  'CN01': 'Nómina',
} as const

export type UsoCFDI = keyof typeof USOS_CFDI

/* ─── Forma de Pago (C_FormaPago) ─── */
export const FORMAS_PAGO = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica de fondos',
  '04': 'Tarjeta de crédito',
  '28': 'Tarjeta de débito',
  '99': 'Por definir',
} as const

export type FormaPago = keyof typeof FORMAS_PAGO

/* ─── Método de Pago (C_MetodoPago) ─── */
export const METODOS_PAGO = {
  'PUE': 'Pago en una sola exhibición',
  'PPD': 'Pago en parcialidades o diferido',
} as const

export type MetodoPago = keyof typeof METODOS_PAGO

/* ─── Clave Unidad (C_ClaveUnidad) — subset for 3PL ─── */
export const CLAVES_UNIDAD = {
  'E48': 'Unidad de servicio',
  'H87': 'Pieza',
  'HUR': 'Hora',
  'KGM': 'Kilogramo',
  'KMT': 'Kilómetro',
  'MTK': 'Metro cuadrado',
  'MTR': 'Metro',
  'ACT': 'Actividad',
  'MON': 'Mes',
  'DAY': 'Día',
} as const

/* ─── Clave Producto/Servicio (C_ClaveProdServ) — 3PL subset ─── */
export const CLAVES_PROD_SERV = {
  '80121601': 'Servicios de almacenamiento',
  '78101903': 'Servicios de transporte de carga por carretera',
  '78102200': 'Manejo de carga y materiales (maniobras)',
  '81121500': 'Otros servicios profesionales',
  '78111800': 'Logística de transporte (flete)',
  '80161500': 'Servicios de apoyo a la gestión empresarial',
} as const

/* ─── Helper: map tariff category → SAT ClaveProdServ ─── */
export function getSatProductCode(categoria: string): string {
  switch (categoria.toLowerCase()) {
    case 'almacenaje':     return '80121601'
    case 'transporte':     return '78101903'
    case 'maniobra':       return '78102200'
    case 'valor_agregado': return '81121500'
    default:               return '81121500'
  }
}

/* ─── Helper: map tariff unit → SAT ClaveUnidad ─── */
export function getSatUnitCode(unidad: string): string {
  switch (unidad.toUpperCase()) {
    case 'TARIMA':       return 'H87'
    case 'PIEZA':        return 'H87'
    case 'M2':           return 'MTK'
    case 'HORA':         return 'HUR'
    case 'KM':           return 'KMT'
    case 'KG':           return 'KGM'
    case 'VIAJE':        return 'E48'
    case 'SERVICIO':     return 'E48'
    case 'FIJO_MENSUAL': return 'MON'
    default:             return 'E48'
  }
}
