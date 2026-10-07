# Puesta en marcha — Mitra Click

Todo el sistema está escrito en el repositorio y el esquema está aplicado en Supabase. Lo que
falta es desplegar las Edge Functions, conectar Shopify y **validar con datos y personas reales**. Esta guía es el camino de "código en la rama" a "sistema
funcionando", en orden. Cada paso dice quién puede hacerlo.

## 1. Esquema

**Aplicado al 7-oct-2026**: las 10 migraciones. El detalle, los advisors y la verificación
que se hizo están en `docs/DATABASE.md`. Los archivos `manual_*` se ejecutaron a mano en el
SQL Editor y no aparecen en el historial de migraciones de Supabase.

Falta, de este paso: la validación con datos reales y la revisión visual (ver el punto 7).

## 2. Primer usuario

Dado de alta el 7-oct-2026: `santirosado21@gmail.com` con roles dirección y admin. Los demás
se dan de alta en la pantalla **Usuarios y permisos**; entran con ese mismo correo.

## 3. Edge Functions

**Desplegadas el 7-oct-2026** (sin secretos configurados todavía, así que Shopify y la redacción
con IA siguen inactivas).

| Función | `verify_jwt` | Quién la llama |
|---|---|---|
| `shopify-webhook` | **false** | Shopify (autentica con la firma HMAC) |
| `shopify-sync` | true | Dirección o admin desde la pantalla Shopify |
| `agent-narrate` | true | Dirección o admin (redacción con IA) |
| `go` | **false** | Cualquiera que escanea un link NFC/QR |

La función anterior `ingest` quedó retirada (responde 410). Si se quiere borrar del todo:
panel de Supabase → Edge Functions → ingest → Delete.

Cuando cambie el código de una función, hay que volver a desplegarla (el repositorio no la
despliega solo).

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
