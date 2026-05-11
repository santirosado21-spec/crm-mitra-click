# Supabase migrations — CRM Supply Chain MX

## Convención

Cada migration se nombra con timestamp prefix (`YYYYMMDDHHMMSS_descripcion.sql`) en
orden cronológico de creación. Esto permite que `supabase db push` las aplique en
el orden correcto y matchea la convención del Supabase CLI.

## Estado inicial (2026-05-11)

Estas 25 migraciones fueron consolidadas desde 25 archivos SQL sueltos que vivían
en la raíz del repo (`supabase_migration_*.sql`) y en `scripts/`. La fecha del
timestamp prefijo viene de `git log --diff-filter=A --follow` para cada archivo.

## ⚠️ Posible drift con producción

**Antes de ejecutar `supabase db push` por primera vez**, verifica si Supabase prod
ya tiene estas migraciones aplicadas (fuera del sistema de migrations). Si es así:

1. Conecta tu CLI: `supabase link --project-ref <ref>`
2. Compara estado: `supabase db diff` o consulta la tabla `supabase_migrations.schema_migrations`
3. Si hay drift, usa `supabase migration repair --status applied <version>` para
   marcar como aplicadas las migraciones que ya están en prod, **sin** ejecutarlas.
4. Una vez sincronizado, futuras migraciones se aplican normal con `supabase db push`.

**No ejecutes `supabase db push` ciegamente** — puede intentar re-aplicar todo y
romper datos.

## Archivos diagnóstico / fix one-shot

Archivos en `../_archive/` NO son migrations. Son scripts diagnóstico que se
ejecutaron una vez para arreglar problemas específicos en prod (admin roles,
data fix manual). Se conservan como referencia histórica. NO los re-ejecutes.

## Cómo agregar una migration nueva

```bash
# Generar timestamp + crear archivo
ts=$(date -u +%Y%m%d%H%M%S)
touch "supabase/migrations/${ts}_descripcion_corta.sql"

# Aplicar local (opcional, requiere supabase start)
supabase db reset

# Aplicar a prod
supabase db push
```
