# Mitra Click — Arquitectura y alcance

Documento base: "Plan de Trabajo Mitra Click AI Implementation" (Ángel Secades,
Santiago Rosado, Lorenzo Stoopen). Este archivo resume qué de ese plan se construye
en este repositorio, en qué orden y con qué límites.

## Decisiones vigentes

- Este repositorio **es** el sistema operativo de Mitra Click; se construye aquí.
- **Solo Mitra Click**, con dos canales de venta: Shopify y venta directa.
- **Agentes, reportes y alertas viven dentro de la app.**
- **Shopify:** todavía no hay acceso. El conector se construye contra el formato
  documentado y se activa al poner las credenciales.
- **Supabase es la única fuente de verdad.** No se generan datos simulados en el
  navegador; los datos de prueba se siembran en la base con `source = 'demo'`.

## Qué le compete a este repositorio

| Punto del plan | ¿Aquí? | Nota |
|---|---|---|
| 01 Sistema base + Shopify | Sí | Conector listo para activar con credenciales |
| 02 Calidad de datos | Sí | Reglas y bandeja de pendientes con responsable |
| 03 Productos y categorías | Sí | Familias, categorías, reglas de alta, historial de reclasificación |
| 04 Presencia digital | Parcial | Sí: links NFC/QR medibles, leads, seguimiento de prospección, carga de métricas SEO. No: perfiles y contenido en redes, SEO dentro de Shopify, tarjetas físicas |
| 05 KPIs · 06 Dashboard | Sí | Solo métricas calculables con datos confiables |
| 07–10 Agentes | Sí | IA del lado servidor, con evidencia, sin acciones automáticas sobre datos |
| 11 Reportes · 12 Alertas | Sí | En la app primero; correo o WhatsApp como canal posterior |
| 13 Piloto de inventario NFC/QR | Sí | El sistema es la fuente de verdad; la etiqueta solo abre el registro |
| 14 Trazabilidad · 15 Seguridad | Sí | |
| 16 Validación · 17 Primera meta | Compartido | Requiere usuarios y operación real |
| Timbrado fiscal (CFDI) | No por ahora | Se registran facturas y pagos |
| Cold email, Mitra mayorista | No | Excluidos |

## Arquitectura

```text
Navegador (React)
  └─ Supabase con la sesión del usuario (publishable key)
       ├─ RLS por rol en cada tabla
       ├─ Triggers: auditoría, folios, existencias, historial de productos
       └─ Vistas SQL de KPIs (fase G)

Edge Functions (secretos del lado servidor)
  ├─ shopify-webhook / shopify-sync   (fase E)
  └─ agentes y reportes               (fase H, API de Claude; sin llave: reglas)
```

Principios:

- **La base hace cumplir las reglas.** Permisos, inmutabilidad del libro de
  movimientos y auditoría no dependen de la interfaz.
- **Sin recaptura.** Cada documento hereda del anterior: cotización → pedido →
  compra → recepción → salida → envío → remisión → factura → pago.
- **La existencia se deriva** del libro de movimientos. Un conteo físico genera una
  diferencia para revisión; el ajuste requiere motivo y rol autorizado.
- **Una definición por métrica.** Dashboard, alertas y agentes leen las mismas vistas.
- **Los agentes proponen, las personas deciden.** Cada hallazgo guarda su evidencia.

## Fases

| Fase | Contenido | Estado |
|---|---|---|
| A | Fundación: modelo operativo, roles y RLS, auditoría, sesión obligatoria, menú, patrón lista + formulario | En curso: app lista; esquema escrito, pendiente de aplicar |
| B | Catálogo, clientes y proveedores; importador CSV (exportaciones de Shopify) | Pendiente |
| C | Inventario y bodega: movimientos, existencias, conteos, etiquetas NFC/QR (`/b/:codigo`) | Pendiente |
| D | Ciclo comercial y trazabilidad de punta a punta | Pendiente |
| E | Conector de Shopify (webhooks con HMAC, sincronización; inventario hacia Shopify apagado) | Pendiente |
| F | Calidad de datos, pendientes y alertas | Pendiente |
| G | KPIs (vistas SQL) y dashboard ejecutivo | Pendiente |
| H | Agentes (supervisión, comercial, marketing, ejecutivo) y reportes | Pendiente |
| I | Adquisición medible: links, leads, prospección, SEO | Pendiente |
| J | Validación operativa con usuarios reales | Pendiente |

Las fases B y C permiten el piloto de bodega de 10 productos y no dependen de Shopify.

## Información que falta de Mitra Click

- Exportación CSV de productos y clientes de Shopify (B).
- Familias y categorías vigentes (B).
- Almacenes, ubicaciones y los 10 productos del piloto (C).
- Correos y rol de cada persona (A).
- Estados y responsables de cada documento, si difieren de los propuestos (D).
- Credenciales de Shopify (E) y llave de la API de Claude (H).
- Decisión sobre pasar Supabase a Pro antes del piloto real (evita pausas por
  inactividad y da respaldos).

## Entrega

Commits por fase. Push, deploy y migraciones remotas solo con autorización explícita.
