# Contrato de datos: ERP de Mitra → MitraClick Intelligence

Lista de lo que la plataforma necesita recibir del sistema interno / ERP de Mitra
para dejar de usar datos simulados. Cada tabla corresponde a un tipo de
`src/mitraclick/domain.ts` (`CommercialData`). El adaptador lo normalizará del lado
servidor: el formato de origen puede ser API, vista SQL o exportación programada.

**Frecuencia mínima sugerida:** una vez al día antes de las 7:00 (para los
reportes matutinos que Grok Bot envía por WhatsApp). Si el ERP lo permite, cada hora.

**Datos personales:** no se necesitan correos, teléfonos, RFC ni direcciones de
clientes; basta el nombre comercial.

## 1. Vendedores (`SalesRep`)

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `id` | texto | `V014` | Clave del vendedor en el ERP. |
| `nombre` | texto | `Ricardo Castillo` | |
| `zona` | texto | `CDMX Norte` | Zona, sucursal o cartera. |
| `cuota_mensual` | número (MXN) | `650000` | Si la cuota vive fuera del ERP (Excel), se carga aparte. |
| `activo` | booleano | `true` | |

## 2. Productos (`CommercialProduct`)

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `id` / `sku` | texto | `MI-W001` | Clave única. |
| `nombre` | texto | `Varilla corrugada 3/8" tramo 12 m` | |
| `marca` | texto | `DeAcero` | |
| `categoria` | texto | `Acero y perfiles` | Categoría comercial acordada con Mitra. |
| `unidad` | texto | `tramo` | Unidad de venta. |
| `precio_lista` | número (MXN) | `185` | |
| `existencia` | número | `320` | Existencia disponible. Si hay varias bodegas, por bodega. |
| `punto_reorden` | número | `140` | Opcional. |

## 3. Pedidos / facturas mayoristas (`WholesaleOrder` + `OrderLine`)

Encabezado:

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `folio` | texto | `PED-4180` | Único. |
| `fecha` | fecha `YYYY-MM-DD` | `2026-09-21` | Fecha de venta que usa dirección comercial. |
| `cliente_id` | texto | `CL014` | |
| `vendedor_id` | texto | `V014` | **Indispensable** para el ranking de vendedores. |
| `importe` | número (MXN, sin IVA) | `64300` | Acordar si es con o sin IVA; la plataforma usará un solo criterio. |
| `estatus` | texto | `surtido` | `pendiente`, `surtido`, `cancelado` (los cancelados se excluyen). |

Líneas: `folio`, `sku`, `cantidad`, `precio_unitario`, `importe`.

## 4. Cotizaciones (`WholesaleQuote`)

`folio`, `fecha`, `cliente_id`, `vendedor_id`, `importe`, `estatus`
(`enviada`, `negociacion`, `ganada`, `perdida`) y `fecha_cierre`.

## 5. Clientes (`WholesaleClient`)

`id`, `nombre_comercial`, `tipo` (constructora, industria, taller, revendedor) y
`vendedor_id` (vendedor asignado a la cuenta).

## 6. Metas (`MonthlyGoal`)

`mes` (`YYYY-MM`), `unidad` (`mitra` / `mitraclick`) e `importe`.

## 7. Mitra Click (Shopify y Analytics)

Órdenes, líneas y canal de origen desde Shopify; visitas y embudo desde GA4.
Estas fuentes las opera el proveedor actual: se solicitarán accesos de lectura.

## Destino en Supabase

Cada campo se carga con `source = 'erp'` (o `shopify`, `ga4`). La mecánica de carga
está en `docs/DATABASE.md`.

| Campo del ERP | Tabla.columna |
|---|---|
| Vendedor `id`, `nombre`, `zona`, `activo` | `sales_reps.external_id`, `name`, `zone`, `active` |
| Vendedor `cuota_mensual` | `rep_monthly_quotas.amount` (una fila por vendedor y mes, `month` = día 1) |
| Producto `id`/`sku`, `nombre`, `marca`, `categoria`, `unidad`, `precio_lista`, `punto_reorden` | `products.external_id`/`sku`, `name`, `brand`, `category`, `unit`, `list_price`, `reorder_point` (`business_unit = 'mitra'`) |
| Producto `existencia` | `inventory_levels.quantity` (una fila por producto y `warehouse`) |
| Pedido `folio`, `fecha`, `cliente_id`, `vendedor_id`, `importe`, `estatus` | `wholesale_orders.external_id`, `order_date`, `client_id`\*, `rep_id`\*, `amount`, `status` |
| Línea `folio`, `sku`, `cantidad`, `precio_unitario`, `importe` | `wholesale_order_lines.order_id`\*, `product_id`\*, `quantity`, `unit_price`, `amount` (+ `line_number`) |
| Cotización `folio`, `fecha`, `cliente_id`, `vendedor_id`, `importe`, `estatus`, `fecha_cierre` | `wholesale_quotes.external_id`, `quote_date`, `client_id`\*, `rep_id`\*, `amount`, `status`, `closed_date` |
| Cliente `id`, `nombre_comercial`, `tipo`, `vendedor_id` | `clients.external_id`, `name`, `client_type`, `rep_id`\* |
| Meta `mes`, `unidad`, `importe` | `business_goals.month` (día 1), `business_unit`, `amount` |

\* Columnas que guardan el `id` interno (uuid): la integración lo resuelve buscando el
`external_id` que manda el ERP.

## Preguntas abiertas para Mitra

1. ¿Qué ERP o sistema interno usan y quién puede dar acceso de lectura?
2. ¿El importe de venta que usa dirección es con o sin IVA? ¿Se cuenta por fecha de pedido o de factura?
3. ¿Dónde viven las cuotas mensuales por vendedor?
4. ¿Hay más de una bodega? ¿La existencia se reporta por bodega?
5. ¿Qué categorías comerciales quiere ver Ángel en los reportes?
