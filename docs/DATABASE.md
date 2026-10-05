# Base de datos — Mitra Click

Proyecto Supabase **`mitraclick-intelligence`** (ref `drdaenkvtjjrtyjjxnrr`, Postgres 17,
us-east-2, plan gratuito). Es la única fuente de verdad del sistema.

## Estado

| Qué | Estado |
|---|---|
| Migraciones `20260925*` (tablero de solo lectura, dos negocios) | Aplicadas. Modelo anterior, **vacío**, se reemplaza |
| `pending_op1_reset_readonly_model.sql` | Escrita, **sin aplicar** |
| `pending_op2_access_roles_audit.sql` | Escrita, **sin aplicar** |
| `pending_op3_operational_model.sql` | Escrita, **sin aplicar** |
| `src/mitraclick/lib/database.types.ts` | Provisional, escrito a mano; se regenera al aplicar |
| Edge Function `ingest` (desplegada) | Obsoleta: apunta al modelo anterior. Retirarla al aplicar el reinicio |

Mientras las tres migraciones `pending_op*` no se apliquen, la app solo muestra el
inicio de sesión: la función `my_profile()` y las tablas nuevas todavía no existen.

## Cómo aplicar el modelo operativo

Requiere autorización explícita: la primera migración **borra** el modelo anterior
(tablas `wholesale_*`, `retail_*`, `clients`, `products`, `sales_reps`, `app_users`,
`audit_log` y las funciones de carga). Están vacías, pero es una operación destructiva.

1. Aplicar en orden `op1` → `op2` → `op3` (MCP `apply_migration` o SQL Editor).
2. Renombrar cada archivo `pending_*` con la versión que asigne Supabase
   (`list_migrations`), para que el repo y la base coincidan.
3. Revisar advisors de seguridad y rendimiento.
4. Regenerar `database.types.ts`.
5. Dar de alta al primer usuario (ver "Primer acceso").

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
