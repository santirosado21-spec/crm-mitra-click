# IFIT — Adjustments manuales (NO se automatizan periódicamente)

> Estos conceptos están **configurados como rates en el Rate Sheet** pero solo aplican cuando ocurre el evento específico. El operador los activa capturando un Charge en Extensiv cuando suceden.

## Tabla de adjustments

| Concepto V5c | USD | MXN @ 17.50 | Unit | Cuándo capturarlo |
|---|---:|---:|---|---|
| Storage order picked not collected | **2.7027** | **47.30** | Per order/day | Cuando una orden quedó preparada pero el cliente no la recogió a tiempo |
| Maneuver unloading | **12.1622** | **212.84** | Per 30 min | Cuando llega carga mal posicionada y requiere maniobra extra |
| Maneuver loading | **12.1622** | **212.84** | Per 30 min | Por cada 30 min de maniobra al embarcar (qty 13 en abril = $158.11) |
| Unload truck with pallets | **95.0000** | **1,662.50** | Per truck | Cada vez que se descarga un camión completo de pallets (qty 1 en abril) |
| Unload ocean container 40'HC | **675.0000** | **11,812.50** | Per container | Por cada contenedor 40' descargado (incluye 125 devices, excedente cobra Device Inbound) |
| Unload ocean container 20'HC | **290.0000** | **5,075.00** | Per container | Por cada contenedor 20' descargado |
| Whole count (inventario físico) | **304.0541** | **5,320.95** | Per request | Por cada inventario físico completo solicitado |
| Overtime rate per hour | **95.0000** | **1,662.50** | Per hour | Por cada hora de overtime trabajada (qty 3 en abril = $285) |
| Pallet supply / pallet sales service | **16.0000** | **280.00** | Per pallet | Cuando se venden pallets al cliente |
| Double strapping (simple) | **5.4100** | **94.68** | Per device | Cuando se aplica double strapping en device |
| Double strapping for double stack pallet | **10.8200** | **189.35** | Per pallet | Cuando se aplica double strap en pallet apilado doble |

## Cómo capturar en Extensiv

1. Customers → I Fit Inc. → **Charges** tab
2. Click **Add Charge** (o **+ Charge** en Billing Manager nuevo)
3. Selecciona:
   - Charge Type: `Adjustment` (no recurrente)
   - Category: ajustar al concepto (Receiving / Shipping / Inventory)
   - Description: copiar exactamente del concepto
   - Qty: cantidad real del evento
   - Charge per Unit: el valor de la tabla
4. Save → queda como Pending Charge en la factura del mes en curso

## Operator notes críticas

### Container 40'HC con >125 devices

Cobrar AMBOS:
1. Flat $11,812.50 MXN por la descarga del contenedor
2. Device Inbound $106.93 MXN × (devices - 125) por excedentes

Ejemplo: 150 devices en un 40'HC →
- Container fee: $11,812.50
- Excedente: 25 × $106.93 = $2,673.25
- **Total**: $14,485.75 MXN

### Maneuver loading/unloading

Granularidad de **30 min**. Redondeo hacia arriba.
- 45 min reales → cobrar 2 unidades = $425.68 MXN
- 60 min reales → cobrar 2 unidades = $425.68 MXN
- 75 min reales → cobrar 3 unidades = $638.52 MXN

### Whole count vs cycle counts

- **Whole count** = inventario físico completo solicitado por cliente. Solo cuando él lo pide explícito. $5,320.95 MXN per request.
- **Cycle counts** = parcial, mensual, automático via Manual Reminder en Billing Wizard. NO confundir.

### Overtime

Solo cuando el cliente solicita extender turno o por urgencias. **Documentar quién autorizó** en el memo del charge. Por hora completa (no se prorratea).

### Pallet supply

Cuando IFIT compra pallets nuevos a nuestro inventario. NO confundir con pallets que ya son del cliente.

---

## Historial de uso en abril 2026

| Concepto | Qty cobrada | $ USD |
|---|---:|---:|
| Storage picked not collected | 52 | $140.54 |
| Maneuver loading | 13 | $158.11 |
| Unload truck with pallets | 1 | $95.00 |
| Overtime | 3 | $285.00 |
| **Total adjustments** | | **$678.65** |

Cero ocurrencias en abril de: containers 40'/20', maneuver unloading, whole count, pallet supply, double strapping.
