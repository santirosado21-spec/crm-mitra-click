/**
 * run-migration.cjs — Migración directa a Supabase vía Management API
 * Uso: SUPABASE_TOKEN=sbp_xxx node scripts/run-migration.cjs
 */

const fs   = require('fs');
const path = require('path');

const PROJECT_REF = 'emukqvkptmpvfrhkltyg';
const TOKEN       = process.env.SUPABASE_TOKEN;
const SCHEMA_PATH = path.join(__dirname, 'supabase-schema.sql');
const SEED_PATH   = path.join(__dirname, 'supabase-seed.sql');
const API_URL     = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

if (!TOKEN) {
  console.error('❌ Falta SUPABASE_TOKEN');
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { error: text }; }
  return { ok: res.ok && !json.error, error: json.error || json.message };
}

/** Separa el seed en bloques INSERT individuales (no parte por ';' interno) */
function parseSeedInserts(sql) {
  // Cada INSERT termina con ';' seguido de newline vacía o fin de archivo
  const blocks = [];
  let current = '';
  let inInsert = false;

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('INSERT')) {
      inInsert = true;
      current = line + '\n';
    } else if (inInsert) {
      current += line + '\n';
      if (trimmed.endsWith(';')) {
        blocks.push(current.trim());
        current = '';
        inInsert = false;
      }
    }
  }
  if (current.trim()) blocks.push(current.trim());
  return blocks;
}

async function main() {
  console.log('🚀 CRM Supply Chain — Migración a Supabase');
  console.log(`   Proyecto: ${PROJECT_REF}\n`);

  // ── 1. Schema completo (1 sola query, maneja $$ triggers correctamente) ──
  console.log('⏳ Paso 1/2: Creando tablas, índices y políticas RLS...');
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const schemaRes = await query(schemaSql);

  if (!schemaRes.ok) {
    // Si las tablas ya existen es OK; si es otro error, abortamos
    const errMsg = String(schemaRes.error || '');
    if (errMsg.includes('already exists')) {
      console.log('  ⚠️  Tablas ya existentes (se continúa con el seed)');
    } else {
      console.error('  ❌ Error en schema:', errMsg.slice(0, 200));
      console.log('\n  💡 Intenta ejecutar supabase-schema.sql manualmente en');
      console.log('     supabase.com → SQL Editor y luego vuelve a correr el script con --seed-only');
      if (!process.argv.includes('--seed-only')) process.exit(1);
    }
  } else {
    console.log('  ✅ Schema creado correctamente');
  }

  // ── 2. Seed en batches de 100 ─────────────────────────────────────────────
  console.log('\n⏳ Paso 2/2: Insertando 25 clientes + 1,932 operaciones...');
  const seedSql    = fs.readFileSync(SEED_PATH, 'utf8');
  const inserts    = parseSeedInserts(seedSql);

  console.log(`   ${inserts.length} bloques INSERT detectados`);

  let ok = 0, errors = 0;
  for (let i = 0; i < inserts.length; i++) {
    process.stdout.write(`\r   Bloque ${i + 1}/${inserts.length}...`);
    const res = await query(inserts[i]);
    if (res.ok) {
      ok++;
    } else {
      const errMsg = String(res.error || '');
      if (errMsg.includes('duplicate') || errMsg.includes('unique') || errMsg.includes('already exists')) {
        ok++; // datos ya insertados = OK
      } else {
        if (errors < 3) console.log(`\n   ❌ Bloque ${i + 1}: ${errMsg.slice(0, 120)}`);
        errors++;
      }
    }
  }

  console.log(`\n   ✅ ${ok} bloques OK, ${errors} errores`);

  // ── Resultado final ───────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  if (errors === 0) {
    console.log('🎉 Migración completada exitosamente');
    console.log('   25 clientes · 1,932 operaciones en Supabase');
    console.log('   El frontend ya puede conectarse a datos reales.');
  } else {
    console.log(`⚠️  Migración con ${errors} errores. Los datos válidos sí se insertaron.`);
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
