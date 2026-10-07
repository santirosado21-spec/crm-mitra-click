# Puesta en marcha — Mitra Click

Todo el sistema está escrito en el repositorio. Las migraciones 1 a 4 están aplicadas en
Supabase; el resto no, y **nada se ha probado con datos**. Esta guía es el camino de "código en la rama" a "sistema
funcionando", en orden. Cada paso dice quién puede hacerlo.

## 1. Aplicar el esquema

Estado al 7-oct-2026: las migraciones 1 a 4 están aplicadas; la 5 a la 10 no.

| # | Archivo | Estado |
|---|---|---|
| 1 | `pending_op1_reset_readonly_model.sql` | Ejecutada a mano (borró el modelo anterior) |
| 2 | `20261007183636_op_access_roles_audit.sql` | Aplicada |
| 3 | `20261007183752_op_operational_model.sql` | Aplicada |
| 4 | `20261007183816_op_catalog_inventory_functions.sql` | Aplicada |
| 5 | `pending_op5_commercial_cycle.sql` | **Rechazada** por el control de permisos; pendiente |
| 6 | `pending_op6_data_quality_alerts.sql` | Pendiente |
| 7 | `pending_op7_kpis.sql` | Pendiente |
| 8 | `pending_op8_shopify_connector.sql` | Pendiente |
| 9 | `pending_op9_agents_reports.sql` | Pendiente |
| 10 | `pending_op10_acquisition.sql` | Pendiente |

- Las migraciones 6 y 9 usan `pg_cron`. Si la extensión no está disponible, activarla en
  Database → Extensions antes de correrlas.
- Las pendientes **no se han ejecutado nunca**. Es esperable que alguna falle por un detalle
  de sintaxis o de dependencias: corregir y dejar el archivo igual a lo que quedó aplicado.
- Al aplicar cada una: renombrar el archivo con la versión que asigne Supabase, revisar
  advisors y regenerar `src/mitraclick/lib/database.types.ts` al terminar todas.
- Revisión de advisors tras aplicar 1 a 4: seguridad sin hallazgos (solo el aviso informativo
  de `raw.api_payloads`, que no se expone a propósito); rendimiento solo con índices sin uso,
  esperable con la base vacía.

## 2. Primer usuario

```sql
insert into public.app_users (email, display_name, roles)
values ('correo@ejemplo.com', 'Nombre', '{direccion,admin}');
```

Los demás se dan de alta en la pantalla **Usuarios y permisos**.

## 3. Edge Functions

| Función | `verify_jwt` | Quién la llama |
|---|---|---|
| `shopify-webhook` | **false** | Shopify (autentica con la firma HMAC) |
| `shopify-sync` | true | Dirección o admin desde la pantalla Shopify |
| `agent-narrate` | true | Dirección o admin (redacción con IA) |
| `go` | **false** | Cualquiera que escanea un link NFC/QR |

Retirar la función anterior `ingest`: quedó obsoleta.

Secretos (Edge Functions → Secrets). Ninguno va en el navegador ni en el repositorio:

| Secreto | Para qué | Obligatorio |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | Dominio `*.myshopify.com` | Para Shopify |
| `SHOPIFY_ADMIN_TOKEN` | Token de la app personalizada | Para Shopify |
| `SHOPIFY_WEBHOOK_SECRET` | Verificar webhooks | Para Shopify |
| `SHOPIFY_API_VERSION` | Versión de la Admin API | No (hay un valor por defecto; confirmar que siga vigente) |
| `ANTHROPIC_API_KEY` | Redacción con IA | No: sin ella todo funciona por reglas |
| `AGENT_MODEL` | Modelo para la redacción | No |
| `LINK_FALLBACK_URL` | A dónde lleva un link desconocido (la tienda) | Recomendado |

## 4. Conectar Shopify

1. En Shopify: crear una app personalizada con lectura de pedidos, productos, clientes e inventario.
2. Guardar los tres secretos.
3. Registrar webhooks hacia `…/functions/v1/shopify-webhook` para: `orders/create`,
   `orders/updated`, `orders/cancelled`, `products/create`, `products/update`,
   `customers/create`, `customers/update`, `inventory_levels/update`.
4. En la pantalla **Shopify**: sincronizar productos, luego clientes, luego pedidos.
5. El interruptor "Enviar existencias a Shopify" se queda apagado hasta validar el piloto.
   Hoy solo existe el interruptor y la consulta de qué se enviaría: **el envío en sí no está construido**.

Mientras no haya credenciales, el catálogo y los clientes se cargan con el importador CSV.

## 5. Pendientes de instalación

