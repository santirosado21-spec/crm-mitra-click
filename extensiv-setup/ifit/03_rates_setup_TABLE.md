# IFIT Rates Setup — 25 líneas del invoice abril 2026

> Versión 2 — actualizada con el invoice REAL de abril 2026 ($23,938.19 USD total).
>
> ⚠️ Las rates NO se importan via CSV. Se capturan via UI (Billing Wizard + Rate Sheet en `app.extensiv.com/billing`) o via API (`POST /rates/`, `POST /pdmrates/`, etc.). Documento es fuente de verdad para captura.

## Asunciones

- **Contrato vigente**: derivado del invoice abril 2026 (cross-validado con V5c)
- **Currency**: doble columna USD + MXN @ 17.50 para que elijas según John responda
- **Precisión**: 4 decimales en USD (como aparece en invoice real)
- **Free days storage**: 0 (V5c no menciona — confirmar)

## Cross-check del invoice abril

| Métrica invoice | Valor |
|---|---:|
| Subtotal | $20,636.37 USD |
| IVA 16% | $3,301.82 USD |
| **TOTAL** | **$23,938.19 USD** |

Conceptos con cargo en abril: 13 (con qty > 0).
Conceptos con rate activo pero qty = 0 en abril: 12 (los configuramos igual).
**Total rates a configurar: 25**

---

## 📍 Billing Wizard (3PL WM legacy) — 4 entradas

### Tab Recur. Storage (1 rate)
| Campo | USD | MXN @ 17.50 |
|---|---|---|
| Default Unit | `Cubic Foot` | `Cubic Foot` |
| Free days | `0` | `0` |
| Rate per period | **$0.3200** /cu-ft/mes | **$5.60** /cu-ft/mes |
| Description | `Monthly storage per cubic ft` | `Monthly storage per cubic ft @ 17.50 MXN/USD` |

> En abril cobró: 48,843.12 cu-ft × $0.32 = **$15,629.80 USD** (76% del invoice).

### Tab Order/Receiver (1 rate de in/out)
| Campo | USD | MXN @ 17.50 |
|---|---|---|
| Unit | `Pallet` | `Pallet` |
| Rcv Handling | **$5.4100** | **$94.68** |
| Ship Handling | **$5.4100** | **$94.68** |
| Free Days | `0` | `0` |

> Pallet Inbound en abril: 196 × $5.41 = $1,060.36 USD.
> Pallet Outbound en abril: 0 qty (rate activo igual).

### Tab Manual — Reminders recurrentes (2)

**Reminder 1 — Cycle counts mensual:**
| Campo | USD | MXN @ 17.50 |
|---|---|---|
| CHARGE LABEL | `Cycle counts monthly` | `Cycle counts monthly` |
| UNIT | `Servicio` | `Servicio` |
| CHARGE PER UNIT | **$67.5700** | **$1,182.48** |
| DEFAULT QUANTITY | `1` | `1` |

> qty 0 en abril (no se hicieron cycle counts), pero el rate queda activo.

---

## 📍 Rate Sheet "Custom IFIT" — 21 entradas (app.extensiv.com/billing)

### Shipping / Fulfillment (8)

| Concepto | USD | MXN @ 17.50 | Unit | Qty abril | Status |
|---|---:|---:|---|---:|---|
| Order processing | **0.8108** | **14.19** | Per BOL | 237 | activo |
| Picking | **1.2500** | **21.88** | Per device | 309 | activo |
| Labeling | **0.1014** | **1.77** | Per device | 665 | activo |
| Reporting | **0.3378** | **5.91** | Per device | 309 | activo |
| Device Outbound | **4.8500** | **84.88** | Per device | 309 | activo |
| Pallet Outbound | **5.4100** | **94.68** | Per pallet | 0 | activo (qty 0 abril) |
| Pallet supply / pallet sales service | **16.0000** | **280.00** | Per pallet | 0 | activo (qty 0 abril) |
| Maneuver loading | **12.1622** | **212.84** | Per 30 min | 13 | activo |

### Inbound / Receiving (3 — además de Pallet en Billing Wizard)

| Concepto | USD | MXN @ 17.50 | Unit | Qty abril | Notas |
|---|---:|---:|---|---:|---|
| Device Inbound | **6.1100** | **106.93** | Per device a partir del 126 | 0 | **Tier rate**: first 125 free dentro de container 40'HC, 126+ cobra |
| Maneuver unloading | **12.1622** | **212.84** | Per 30 min | 0 | activo (qty 0 abril) |
| Unload truck with pallets | **95.0000** | **1,662.50** | Per truck | 1 | en abril descargaron 1 truck de pallets |

### Adjustments / Material handling (5)

