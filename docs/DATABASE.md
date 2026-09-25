# Base de datos: Supabase `mitraclick-intelligence`

- **Proyecto:** `drdaenkvtjjrtyjjxnrr` (organización de Santiago, región `us-east-2`, Postgres 17).
- **URL:** `https://drdaenkvtjjrtyjjxnrr.supabase.co`
- **Migraciones:** `supabase/migrations/`, aplicadas el 24-sep-2026 en este orden:

| Versión | Migración | Contenido |
|---|---|---|
| `20260925002418` | `mitraclick_core` | Modelo comercial normalizado |
| `20260925002436` | `mitraclick_access` | Usuarios, perfiles de agente, bitácora, RLS y permisos |
| `20260925002446` | `mitraclick_ingestion` | Capa de aterrizaje `raw` y bitácora de sincronización |
| `20260925002448` | `mitraclick_read_models` | Vista `sales_facts` |

Hoy la base está **vacía**: solo tiene los 3 perfiles de agente. La app sigue con
datos simulados hasta que se activa `VITE_DATA_SOURCE=supabase`.

## Tablas

```text
sales_reps ─┬─< rep_monthly_quotas
            ├─< clients ─┬─< wholesale_orders ─< wholesale_order_lines >─┐
            │            └─< wholesale_quotes                            │
            ├─< wholesale_orders                                         │
            └─< wholesale_quotes                                   products ─< inventory_levels
                                                                         │
retail_orders ─< retail_order_lines >────────────────────────────────────┘
business_goals · ecommerce_traffic_daily · sync_runs
app_users (→ auth.users) · agent_profiles · audit_log
raw.api_payloads (no expuesta)
```

| Tabla | Fuente | Llave de carga (upsert) |
|---|---|---|
| `sales_reps` | ERP | `(source, external_id)` |
| `rep_monthly_quotas` | ERP o manual | `(rep_id, month)`; `month` = día 1 del mes |
| `business_goals` | Manual | `(month, business_unit)` |
| `products` | ERP (mayorista) y Shopify (Mitra Click) | `(source, external_id)` |
| `inventory_levels` | ERP / Shopify | `(product_id, warehouse)`; la app suma todas las bodegas |
| `clients` | ERP | `(source, external_id)` |
| `wholesale_orders` | ERP | `(source, external_id)`; `external_id` = folio |
| `wholesale_order_lines` | ERP | `(order_id, line_number)` |
| `retail_orders` | Shopify | `(source, external_id)`; `external_id` = número de orden |
| `retail_order_lines` | Shopify | `(order_id, line_number)` |
| `wholesale_quotes` | ERP | `(source, external_id)` |
| `ecommerce_traffic_daily` | GA4 | `(source, day)` |

**Convenciones:**
- Dinero en `numeric(14,2)`.
- Fechas de negocio en `date`, en hora de Ciudad de México.
- Los pedidos `cancelado` se guardan, pero la app y `sales_facts` los excluyen.
- `source = 'demo'` queda reservado para datos de prueba: se borran con `delete … where source = 'demo'`.

## Seguridad (RLS)

| Rol | Puede |
|---|---|
| `anon` | Nada. |
| `authenticated` activo en `app_users` | Leer todos los datos comerciales, `sync_runs`, `agent_profiles` y su fila de `app_users`. Insertar en `audit_log` solo con su propio `user_id`. |
| `authenticated` sin registro o inactivo | Ve 0 filas. |
| `service_role` (integración del lado servidor) | Escribir todo, incluido `raw`. |

- En `audit_log`, `direccion` y `admin` leen todo; los demás, solo sus filas.
- Los schemas `raw` y `private` no son accesibles para `anon` ni `authenticated`.
- No hay funciones `SECURITY DEFINER`.
- Validado el 24-sep-2026 con pruebas revertidas: miembro, desconocido, inactivo, intento de escritura y suplantación en la bitácora.

## Cómo integrar una API

Aplica igual para el ERP, Shopify o GA4. La integración corre **del lado servidor**
(Supabase Edge Function, cron o un servicio) con la llave `service_role`:

1. **Abrir corrida:** `insert into sync_runs (source, entity, triggered_by) values ('erp', 'wholesale_orders', 'cron') returning id`.
2. **Guardar el crudo:** `insert into raw.api_payloads (source, entity, external_id, payload) … on conflict do nothing`. El `payload_hash` evita duplicados idénticos.
3. **Normalizar y hacer upsert en orden de dependencias:**
   `sales_reps` → `products` → `clients` → pedidos → líneas → cotizaciones → inventario.
   - Con supabase-js: `.upsert(rows, { onConflict: 'source,external_id' })`.
   - Las líneas usan `onConflict: 'order_id,line_number'`. Primero se resuelve el `id` del pedido y del producto por su `external_id`.
4. **Marcar el crudo:** `processed_at = now()`, o `error` si falló.
5. **Cerrar corrida:** `update sync_runs set status = 'exitoso' | 'parcial' | 'fallido', finished_at = now(), rows_received, rows_upserted, error`.

El contrato de campos del ERP está en `docs/ERP_DATA_CONTRACT.md`.

## Dar acceso a una persona o a la cuenta de agentes

1. Que inicie sesión una vez en la app. Requiere el login con Google, todavía pendiente.
2. Con `service_role` o desde el SQL Editor:
   ```sql
   insert into public.app_users (user_id, email, display_name, kind, role)
   select id, email, 'Grok Bot', 'cuenta_agentes', 'comercial'
   from auth.users where email = 'agentes@…';
   ```
3. Para quitar el acceso: `update public.app_users set active = false where email = '…'`.

## Activar la lectura en la app

1. Tener datos cargados y el login con Google funcionando.
2. En Vercel:
   - `VITE_DATA_SOURCE=supabase`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable key del proyecto)
3. `SupabaseMitraRepository` (`src/mitraclick/data/supabase/repository.ts`) lee 180 días. `mapCommercialData` los convierte al mismo contrato que usan los dashboards.

## Cambiar el esquema

1. Crear la migración nueva en `supabase/migrations/` con `supabase migration new <nombre>`. No editar migraciones ya aplicadas.
2. Aplicarla al proyecto.
3. Correr los advisors de seguridad y rendimiento.
4. Regenerar `src/mitraclick/data/supabase/database.types.ts`.
5. Actualizar `mapCommercialData` y sus pruebas si cambió el contrato.
