# Supabase migrations — CRM Supply Chain MX

## Convención

Cada migration se nombra con timestamp prefix (`YYYYMMDDHHMMSS_descripcion.sql`) en
orden cronológico de creación. Esto permite que `supabase db push` las aplique en
el orden correcto y matchea la convención del Supabase CLI.

## Workflow diario (después del setup inicial)

```bash
# Ver qué migrations están aplicadas vs pendientes
npm run db:status

# Aplicar las pendientes a prod
npm run db:push

# Ver diferencias entre schema local y remoto
npm run db:diff
```

Crear nueva migration:

```bash
ts=$(date -u +%Y%m%d%H%M%S)
touch "supabase/migrations/${ts}_mi_cambio.sql"
# editar el SQL...
npm run db:push
```

## Setup inicial (una sola vez por máquina)

```bash
# CLI ya está como devDep; sólo asegúrate de tener las dependencias
npm install

# Login (abre browser) — si no estás logueado
./node_modules/.bin/supabase login

# Linkear el proyecto (una sola vez por carpeta)
./node_modules/.bin/supabase link --project-ref uifrgmiqpkbgyvzbcldn
```

## ⚠️ Drift inicial (importante)

Antes de mayo 2026, las migrations se aplicaban directo en el SQL Editor del
Dashboard, no por el CLI. Eso significa que muchas migrations en este folder
**ya están aplicadas en prod** pero el CLI no lo sabe.

La primera vez que corras `npm run db:status` vas a ver migrations marcadas
como "remote only" o "local only". Para sincronizar:

```bash
# Marca todas las migrations existentes como ya-aplicadas (no las re-ejecuta)
./node_modules/.bin/supabase migration repair --status applied \
  20250101000001 20250101000002 20250101000003 \
  20260301000001 20260301000002 20260301000003 \
  20260315000001 20260315000002 20260315000003 \
  20260315000004 20260320000001 20260320000002 \
  20260401000001 20260401000002 20260401000003 \
  20260415000001 20260420000001 20260420000002 \
  20260420000003 20260420000004 20260425000001 \
  20260425000002 20260425000003 20260430000001 \
  20260501000001 20260508000001 20260508000002 \
  20260508000003 20260512170000 20260513000001
```

Estas son las versiones (timestamp prefix) de cada migration en `migrations/`.
Solo corre el repair una vez, luego `db:push` toma el control normalmente.

## Estado actual (post-cleanup mayo 2026)

Estas 27 migraciones fueron consolidadas desde 25 archivos SQL sueltos que vivían
en la raíz del repo (`supabase_migration_*.sql`) y en `scripts/`. La fecha del
timestamp prefijo viene de `git log --diff-filter=A --follow` para cada archivo.

## Archivos diagnóstico / fix one-shot

Archivos en `../_archive/` NO son migrations. Son scripts diagnóstico que se
ejecutaron una vez para arreglar problemas específicos en prod (admin roles,
data fix manual). Se conservan como referencia histórica. NO los re-ejecutes.
