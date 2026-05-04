/**
 * Generate locations.json from "Lista de ubicaciones CEDIS 1.xlsx"
 * This is consumed by the embedded Layout CEDIS Lerma HTML (via fetch data/locations.json)
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'Lista de ubicaciones CEDIS 1.xlsx');
const OUT = path.join(__dirname, '..', 'public', 'cedis-layout', 'data', 'locations.json');

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const wb = XLSX.read(fs.readFileSync(SRC));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const COL = { pasillo: 14, nivel: 15, fila: 16, ubicacion: 17, estatus: 18, tipo: 19, width: 20, length: 21, height: 22, maxWeight: 23, minQuantity: 24 };

const seen = new Set();
const locations = [];

for (let i = 4; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;
  const ubicacion = typeof r[COL.ubicacion] === 'string' ? r[COL.ubicacion].trim() : null;
  if (!ubicacion || seen.has(ubicacion)) continue;
  seen.add(ubicacion);

  locations.push({
    ubicacion,
    pasillo:  String(r[COL.pasillo] ?? '').trim(),
    nivel:    r[COL.nivel] ?? null,
    fila:     r[COL.fila] ?? null,
    tipo:     String(r[COL.tipo] ?? 'Storage location').trim(),
    estatus:  String(r[COL.estatus] ?? 'Activa').trim(),
    width:    r[COL.width] ?? null,
    length:   r[COL.length] ?? null,
    height:   r[COL.height] ?? null,
    maxWeight: r[COL.maxWeight] ?? null,
    minQuantity: r[COL.minQuantity] ?? null,
  });
}

fs.writeFileSync(OUT, JSON.stringify(locations, null, 2));
console.log(`✓ ${locations.length} locations → ${OUT}`);