| Concepto | USD | MXN @ 17.50 | Unit | Qty abril | Notas |
|---|---:|---:|---|---:|---|
| Wrapping | **4.9500** | **86.63** | Per device | 88 | activo |
| Strapping | **4.0541** | **70.95** | Per device | 88 | activo |
| Double strapping | **5.4100** | **94.68** | Per device | 0 | activo (qty 0 abril) |
| Double strapping for double stack pallet | **10.8200** | **189.35** | Per pallet | 0 | **distinta a double strapping simple** |
| Pallet consolidation | **6.0800** | **106.40** | Per device | 36 | activo |
| Pallet consolidation per accessory | **0.6800** | **11.90** | Per accessory | 11 | activo |

### Storage adjustments (1)

| Concepto | USD | MXN @ 17.50 | Unit | Qty abril | Notas |
|---|---:|---:|---|---:|---|
| Storage order picked not collected | **2.7027** | **47.30** | Per order/dia | 52 | activo — órdenes recogidas tarde |

### Heavy unloading (2)

| Concepto | USD | MXN @ 17.50 | Unit | Qty abril | Notas |
|---|---:|---:|---|---:|---|
| Unload ocean container 40'HC | **675.0000** | **11,812.50** | Per container | 0 | flat + Device Inbound excedente |
| Unload ocean container 20'HC | **290.0000** | **5,075.00** | Per container | 0 | flat |

### Inventory (1 — además de Cycle counts en Billing Wizard)

| Concepto | USD | MXN @ 17.50 | Unit | Qty abril | Notas |
|---|---:|---:|---|---:|---|
| Whole count | **304.0541** | **5,320.95** | Per request | 0 | NO confundir con cycle counts |

### Overtime (1)

| Concepto | USD | MXN @ 17.50 | Unit | Qty abril | Notas |
|---|---:|---:|---|---:|---|
| Overtime rate per hour | **95.0000** | **1,662.50** | Per hour | 3 | en abril 3 horas overtime = $285 |

---

## Resumen total de rates

| Bucket | Activos rate | Cobrados en abril | $ abril (USD) | % invoice |
|---|---:|---:|---:|---:|
| Billing Wizard (Storage + Pallet + Cycle) | 4 | 2 | $16,690.16 | 81% |
| Rate Sheet — Shipping/Fulfillment | 8 | 6 | $1,765.07 | 9% |
| Rate Sheet — Inbound | 3 | 1 | $95.00 | <1% |
| Rate Sheet — Adjustments | 6 | 4 | $1,018.72 | 5% |
| Rate Sheet — Storage adj | 1 | 1 | $140.54 | 1% |
| Rate Sheet — Heavy unload | 2 | 0 | $0 | 0% |
| Rate Sheet — Inventory | 1 | 0 | $0 | 0% |
| Rate Sheet — Overtime | 1 | 1 | $285.00 | 1% |
| **TOTAL** | **25** | **15** | **$20,636.37** | **100%** ✅ |

---

## Pasos de captura en orden

1. **Decision currency** (espera respuesta de John): USD nativo o MXN @ 17.50
2. Login a Extensiv 3PL WM legacy
3. Customers → I Fit Inc. → **Billing Wizard**
4. Tab Recur. Storage → captura línea Cubic Foot → Save
5. Tab Order/Receiver → captura línea Pallet (Rcv + Ship) → Save
6. Tab Manual → captura Cycle counts reminder → Save
7. Salir del Billing Wizard
8. Login a `app.extensiv.com/billing`
9. Rate Sheets → **New Rate Sheet** → Name = `Custom IFIT`
10. Add Rate × 21 con los valores de las tablas arriba
11. Save Rate Sheet
12. Customers → I Fit Inc. → Assignments → asignar `Custom IFIT` → Save

**Tiempo estimado total**: 90-120 min (vs ~30 min via API si se hace por código)

---

## Validación post-setup

Genera invoice de mayo 2026 en Extensiv y compara contra el cálculo manual usando estas rates.

**Pruebas de smoke críticas:**
- Storage cu-ft × $0.32 debe coincidir con tu cálculo Excel
- Picking × 1.25 = total picking del mes
- 237 BOLs × $0.8108 = $192.16 (abril)
- 309 devices × $4.85 = $1,498.65 outbound (abril)

Diff esperado vs cálculo manual: <0.5% (las decimales propagan).

---

## Conceptos NO en este Rate Sheet (manual cuando ocurran)

Los siguientes son rates configurados pero que solo el operador captura cuando se da el evento (no son periódicos):

- Unload ocean container 40'HC (cuando llega contenedor)
- Unload ocean container 20'HC (cuando llega contenedor)
- Unload truck with pallets (cuando descarga truck)
- Maneuver unloading (per 30 min)
- Maneuver loading (per 30 min)
- Whole count (cuando cliente lo solicita)
- Overtime hours

Ver `04_manual_adjustments_cheatsheet.md` para el flujo del operador.
