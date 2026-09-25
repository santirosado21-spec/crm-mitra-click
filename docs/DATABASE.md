# Base de datos: Supabase `mitraclick-intelligence`

- **Proyecto:** `drdaenkvtjjrtyjjxnrr` (organización de Santiago, región `us-east-2`, Postgres 17).
- **URL:** `https://drdaenkvtjjrtyjjxnrr.supabase.co`
- **Migraciones:** `supabase/migrations/`, aplicadas el 24 y 25-sep-2026 en este orden:

| Versión | Migración | Contenido |
|---|---|---|
| `20260925002418` | `mitraclick_core` | Modelo comercial normalizado |
| `20260925002436` | `mitraclick_access` | Usuarios, perfiles de agente, bitácora, RLS y permisos |
| `20260925002446` | `mitraclick_ingestion` | Capa de aterrizaje `raw` y bitácora de sincronización |
| `20260925002448` | `mitraclick_read_models` | Vista `sales_facts` |
| `20260925152945` | `mitraclick_ingest_functions` | `ingest_batch` (carga) y `purge_source` (limpieza) |

Hoy la base está **vacía**: solo tiene los 3 perfiles de agente. La app sigue con
datos simulados hasta que se activa `VITE_DATA_SOURCE=supabase`. Esa variable está
**pensada para Vercel**. Los datos simulados se conservan siempre como respaldo.

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

## Cómo entran los datos (cualquier formato)

Todo termina en la misma función, `public.ingest_batch(fuente, entidad, filas)`:
- Es idempotente: reenviar lo mismo no duplica.
- Procesa fila por fila: las filas malas se reportan y el resto se carga.
- Guarda el crudo en `raw.api_payloads` y registra cada corrida en `sync_runs`.

| Si Mitra entrega… | Cómo se carga |
|---|---|
| **API o webhook** (ERP, Shopify, n8n, Make, un proveedor) | `POST https://drdaenkvtjjrtyjjxnrr.supabase.co/functions/v1/ingest` con JSON `{ "fuente": "erp", "entidad": "pedidos", "filas": [ … ] }` y header `x-ingest-key` |
| **Excel o CSV** exportado | Guardar como CSV y correr `npm run data:ingest -- --fuente erp --entidad pedidos --archivo pedidos.csv`. También se puede enviar el CSV directo a la función con `Content-Type: text/csv` y `?fuente=erp&entidad=pedidos` |
| **Captura manual** (metas, cuotas) | Llenar la plantilla de `docs/plantillas/` y cargarla igual que un CSV con `--fuente manual` |
| **Acceso directo a la base del ERP** | Un proceso del lado servidor lee el ERP y llama `ingest_batch` por RPC con la llave secreta |

### Entidades y campos

Los nombres de campo están en español, igual que en `docs/ERP_DATA_CONTRACT.md`. Hay una plantilla CSV por entidad en `docs/plantillas/`.

| Entidad | Campos (\* obligatorio) |
|---|---|
| `vendedores` | id\*, nombre\*, zona, activo |
| `cuotas` | vendedor_id\*, mes\* (`AAAA-MM`), importe\* |
| `metas` | mes\*, unidad\* (`mitra` / `mitraclick`), importe\* |
| `productos` | id o sku\*, nombre\*, marca, categoria, unidad_negocio, unidad, precio_lista, punto_reorden, activo |
| `existencias` | producto_id o sku\*, existencia\*, bodega (default `principal`), fecha_corte |
| `clientes` | id\*, nombre\*, tipo, vendedor_id |
| `pedidos` | folio\*, fecha\*, cliente_id, vendedor_id, importe, estatus, `lineas` (arreglo, opcional) |
| `lineas_pedido` | folio_pedido\*, linea\*, producto_id o sku\*, cantidad, precio_unitario, importe |
| `ordenes` | folio\*, fecha\*, canal, importe, estatus, `lineas` (opcional) |
| `lineas_orden` | folio_orden\*, linea\*, producto_id o sku\*, cantidad, precio_unitario, importe |
| `cotizaciones` | folio\*, fecha\*, cliente_id, vendedor_id, importe\*, estatus, fecha_cierre |
| `trafico` | fecha\*, visitas, vistas_producto, carritos, checkouts, ordenes |

### Qué tolera la carga

- **Fechas:** `2026-09-21`, `21/09/2026` o ISO con hora (`2026-09-21T18:30:00-06:00` se toma como el 21).
- **Montos:** `64300`, `64,300.50` o `$64,300.50`.
- **Estatus en español o inglés:**
  - Pedidos: `surtido`/`facturado`, `pendiente`/`abierto`, `cancelado`.
  - Órdenes de Shopify: `fulfilled`→entregado, `shipped`→enviado, `cancelled`/`refunded`→cancelado.
  - Cotizaciones: `ganada`/`aceptada`/`won`, `perdida`/`rechazada`/`lost`, `negociación`.
