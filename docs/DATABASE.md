# Base de datos — Mitra Click

Proyecto Supabase **`mitraclick-intelligence`** (ref `drdaenkvtjjrtyjjxnrr`, Postgres 17,
us-east-2, plan gratuito). Es la única fuente de verdad del sistema.

## Estado

| Qué | Estado |
|---|---|
| Migraciones `20260925*` (tablero de solo lectura, dos negocios) | Aplicadas. Modelo anterior, **vacío**, se reemplaza |
| `pending_op1_reset_readonly_model.sql` | **Ejecutada a mano** en el SQL Editor (7-oct-2026). No aparece en el historial de migraciones de Supabase |
| `20261007183636_op_access_roles_audit.sql` (op2) | **Aplicada** |
| `20261007183752_op_operational_model.sql` (op3) | **Aplicada** |
| `20261007183816_op_catalog_inventory_functions.sql` (op4) | **Aplicada** |
| `pending_op5` … `pending_op10` | Escritas, **sin aplicar** (la op5 fue rechazada por el control de permisos) |
| Edge Functions `shopify-webhook`, `shopify-sync`, `agent-narrate`, `go` | En el repo, **sin desplegar** |
| `src/mitraclick/lib/database.types.ts` | Provisional, escrito a mano; se regenera al aplicar |
| Edge Function `ingest` (desplegada) | Obsoleta: apunta al modelo anterior. Retirarla |

Mientras las migraciones `pending_op*` no se apliquen, la app solo muestra el inicio de
sesión. El orden, los secretos y la validación están en `docs/PUESTA_EN_MARCHA.md`.

La migración 1 **borra** el modelo anterior (tablas `wholesale_*`, `retail_*`, `clients`,
`products`, `sales_reps`, `app_users`, `audit_log` y las funciones de carga). Están vacías,
pero es destructiva y requiere que la ejecute una persona.

## Modelo operativo (migración 3)

| Grupo | Tablas |
|---|---|
| Maestros | `app_users`, `sales_reps`, `customers`, `suppliers` |
| Catálogo | `product_families`, `product_categories`, `products`, `product_change_log` |
| Bodega | `warehouses`, `locations`, `tags`, `stock_movements`, `stock_levels`, `stock_counts`, `incidents` |
| Ventas | `quotes`, `quote_lines`, `sales_orders`, `sales_order_lines` |
| Compras | `purchase_orders`, `purchase_order_lines`, `receipts`, `receipt_lines` |
| Logística | `shipments`, `shipment_lines`, `remissions` |
| Finanzas | `invoices`, `payments` |
| Control | `issues`, `alerts`, `reports`, `agent_runs`, `agent_findings`, `audit_log`, `sync_runs` |
| Marketing | `tracked_links`, `link_events`, `leads`, `lead_activities` |
| Crudo | `raw.api_payloads` (no expuesto por la API) |

Reglas que hace cumplir la base:

- **Folios** consecutivos por documento: CLI, PRV, COT, PED, OC, REC, ENV, REM, PAG, INC.
- **Pedidos** con canal `directo` o `shopify` e identificadores de Shopify.
- **Productos:** la categoría debe pertenecer a la familia; cada reclasificación o
  cambio de precio/costo queda en `product_change_log` con quién, cuándo y motivo.
- **`stock_movements` es un libro inmutable**: no se edita ni se borra. `stock_levels`
  lo mantiene un trigger. Los ajustes solo los registra dirección o admin.
- **Conteos** guardan lo contado y la diferencia; nunca cambian la existencia.
- **Etiquetas** (`tags`) con código aleatorio; no contienen datos.

## Funciones (migración 4)

Corren con los permisos de quien las llama (`SECURITY INVOKER`); la RLS sigue aplicando.

| Función | Para qué |
|---|---|
| `update_product(id, valores, motivo)` | Guarda un producto; exige motivo al cambiar familia, categoría, precio o costo |
| `import_products(filas)` | Importación idempotente por SKU. Solo asigna familia si ya existe; no crea familias |
| `import_customers(filas)` | Importación idempotente por ID de Shopify o correo |
| `record_transfer(producto, origen, destino, cantidad, motivo)` | Traspaso: dos movimientos o ninguno |
| `resolve_stock_count(conteo, 'ajustar'\|'descartar', motivo)` | Solo dirección y admin. Ajustar genera el movimiento por la diferencia |

