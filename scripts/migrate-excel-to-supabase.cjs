/**
 * migrate-excel-to-supabase.cjs
 * Lee "Bitacora SCC 2025 (2).xlsx" y genera supabase-seed.sql
 * Uso: node scripts/migrate-excel-to-supabase.cjs
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const EXCEL_PATH  = path.join(__dirname, '../..', 'Bitacora SCC 2025 (2).xlsx');
const SEED_PATH   = path.join(__dirname, 'supabase-seed.sql');
const SKIP_SHEETS = ['SCC Facturación 2025'];

// ─── Mapeo nombre de hoja → código de cliente ─────────────────────────────────
const SHEET_TO_CODIGO = {
  'FITNESS FOR LIFE RIVIERA MAYA':   '200',
  'MERIDA - FITNESS FOR LIFE RIVIE': '090',
  'VERMONT YORK':                    'VY8',
  'WORLD DIAGNOSTIC':                'WD',
  'EPOSNOW':                         '600',
  'KST (SUPPLY CHAIN WORLDWIDE)':    'KST',
  'SEKO':                            'SK',
  'GNR':                             '070',
  'BASF':                            'BSF',
  'Kyndryl':                         'KYN',
  'ITWORKS':                         '500',
  'LA RED':                          'RED',
  'Lululemon':                       'LUL',
  'BURBERRY':                        'BB',
  'TOUGHBUILT':                      'TB',
  'RMC':                             '800',
  'MICROCOMPUTADORAS':               'MC',
  'ANTONIO ZAPATA':                  'AZ',
  'Principle Global':                'PG',
  'PANTANS':                         '700',
  'CASIQUE RUTA NORMAL':             '080',
  'AHT':                             'AHT',
  'Tequila Enemigo':                 '400',
  'IFIT':                            'IFT',
  'Target Consulting':               '071',
};

// ─── Mapeo estado Excel → enum TypeScript ─────────────────────────────────────
function mapEstado(raw) {
  if (!raw) return 'pendiente';
  const s = String(raw).toLowerCase().trim();
  if (s === 'cerrada')    return 'cerrada';
  if (s === 'en proceso') return 'en_proceso';
  if (s === 'pendiente')  return 'pendiente';
  if (s === 'cancelada')  return 'cancelada';
  return 'pendiente';
}

// ─── Mapeo tipo embarque Excel → enum TypeScript ──────────────────────────────
function mapTipo(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove accents
  if (s.includes('cross')) return 'cross_dock';
  if (s.includes('almac')) return 'actividad_almacen';
  if (s.includes('maniob')) return 'maniobra';
  if (s.includes('flete')) return 'flete';
  if (s.includes('recolec') && s.includes('entrega')) return 'recoleccion_entrega';
  if (s.includes('recolec')) return 'recoleccion';
  if (s.includes('entrada')) return 'entrada';
  if (s.includes('salida'))  return 'salida';
  return 'salida'; // default
}

// ─── Helpers SQL ──────────────────────────────────────────────────────────────
function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    const d = new Date(val);
    if (!isNaN(d)) return d.toISOString().slice(0,10);
    return null;
  }
  if (typeof val === 'number' && val > 0) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().slice(0,10);
  }
  return null;
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val).trim();
  if (s === '' || /^n\/a$/i.test(s) || /^null$/i.test(s)) return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}

function bool(val) {
  return (val === true || val === 1) ? 'TRUE' : 'FALSE';
}

function num(val) {
  if (val === null || val === undefined) return 'NULL';
  const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 'NULL' : String(n);
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── Lectura Excel ────────────────────────────────────────────────────────────
console.log('Leyendo Excel...');
const wb = XLSX.readFile(EXCEL_PATH);
const clientSheets = wb.SheetNames.filter(n => !SKIP_SHEETS.includes(n));

const clients    = [];
const operations = [];

clientSheets.forEach(sheetName => {
  const clientId     = uuidv4();
  const clientCodigo = SHEET_TO_CODIGO[sheetName] ?? sheetName.slice(0,3).toUpperCase();
  clients.push({ id: clientId, name: sheetName });

  const ws      = wb.Sheets[sheetName];
  const data    = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const headers = data[0] || [];
  const rows    = data.slice(1);

  // Mapa de header → índice
  const h = {};
  headers.forEach((hdr, i) => {
    if (hdr) h[String(hdr).replace(/\r\n/g,' ').trim()] = i;
  });
  const get = (...keys) => {
    for (const k of keys.flat()) {
      const idx = h[k];
      if (idx !== undefined && rows !== null) {
        // will be used per-row
      }
    }
    return keys; // return key list for closure
  };

  const isZapata  = sheetName === 'ANTONIO ZAPATA';
  const isEnemigo = sheetName === 'Tequila Enemigo';

  rows.forEach(row => {
    const ref = row[0];
    if (!ref || String(ref).trim() === '') return;

    const g = (...keys) => {
      for (const k of keys.flat()) {
        const idx = h[k];
        if (idx !== undefined && row[idx] !== null && row[idx] !== undefined) return row[idx];
      }
      return null;
    };

    const referencia     = String(g('Referencia','Columna 1','Referencia ') ?? '').trim() || null;
    const fecha          = excelDateToISO(g(isZapata ? 'Fecha de carga' : 'Fecha'));
    const fecha_entrega  = isZapata ? excelDateToISO(g('Fecha de entrega')) : null;
    const estadoRaw      = g('Estado operación');
    const estado         = mapEstado(estadoRaw);
    const tipoRaw        = g('Tipo de Embarque/Actividad');
    const tipo_operacion = mapTipo(tipoRaw);
    const asunto_cliente = g('Asunto Cliente (Correo)');
    const ref_cliente    = String(g('Ref Cliente (PT, OR)', 'Ref Cliente (PT, OC)') ?? '').trim() || null;
    const incluye_transporte = g('¿Incluye Transporte?');
    const rc_transporte  = g('RC de Transporte (Rendición de cuenta)', 'RC de Transporte\r\n(Rendición de cuenta)');
    const costo_proveedor   = g('Costo Proveedor');
    const factura_proveedor = g('Factura Proveedor');
    const proveedor         = g('Proveedor');
    const pod               = g('POD (Prueba de entrega)', 'POD\r\n(Prueba de entrega)');
    const evidencias        = g('Evidencias  (Foto + Nota de salida)', 'Evidencias \r\n(Foto + Nota de salida)');
    const proforma          = g('Proforma');
    const comentarios       = g('Comentarios');
    const costo_cliente     = g('COSTO CLIENTE', 'Venta Cliente');
    const folio_factura     = g('Folio de factura');
    const factura_supply    = g('FACTURA SUPPLY', 'Factura Supply', 'FACTURA SCC', 'Factura SCC', 'FACTURA ', 'Factura');
    const fecha_envio_rc    = excelDateToISO(g('Fecha de envío de Rc y solicitud de factura'));
    const fecha_envio_factura = excelDateToISO(g('Fecha de envío de factura'));
    // Tequila Enemigo extras
    const almacen_origen    = isEnemigo ? g('Almacén Origen') : null;
    const cliente_destino   = isEnemigo ? g('Cliente Destino') : null;
    const sku               = isEnemigo ? g('SKU') : null;
    const cantidad          = isEnemigo ? g('Cantidad') : null;
    // Zapata
    const total_pallets     = isZapata  ? g('Total de pallets') : null;

    operations.push({
      id: uuidv4(),
      client_id:          clientId,
      referencia,
      cliente_nombre:     sheetName,
      cliente_codigo:     clientCodigo,
      fecha,
      estado,
      asunto_cliente,
      ref_cliente,
      tipo_operacion,
      incluye_transporte,
      rc_transporte,
      costo_proveedor,
      factura_proveedor,
      proveedor,
      pod,
      evidencias,
      proforma,
      comentarios,
      costo_cliente,
      factura_supply,
      folio_factura,
      fecha_envio_rc,
      fecha_envio_factura,
      fecha_entrega,
      almacen_origen,
      cliente_destino,
      sku,
      cantidad,
      total_pallets,
    });
  });
});

console.log(`Clientes: ${clients.length}`);
console.log(`Operaciones: ${operations.length}`);

// ─── Generar Seed SQL ─────────────────────────────────────────────────────────
const lines = [];
lines.push('-- ============================================================');
lines.push('-- SEED: CRM Supply Chain México — Bitacora SCC 2025 (2).xlsx');
lines.push(`-- ${clients.length} clientes | ${operations.length} operaciones`);
lines.push('-- ============================================================');
lines.push('');

// Clientes
lines.push('INSERT INTO clients (id, name) VALUES');
lines.push(clients.map(c => `  ('${c.id}', ${esc(c.name)})`).join(',\n') + ';');
lines.push('');

// Operaciones en batches de 100
const BATCH = 100;
for (let i = 0; i < operations.length; i += BATCH) {
  const batch = operations.slice(i, i + BATCH);
  lines.push('INSERT INTO operations (');
  lines.push('  id, client_id, referencia, cliente_nombre, cliente_codigo,');
  lines.push('  fecha, estado, asunto_cliente, ref_cliente, tipo_operacion,');
  lines.push('  incluye_transporte, rc_transporte, costo_proveedor,');
  lines.push('  factura_proveedor, proveedor, pod, evidencias, proforma,');
  lines.push('  comentarios, costo_cliente, factura_supply, folio_factura,');
  lines.push('  fecha_envio_rc, fecha_envio_factura, fecha_entrega,');
  lines.push('  almacen_origen, cliente_destino, sku, cantidad, total_pallets');
  lines.push(') VALUES');

  const vals = batch.map(op => {
    const d = (v) => v ? `'${v}'` : 'NULL';
    const int = (v) => {
      const n = parseInt(v);
      return !isNaN(n) ? String(n) : 'NULL';
    };
    return (
      `  ('${op.id}', '${op.client_id}', ${esc(op.referencia)}, ` +
      `${esc(op.cliente_nombre)}, ${esc(op.cliente_codigo)}, ` +
      `${d(op.fecha)}, ${esc(op.estado)}, ${esc(op.asunto_cliente)}, ` +
      `${esc(op.ref_cliente)}, ${esc(op.tipo_operacion)}, ` +
      `${bool(op.incluye_transporte)}, ${bool(op.rc_transporte)}, ` +
      `${num(op.costo_proveedor)}, ${esc(op.factura_proveedor)}, ` +
      `${esc(op.proveedor)}, ${bool(op.pod)}, ${bool(op.evidencias)}, ` +
      `${bool(op.proforma)}, ${esc(op.comentarios)}, ${num(op.costo_cliente)}, ` +
      `${esc(op.factura_supply)}, ${esc(op.folio_factura)}, ` +
      `${d(op.fecha_envio_rc)}, ${d(op.fecha_envio_factura)}, ${d(op.fecha_entrega)}, ` +
      `${esc(op.almacen_origen)}, ${esc(op.cliente_destino)}, ` +
      `${esc(op.sku)}, ${int(op.cantidad)}, ${int(op.total_pallets)})`
    );
  });

  lines.push(vals.join(',\n') + ';');
  lines.push('');
}

fs.writeFileSync(SEED_PATH, lines.join('\n'), 'utf8');
console.log('\n✅ Generado:', SEED_PATH);
console.log('\n📋 Pasos en Supabase:');
console.log('  1. SQL Editor → ejecutar scripts/supabase-schema.sql');
console.log('  2. SQL Editor → ejecutar scripts/supabase-seed.sql');
