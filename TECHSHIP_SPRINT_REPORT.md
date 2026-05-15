# TECHSHIP SPRINT REPORT

Sprint autonomo: replica de Techship (TMS SaaS) dentro de `crm-supply-chain`.
Branch: `feat/techship-replica` · 11 commits de fase + reportes.
Resultado: **10/10 fases completadas · build Vite verde en cada fase.**

## Resumen por fase

| Fase | Entregable | Estado |
|------|-----------|--------|
| 0 | Schema (7 tablas + 5 columnas) + 7 rutas + i18n EN/ES | OK |
| 1 | Orders grid + Excel import + print queue + Skydropx buyLabel | OK |
| 2 | Markup profiles (matriz cliente x carrier x service) | OK |
| 3 | Addresses (libreta + pickers) | OK |
| 4 | Manifests (finalize/history + PDF jsPDF) | OK |
| 5 | Shipment Profile dashboard (~9 paneles + KPIs) | OK |
| 6 | Delivery Performance dashboard (SLA por cliente) | OK |
| 7 | FedEx REST directo (provider + edge function proxy) | OK |
| 8 | Tracking webhooks (edge function publico, HMAC) | OK |
| 9 | Order templates (CRUD + use_count) | OK |
| 10 | i18n EN/ES + polish + QA | OK |

## Migracion de base de datos

`20260515000001_techship_replica.sql` aplicada en remoto via `supabase db push`.
Tablas: markup_profiles, markup_profile_rules, parcel_addresses, manifests,
manifest_guias, parcel_order_templates, parcel_print_queue.
guias_paqueteria + promised_delivery_date, actual_delivery_date, induction_date,
billing_account, markup_pct_applied. RLS open policies. Seed sender Lerma.

## Archivos clave creados

Paginas: ParcelOrdersPage, OrderTemplatesPage, ManifestsPage,
ShipmentProfilePage, DeliveryPerformancePage, MarkupProfilesPage, AddressesPage.
Hooks: useParcelOrders, usePrintQueue, useMarkupProfiles, useParcelAddresses,
useManifests, useShipmentProfileMetrics, useDeliveryPerformanceMetrics,
useOrderTemplates.
Lib: parcelExcelParser, carriers/markup, carriers/fedex, carriers/manifests,
carriers/manifestPdf.
Componentes: PrintQueueBadge, NoPrintFoundIndicator, MarkupRuleEditor,
AddressForm, AddressPicker, CreateManifestModal, MetricPanels, LanguageToggle.
Edge functions: fedex-proxy, carrier-tracking-webhook.
i18n: src/i18n (index + es.json + en.json).

## Integraciones en codigo existente

- App.tsx: 7 rutas nuevas bajo /tms/* (PARCEL_ROLES; markup-profiles admin).
- Sidebar.tsx: PARCEL_LINKS reorganizado en sub-grupos Operaciones / Insights /
  Catalogos.
- Header.tsx: LanguageToggle + PrintQueueBadge (solo modulo paqueteria).
- permissions.ts: rutas nuevas mapeadas a modulo parcel + overrides de rol.
- CotizarShipmentModal.tsx: markup aplicado a rates + AddressPicker destinatario
  + "Guardar como plantilla".
- carriers/registry.ts: provider direct_fedex registrado.
- carriers/skydropx.ts: buyLabel real cerrado (rate_id + addresses + parcels).

## Verificacion

- `npx tsc --noEmit`: sin errores en NINGUN archivo nuevo/tocado del sprint.
  (El repo tenia errores pre-existentes en archivos ajenos — ver FIXMES.md.)
- `npm run build` (Vite): exitoso tras cada una de las 10 fases.
- Light mode (monday.com style) consistente: bg-white rounded-xl border
  border-gray-100 shadow-sm, navy #1e3a5f, sin glassmorphism.

## Pendientes operativos (no de codigo)

Ver SECRETS_PENDING.md (FedEx) y WEBHOOKS_PENDING.md (deploy de edge functions).
Ver SCOPE_GAPS.md para simplificaciones (mapa SVG, top-states, i18n parcial).

## Riesgos respetados

Sin DROP/RENAME de columnas guias_paqueteria. Sin secrets en el repo. Sin
force-push. Sin tocar main. Modulo TMS existente intacto.
