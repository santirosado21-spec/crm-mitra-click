/**
 * import-warehouse-locations.cjs
 * Reads "Lista de ubicaciones CEDIS 1.xlsx" and generates warehouse_locations_seed.sql
 * Run: node scripts/import-warehouse-locations.cjs
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', '..', 'Lista de ubicaciones CEDIS 1.xlsx');
const SQL_PATH   = path.join(__dirname, 'warehouse-locations-seed.sql');

if (!fs.existsSync(EXCEL_PATH)) {
  console.error('File not found:', EXCEL_PATH);
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(EXCEL_PATH));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Column layout in Excel (verified):
// N=13 INICIALES, O=14 PASILLO, P=15 NIVEL, Q=16 FILA, R=17 Ubicación,
// S=18 Estatus, T=19 Tipo de ubicación, U=20 Width, V=21 Length,
// W=22 Height, X=23 Max Weight, Y=24 Min Quantity
const COL = {
  iniciales: 13, pasillo: 14, nivel: 15, fila: 16, ubicacion: 17,
  estatus: 18, tipo: 19, width: 20, length: 21, height: 22,
  maxWeight: 23, minQuantity: 24,
};

// SQL string escaping
function esc(v) {
  if (v == null || v === '') return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function num(v) {
  if (v == null || v === '') return 'NULL';
  const n = Number(v);
  return isNaN(n) ? 'NULL' : String(n);
}

const header = rows[3]; // row 3 has the column names
console.log('Detected headers:', COL.ubicacion, '=', header[COL.ubicacion]);

const records = [];
const seen = new Set();

// Start at row 4 (index 4), row 3 is headers
for (let i = 4; i < rows.length; i++) {
  const r = rows[i];
  if (!r || r.length === 0) continue;

  const ubicacion = r[COL.ubicacion];
  if (!ubicacion || typeof ubicacion !== 'string') continue;

  const trimmed = ubicacion.trim();
  if (!trimmed) continue;
  if (seen.has(trimmed)) continue;
  seen.add(trimmed);

  records.push({
    ubicacion:  trimmed,
    pasillo:    String(r[COL.pasillo] ?? '').trim(),
    nivel:      r[COL.nivel] ?? null,
    fila:       String(r[COL.fila] ?? '').trim(),
    tipo:       String(r[COL.tipo] ?? '').trim() || 'Storage location',
    estatus:    String(r[COL.estatus] ?? 'Activa').trim() || 'Activa',
    width:      r[COL.width],
    length:     r[COL.length],
    height:     r[COL.height],
    maxWeight:  r[COL.maxWeight],
    minQuantity: r[COL.minQuantity],
  });
}

console.log('Unique locations:', records.length);

// Build SQL
const out = [];
out.push('-- warehouse-locations-seed.sql');
out.push('-- Auto-generated from "Lista de ubicaciones CEDIS 1.xlsx"');
out.push(`-- ${records.length} unique locations`);
out.push('');
out.push('-- Clear existing data');
out.push('DELETE FROM warehouse_locations;');
out.push('');
out.push('INSERT INTO warehouse_locations');
out.push('  (ubicacion, pasillo, nivel, fila, tipo, estatus, width, length, height, max_weight, min_quantity)');
out.push('VALUES');

// Chunk into batches of 500
const BATCH = 500;
for (let i = 0; i < records.length; i += BATCH) {
  const chunk = records.slice(i, i + BATCH);
  const lines = chunk.map(r =>
    `  (${esc(r.ubicacion)}, ${esc(r.pasillo)}, ${num(r.nivel)}, ${esc(r.fila)}, ${esc(r.tipo)}, ${esc(r.estatus)}, ${num(r.width)}, ${num(r.length)}, ${num(r.height)}, ${num(r.maxWeight)}, ${num(r.minQuantity)})`
  );
  out.push(lines.join(',\n') + (i + BATCH < records.length ? ',\n' : ';\n'));
  if (i + BATCH < records.length) {
    out.push('INSERT INTO warehouse_locations');
    out.push('  (ubicacion, pasillo, nivel, fila, tipo, estatus, width, length, height, max_weight, min_quantity)');
    out.push('VALUES');
  }
}

fs.writeFileSync(SQL_PATH, out.join('\n'));
console.log('✓ SQL written to:', SQL_PATH);
console.log('');
console.log('Sample records:');
records.slice(0, 3).forEach(r => console.log(' ', r));
console.log('');
console.log('Stats:');
const byTipo = {};
const byPasillo = {};
const byEstatus = {};
records.forEach(r => {
  byTipo[r.tipo] = (byTipo[r.tipo] || 0) + 1;
  byPasillo[r.pasillo] = (byPasillo[r.pasillo] || 0) + 1;
  byEstatus[r.estatus] = (byEstatus[r.estatus] || 0) + 1;
});
console.log('By tipo:', byTipo);
console.log('By pasillo:', byPasillo);
console.log('By estatus:', byEstatus);
