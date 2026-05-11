# PENDIENTES — CRM Supply Chain MX

Backlog priorizado de trabajo que necesita dependencias externas o decisiones previas. Documenta contexto suficiente para que cualquiera retome.

Última actualización: 2026-05-11

---

## 🔴 P0 — Bloqueado por terceros

### Migración billing a Extensiv Billing Wizard
**Bloqueado por**: validación manual del Billing Wizard de Extensiv (sin login hoy).

**Acción**: cuando haya acceso, validar que se pueden configurar tarifas equivalentes a las del CRM (`tarifarios` table). Si funciona, migrar:
- `ProformasPage.tsx` → solo vista de consolidación
- `RCPage.tsx` → leer invoice de Extensiv en vez de calcular
- `SekoBillingPage.tsx` → leer invoice + adjuntar viajes TMS
- Borrar `useMonthlyStorageCalc.ts` (240 LOC) — Extensiv lo calcula
- Borrar parte de `useServiciosAdicionales.ts` (170 LOC)

**Impacto esperado**: -900 LOC, una sola fuente de verdad para tarifas.

---

### Push de cargos TMS a Extensiv vía `/customers/{id}/charges`
**Bloqueado por**: respuesta de `api@extensiv.com` con el schema POST exacto.

**Mientras tanto**: redactar correo con esta pregunta:

> *"What is the exact request body schema (POST or PUT) to add ad-hoc charges to a customer via REST API? Specifically chargeType = ThirdPartyFreight and SpecialCharges. Do these charges flow into the Billing Wizard invoice for that period automatically?"*

**Cuando se confirme**, ejecutar el F2 diferido del plan original:
- ALTER TABLE `clients` (+6 cols: `rfc`, `razon_social`, `regimen_fiscal`, `uso_cfdi`, `domicilio_fiscal_cp`, `address`)
- Form fiscal en `src/pages/clients/ClientDetail.tsx`
- Reescribir `READ_ONLY=true` del proxy → `WRITE_ALLOWLIST` con regexes específicas en `supabase/functions/extensiv-proxy/index.ts`
- Crear `src/lib/extensiv/pushCharge.ts` con modos `dry-run` / `record` / `live`
- Crear tabla `extensiv_charge_attempts` (audit log)
- Migrar `CargosExtraPage.tsx` de localStorage → DB + rutearla en `App.tsx` + sidebar

---

### Realtime sync Extensiv → CRM (matar cache 7 días)
**Bloqueado por**: registro del webhook en el dashboard de Extensiv.

**Acción**: cuando estén disponibles los webhooks de Extensiv:
1. Registrar URL `https://<proj>.supabase.co/functions/v1/extensiv-webhook?t=<secret>` en el dashboard de Extensiv
2. Crear tabla `sync_status (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ)`
3. En el webhook, `UPSERT INTO sync_status` después de procesar evento
4. En `src/hooks/useExtensivWarehouseData.ts`, subscribe a `sync_status` via Supabase realtime y refetch cuando cambie

**Código del webhook ya está implementado** en `supabase/functions/extensiv-webhook/index.ts` (215 LOC, completo). Solo falta config.

---

## 🟠 P1 — Decisiones de negocio pendientes

### Facturación CFDI: BIND ERP vs PAC directo
**Decisión pendiente**: `src/lib/bind.ts` es un stub que retorna `null`. Opciones:

- **A**: Integrar BIND ERP cuando el cliente tenga credenciales
- **B**: Saltarse BIND y conectar directo a un PAC (Facturama, SW Sapien, Diverza)
- **C**: Mantener manual — exportar XLSX al contador, él timbra en ContpaqI

Por ahora `bindErpExporter.ts` genera el XLSX (opción C) y el flujo sigue manual.

---

### Estructura de export para ContpaqI
**Pendiente**: confirmar con el contador:
- ¿ContpaqI Comercial Premium / Contabilidad / Nóminas?
- ¿Una factura por cliente por mes, o una por operación?
- Layout XLSX exacto que ContpaqI acepta
- Mapeo de RFC → cliente

Sin esto, `bindErpExporter.ts` usa layout genérico que puede no funcionar.

---

### Carriers individuales más allá de Skydropx
Si Skydropx (integración via agregador, ya ejecutado en F3.5) no cubre todos los casos:
- **Estafeta directo**: API estable, ETA conocido
- **UPS / FedEx / DHL**: APIs propias con cuentas corporativas
- **Castores**: API limitada, posible scraping (ojo legal)

Cada uno es 1-2 semanas. Prioridad solo si volumen lo justifica.

---

## 🟡 P2 — Calidad y diferenciadores

### Dashboard AR aging (cuentas por cobrar)
**Gap**: hoy no hay buckets 0-30 / 31-60 / 61-90 / +90. Esencial para cobranza.

**Esfuerzo**: 1 semana. Requiere tabla `facturas_emitidas` con fecha emisión + fecha pago.

---

### OTIF / SLA por cliente
**Gap**: KPIs operativos existen, pero no compromisos contractuales. Métrica clave de 3PL.

**Esfuerzo**: 1 semana. Requiere capturar SLA target en `clients` y comparar contra `operations.fecha_entrega`.

---

### Workflow de alertas push
**Gap**: solo `notify-task-email` edge function. Falta alerts para:
- Trámites vencidos (vehículos sin verificación)
- POD pendientes >X días
- RC sin enviar
- Operaciones sin facturar al mes

**Esfuerzo**: 1 semana. Stack: Supabase cron + edge function que escanea + envía email/SMS.

---

### Pipeline comercial (CRM de ventas, no de operaciones)
**Gap**: el "CRM" hoy es operativo. No tiene leads, oportunidades, forecasting.

**Decisión pendiente**: ¿lo quieren construir o usan un CRM externo (HubSpot, Pipedrive)?

---

## 🟢 P3 — Hygiene técnica

### Auditoría RLS por rol/tabla en Supabase
Con 5 roles + tablas operativas + financieras, mandatorio auditar policies.

**Esfuerzo**: 3 días. Documentar matrix rol × tabla × CRUD.

---

### Confirmar que `.env` está gitignored
```bash
git check-ignore .env   # debe retornar match
```
Si no, mover claves a Supabase secrets y rotar.

---

### Mover `API KEY resend 2.md`
Archivo en `/Users/santiagorosado/CRM SUPPLY CHAIN/API KEY resend 2.md` (fuera del repo). Si tiene una API key real, mover a Supabase secrets y eliminar el archivo plano.

---

### CI completo
No hay `.github/workflows/` hoy. Crear pipeline básico:
- `npm install`
- `npm run lint`
- `npm run type-check`
- `npm run test:run`
- `npm run build`

---

## 📋 Decisiones registradas

| Fecha | Decisión |
|---|---|
| 2026-05-11 | F2 (prep push charges Extensiv) se difiere completo. Esperar respuesta de `api@extensiv.com` antes de tocar. |
| 2026-05-11 | F3.5 (webhook realtime sync) se difiere. Esperar config de webhooks en dashboard Extensiv. |
| 2026-05-11 | Mantener `ProformasPage`, `RCPage`, `SekoBillingPage` activas hasta validar Billing Wizard manualmente. |
| 2026-05-11 | Skydropx como única integración de paquetería (agregador). No integrar Estafeta/UPS/FedEx individual aún. |
| 2026-05-11 | `bindErpExporter` mantiene formato XLSX genérico hasta confirmar layout con contador ContpaqI. |
