# SCOPE_GAPS — Sprint Techship

Simplificaciones y desviaciones respecto al spec original. Todo lo listado es
funcional; son decisiones de pragmatismo dentro del modo autonomo.

## Fase 5 — Shipment Profile Dashboard

- **PackagesByCountryMap**: el spec pedia un mapa SVG con `react-simple-maps`.
  Decision final: el panel "Paquetes por pais" usa una grafica de dona
  (Recharts) — apropiado para una operacion mayoritariamente domestica MX, y
  evita la dependencia de un topojson mundial via CDN. `react-simple-maps`
  (que habia requerido `--legacy-peer-deps` con React 19 y no traia tipos) se
  DESINSTALO para dejar el arbol de dependencias limpio. Reintroducir un mapa
  real solo requiere reinstalar la libreria y reemplazar ese unico `PiePanel`.
- **TopStatesBarChart**: no existe lookup CP->estado eficiente en el cliente
  (la tabla mx_postal_codes solo tiene ~100 CPs seed). Se reemplazo por
  "Top destinos (CP)" agrupando por codigo postal destino. Para estados reales
  habria que cruzar contra mx_postal_codes completo o agregar columna estado.

## Fase 3 — Addresses

- **AddressPicker en ParcelOrdersPage**: se integro el picker de remitente en
  el `ParcelOrderImportModal` (flujo de creacion de ordenes de esa pagina) en
  lugar de un picker suelto en la grid. El picker de destinatario si esta en
  CotizarShipmentModal como pedia el spec.

## Fase 10 — i18n

- Cobertura i18n: titulos, subtitulos, encabezados de tabla, KPIs y navegacion
  de las 7 paginas nuevas estan en `t()` (EN/ES). Microcopy operativo de menor
  visibilidad (algunos placeholders, mensajes de toast, labels de modales)
  permanece en espanol. El toggle EN/ES funciona y persiste en localStorage.

## Fases 7 y 8 — Edge functions

- `fedex-proxy` y `carrier-tracking-webhook` estan completas pero requieren
  `supabase functions deploy` manual + secrets. Ver SECRETS_PENDING.md y
  WEBHOOKS_PENDING.md.

## Arquitectura Claude+Codex

- El spec sugeria delegar paginas grandes a Codex. Se construyo todo
  directamente con Claude para garantizar coherencia de tipos entre fases
  interdependientes (los hooks/types de fases tempranas alimentan las tardias).
  Resultado: 10/10 fases con build verde.

## Modelo de datos "ordenes"

- No se creo tabla `parcel_orders` separada: las "ordenes" del TMS son filas de
  `guias_paqueteria` (que ya es la tabla de envios). Las importadas nacen con
  `tracking_status='cotizado'` y placeholders de costo/precio=0 hasta que se
  procesan. Esto evita duplicar el modelo de envios.