- `npm install qrcode @types/qrcode` y dibujar el QR en `pages/TagSheetPage.tsx`
  (hoy la hoja imprime el link en texto).
- Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en Vercel.

## 6. Decisiones tomadas por defecto (confirmar con Ángel)

Se eligieron valores razonables para no detener la construcción. Todos se pueden cambiar.

| Tema | Valor actual | Dónde se cambia |
|---|---|---|
| IVA | 16 %, precios capturados antes de IVA | Migración 5 y `lib/documents.ts` |
| Estados de cotización | borrador, enviada, negociación, ganada, perdida, vencida | Migración 3 y 5 |
| Estados de pedido | nuevo, confirmado, en compra, en surtido, enviado, entregado, cancelado | Migración 3 y 5 |
| Pedido de Shopify al llegar | Entra como "confirmado" | Migración 8 |
| Salida de inventario | Al registrar el envío (no al entregar) | Migración 5 |
| Salida mayor a la existencia | Se permite con aviso; queda como pendiente | `lib/inventory.ts` |
| Ajuste por conteo | Solo dirección y admin, por la diferencia registrada | Migración 4 |
| Verificación de remisión | Dirección, admin o finanzas | Migración 5 |
| Cotización sin seguimiento | 3 días | Pendientes → Umbrales |
| Remisión sin verificar | 2 días | Pendientes → Umbrales |
| Pedido sin movimiento | 7 días | Pendientes → Umbrales |
| Cliente inactivo | 60 días sin pedido | Pendientes → Umbrales |
| Cotización "relevante" | $20,000 o más | Pendientes → Umbrales |
| Cambio relevante de una familia | ±30 % en 30 días | Pendientes → Umbrales |
| Agentes | Diario, 7:00 (hora de CDMX) | Migración 9 |
| Reportes | Semanal lunes, quincenal 1 y 16, mensual día 1 | Migración 9 |
| Importar no crea familias | Solo asigna una familia que ya exista | Migraciones 4 y 8 |
| Roles por área | Ver `docs/DATABASE.md` | Migraciones 3 y 5 |

No se construyó como regla fija "producto asignado a una familia incorrecta": requiere
criterio, no una comparación. Queda para la redacción con IA o revisión manual.

## 7. Validación (fase J)

Una casilla se marca cuando está **implementado y validado con datos**, no antes.
Hoy ninguna está validada.

### Con datos de prueba
- [ ] Iniciar sesión; un correo no dado de alta no entra.
- [ ] Cada rol solo puede escribir lo suyo (probar al menos ventas, almacén y finanzas).
- [ ] Alta de familia → categoría → producto; reclasificar pide motivo y queda en el historial.
- [ ] Importar un CSV de productos y uno de clientes de Shopify; reimportar no duplica.
- [ ] Entrada, salida y traspaso; la existencia coincide con la suma de movimientos.
- [ ] Conteo con diferencia (ej. sistema 184, contado 177 → −7); no cambia la existencia hasta ajustar.
- [ ] Abrir `/b/:codigo` en un teléfono y registrar entrada, salida, conteo e incidencia.
- [ ] Cotización → pedido → compra → recepción → envío → entrega con evidencia → verificación → factura → pago, sin recapturar; la línea de tiempo queda completa.
- [ ] La bandeja de pendientes detecta cada una de las reglas y las cierra al corregir.
- [ ] El dashboard cuadra contra una suma hecha a mano de los mismos pedidos.
- [ ] Cada agente genera hallazgos con evidencia; un hallazgo se convierte en pendiente.
- [ ] Los reportes semanal, quincenal y mensual se generan y se leen.
- [ ] Un link NFC/QR redirige y suma un escaneo.
- [ ] La bitácora registra quién cambió qué, con antes y después.
- [ ] Revisión visual en 1440 px y 390 px de todas las pantallas.

### Con Shopify conectado
- [ ] Un webhook con firma inválida se rechaza.
- [ ] Un pedido nuevo en Shopify aparece en Pedidos con cliente y renglones ligados al catálogo.
- [ ] El mismo webhook dos veces no duplica.
- [ ] Cancelar en Shopify cancela aquí; un pedido ya en surtido no retrocede.

### Primera versión del plan de Ángel
- [ ] Identificar información incompleta o incorrecta.
- [ ] Asignar pendientes al responsable correspondiente.
- [ ] Conocer ventas por familia, producto y vendedor.
- [ ] Visualizar pedidos y entregas que requieren atención.
- [ ] Generar un resumen ejecutivo periódico.
- [ ] Ejecutar y auditar movimientos básicos del piloto de inventario (10 productos, una semana).