- **Sí/no:** `si`, `sí`, `true`, `1`, `activo`.
- **Encabezados de Excel:** `Folio Pedido` → `folio_pedido`, `Categoría` → `categoria`. El separador puede ser coma, punto y coma o tabulador.
- **Orden de llegada:**
  - Si un pedido llega antes que su vendedor, cliente o producto, se crea un registro provisional ("… (pendiente de catálogo)"). La carga posterior del catálogo lo completa.
  - Las `lineas_pedido` sueltas sí requieren que el pedido ya exista. Si no existe, se reportan como error.
- **Reenvíos:**
  - Un pedido que se reenvía con `lineas` reemplaza sus líneas.
  - Uno sin `lineas` solo actualiza el encabezado.
- **Cancelaciones:** los pedidos y órdenes cancelados se guardan, pero no cuentan como venta.

### Respuesta de la carga

```json
{ "estado": "parcial", "entidad": "pedidos", "recibidas": 120, "procesadas": 118, "con_error": 2,
  "errores": [{ "fila": 37, "id": "PED-4217", "error": "Fecha no reconocida: \"31/02/2026\"" }] }
```

- La Edge Function responde **200** si todo entró o fue parcial, y **422** si ninguna fila entró.
- También responde **400** si la fuente o la entidad no son válidas, y **401** si la llave no es válida.
- Acepta hasta 20,000 filas por envío y las procesa en bloques de 1,000.

### Llaves de carga (nunca en el navegador)

- **Terceros** (ERP, n8n, proveedor): crear el secreto `INGEST_API_KEY`, de 24 caracteres o más, en **Edge Functions → Secrets** del dashboard. Se envía en el header `x-ingest-key`. Si no existe, ese modo está apagado.
- **Scripts internos:** una llave secreta de Supabase (`sb_secret_…`, en Settings → API Keys) en el header `apikey`. Los scripts la leen de `MITRA_INGEST_KEY` en `.env.local`.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run data:ingest -- --fuente erp --entidad pedidos --archivo x.csv` | Carga un CSV o JSON, con reintentos |
| `npm run data:seed-demo` | Siembra los datos simulados de la app como fuente `demo` para probar todo el flujo |
| `npm run data:purge-demo` | Borra todo lo de la fuente `demo` |
| `npm run data:purge -- --fuente erp --confirmar "BORRAR erp"` | Borra una fuente real (pide confirmación explícita) |

### Probar sin tocar datos

La carga completa se probó el 25-sep-2026 con transacciones revertidas: las 12 plantillas
de `docs/plantillas/` cargan al 100% y `sales_facts` cuadra con la suma de las líneas.

## Dar acceso a una persona o a la cuenta de agentes

1. Que inicie sesión una vez en la app (`/entrar`, con Google o con el enlace por correo). Eso crea su usuario en `auth.users`.
2. Con `service_role` o desde el SQL Editor:
   ```sql
   insert into public.app_users (user_id, email, display_name, kind, role)
   select id, email, 'Grok Bot', 'cuenta_agentes', 'comercial'
   from auth.users where email = 'agentes@…';
   ```
3. Para quitar el acceso: `update public.app_users set active = false where email = '…'`.

## Activar datos reales en la app

1. **Cargar datos** con la función `ingest` o los scripts. Verlos en **Estado de datos** (`/datos`).
2. **Configurar Auth en Supabase:**
   - Authentication → URL Configuration: poner la URL de Vercel como *Site URL* y agregar `http://localhost:5173` a *Redirect URLs*.
   - Authentication → Providers → **Google**: activarlo con el Client ID y el secret de Google Cloud.
   - El enlace por correo funciona sin configurar nada extra, con el límite de envíos de Supabase.
3. **Dar de alta a cada usuario** en `app_users`; ver arriba.
4. **Configurar Vercel:**
   - `VITE_DATA_SOURCE=supabase`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. **Qué ve cada quien:**
   - Sin sesión, sin permiso o sin pedidos: los datos simulados, con un aviso que explica el motivo y un botón para iniciar sesión.
   - Usuario autorizado: los datos reales. El indicador del encabezado cambia a "Datos reales".

Piezas del código:
- `SupabaseMitraRepository` (`src/mitraclick/data/supabase/repository.ts`) valida la sesión y el acceso, y lee 180 días.
- `mapCommercialData` convierte las filas al contrato de los dashboards.
- `FallbackMitraRepository` hace el respaldo a datos simulados.

## Cambiar el esquema

1. Crear la migración nueva en `supabase/migrations/` con `supabase migration new <nombre>`. No editar migraciones ya aplicadas.
2. Aplicarla al proyecto.
3. Correr los advisors de seguridad y rendimiento.
4. Regenerar `src/mitraclick/data/supabase/database.types.ts`.
5. Actualizar `mapCommercialData` y sus pruebas si cambió el contrato.
