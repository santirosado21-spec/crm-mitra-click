# Revisión de cargas de archivos — 8 de octubre de 2026

Alcance: revisión del código y migraciones versionadas. No equivale a una validación
operativa con sesión, ni confirma el estado actual de la base remota.

## Capacidad existente

| Área | Carga encontrada | Límites y pendientes |
|---|---|---|
| Dirección | No se encontró importador ni adjuntos | Dashboards, reportes y agentes consumen registros del sistema; no interpretan archivos arbitrarios |
| Shopify | Importadores de productos/clientes en sus módulos; SEO en Marketing | La conexión requiere credenciales; Paid Ads, Google Ads y AEO siguen con integración pendiente |
| Ventas | Clientes: CSV con vista previa, validación y RPC de importación | No hay importación XLSX ni adjuntos genéricos para cotizaciones y pedidos |
| Compras | Captura de proveedores, órdenes y recepción | No se encontró carga de facturas de proveedores ni importador Excel |
| Bodega | Existencias iniciales: CSV | No hay XLSX; movimientos, surtido y conteos deben conservar sus reglas transaccionales |
| Logística | Evidencia de entrega: JPG, PNG, WebP y PDF | Máximo 10 MB por archivo, bucket privado; fletes/viajes tienen migración pendiente según DATABASE.md |
| Finanzas | Registro de factura desde pedido; cobros desde factura | Sin adjuntos PDF/XML, sin importación Excel de facturas o pagos; Contabilidad aún no implementada |
| Catálogo | Productos: CSV de Shopify | No hay XLSX; actualización por SKU mediante RPC |
| Marketing | Métricas SEO: CSV | No hay importador Excel genérico para leads o campañas |
| Sistema | Captura de usuarios y consulta de bitácora | No hay carga genérica; roles y auditoría no deben alterarse desde archivos sin reglas específicas |

## Evidencia en el repositorio

- Importación de clientes/productos: `src/mitraclick/pages/ImportPage.tsx`.
- Inventario inicial: `src/mitraclick/pages/InitialStockPage.tsx`.
- SEO: `src/mitraclick/pages/LeadsPage.tsx`.
- Entregas: `src/mitraclick/pages/LogisticsPages.tsx` y `src/mitraclick/lib/storage.ts`.
- Facturas/pagos: `src/mitraclick/pages/FinancePages.tsx`.
- Políticas de archivos: `supabase/migrations/manual_op5_commercial_cycle.sql`.
- Integraciones pendientes: `src/mitraclick/pages/ShopifyDashboards.tsx`.

El bucket existente es exclusivo de remisiones: no reutilizarlo para comprobantes
financieros. Sus políticas permiten lectura a miembros y carga a dirección, admin,
logística y almacén; no constituyen un modelo aprobado para documentos contables.

## Decisiones necesarias antes de ampliar las cargas

1. Distinguir adjuntar un comprobante de importar datos que modifican registros.
2. Definir si los Excel financieros contienen ingresos/gastos o pólizas con debe/haber.
3. Definir si Pagos incluirá cobros de clientes, pagos a proveedores o ambos.
4. Acordar formatos, columnas y permisos por tipo de documento.

## Verificación pendiente para dar por funcional cada flujo

- Sesión real y pruebas por rol: guardar, volver a abrir y comprobar persistencia.
- Archivo válido, vacío, corrupto, formato no admitido y tamaño excedido.
- Vista previa, errores por fila y confirmación antes de importar.
- Reintentar el mismo archivo sin duplicar movimientos o pagos.
- Comprobar relaciones y saldos; actualizar dashboards desde los KPIs de la base.
- Rechazar accesos sin permiso también en Storage/RLS, no solo en la interfaz.
- Aplicar cualquier esquema nuevo solo con autorización explícita.

No se habilitaron nuevas cargas ni se modificó la base remota durante esta revisión.