Además, un trigger en `stock_counts` fija la existencia del sistema, el estado y quién
contó: quien cuenta solo envía la cantidad contada.

## Migraciones 5 a 10

| Migración | Contenido |
|---|---|
| 5 · Ciclo comercial | `save_quote`, `convert_quote_to_order`, `save_order`, `save_purchase`, `receive_purchase`, `ship_order`, `register_delivery`, `verify_remission`, `register_invoice`, `register_payment`, cambios de estado, vistas `invoice_balances` y `customer_statements`, `order_timeline`, bucket privado `remisiones` |
| 6 · Calidad de datos | `control_settings` (umbrales), vista `data_quality_findings`, sincronización a `issues`, alertas con `dedupe_key`, revisión cada hora |
| 7 · KPIs | `kpi_commercial`, `kpi_sales_by_day`, `kpi_by_family`, `kpi_by_product`, `kpi_by_rep`, `kpi_operations` |
| 8 · Shopify | `shopify_apply_order/product/customer`, crudo y bitácora, `integration_settings`, diferencias de inventario |
| 9 · Agentes y reportes | `run_agent`, `generate_reports`, `convert_finding_to_issue`, programación diaria y por periodo |
| 10 · Adquisición | `track_link`, `convert_lead_to_customer`, `kpi_acquisition`, `seo_metrics` e importación |

Las funciones del ciclo comercial son `SECURITY DEFINER` porque cruzan áreas (bodega
actualiza lo surtido de un pedido; finanzas, su estado de pago): cada una valida primero
el rol con `private.require_role`. Las funciones `shopify_*` solo las ejecuta `service_role`.

## Seguridad

- Roles (`app_role`): `direccion`, `admin`, `ventas`, `compras`, `almacen`,
  `logistica`, `finanzas`, `marketing`. Un usuario puede tener varios.
- La identidad se resuelve en el schema `private` (no expuesto): `auth.uid()` →
  correo confirmado → fila activa en `app_users`.
- `private.secure_table(tabla, roles_que_escriben, permite_borrar, audita)` deja cada
  tabla con RLS, políticas, `grant`/`revoke` (nada para `anon`) y trigger de auditoría.
- Lectura: cualquier miembro activo. Escritura: los roles de la tabla. `audit_log`
  solo lo leen dirección y admin, y nadie lo escribe directamente.
- **`audit_log`** registra cada alta, cambio y baja con el antes y el después.

| Tablas | Roles que escriben (además de dirección y admin) |
|---|---|
| `app_users`, `sales_reps`, `alerts`, `agent_findings` | — |
| `customers` | ventas, finanzas |
| `suppliers`, catálogo, compras | compras |
| `warehouses`, `locations`, `tags`, `stock_counts` | almacén |
| `incidents` | almacén, logística |
| cotizaciones y pedidos | ventas |
| `receipts` | compras, almacén |
| `shipments` | logística, almacén |
| `remissions` | logística, finanzas |
| `invoices`, `payments` | finanzas |
| `issues` | todos |
| `tracked_links`, `leads`, `lead_activities` | marketing, ventas |

## Primer acceso

`app_users` solo la modifican dirección y admin, así que el primer usuario se crea
desde el SQL Editor (o con `service_role`), una sola vez:

```sql
insert into public.app_users (email, display_name, roles)
values ('correo@ejemplo.com', 'Nombre', '{direccion,admin}');
```

Después, las altas se hacen en la pantalla **Usuarios y permisos**. La persona entra
con ese mismo correo (Google, enlace por correo o contraseña).

## Cambiar el esquema

- No editar migraciones ya aplicadas; crear una nueva.
- Toda tabla nueva en `public` pasa por `private.secure_table(...)`.
- Probar permisos y reglas en una transacción que se revierte.
- Después de migrar: advisors, regenerar tipos y actualizar esta página.
- Migraciones remotas solo con autorización explícita.
