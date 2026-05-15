# IFIT — Setup de Billing en Extensiv (paquete v3 FINAL)

> **Versión 3 — basada en export real de Extensiv `itemsGridExport-20260514053632.txt`**
> Cross-validado contra invoice abril 2026.

## Archivos en esta carpeta

| Archivo | Status | Subir? |
|---|---|---|
| `01_skus_dimensions_FINAL.csv` | ✅ Definitivo — 41 SKUs con dimensiones | **SÍ** (modo UPDATE-ONLY) |
| `01_skus_dimensions_DRAFT_v2.csv` | Histórico — draft con 18 + 24 TODO | NO (referencia) |
| `02_virtual_skus_DEPRECATED.csv` | Deprecado — virtual items van por Opción B | NO |
| `03_rates_setup_TABLE.md` | 25 rates contractuales | Captura UI (no es CSV) |
| `04_manual_adjustments_cheatsheet.md` | 11 conceptos manuales + $17,500 MXN infra mensual | Documento operativo |
| `05_anomalias_pendientes.md` | 6 SKUs anomalía + virtual items pendientes | Resolver con almacén |

## Findings inspección 2026-05-14

### Confirmaciones clave

1. ✅ **Escenario B confirmado**: TODAS las dimensiones de los 47 SKUs IFIT en Extensiv están **vacías**. Esto significa:
   - El storage de $15,629.80 USD del invoice abril NO se calculó desde dims en Extensiv → se aplicó como adjustment manual o vía mecanismo paralelo.
   - **Subir el CSV `01_skus_dimensions_FINAL.csv` SÍ es necesario** y NO pisa nada existente. Cero riesgo de conflicto.

2. ✅ **Casing del export coincide con mi CSV** — todo en MAYÚSCULAS.

3. ✅ **41 SKUs listos para upload** con dimensiones del invoice abril (convertidas pies × 12 = pulgadas).

### Hallazgos importantes

| Hallazgo | Impacto |
|---|---|
| 47 SKUs en export vs 44 en invoice storage | 6 SKUs anomalía (ver `05_anomalias_pendientes.md`) |
| Virtual items (FORKLIFT etc.) NO en export | Cambiar a **Opción B** = adjustment manual ~$17,500 MXN/mes |
| 6 SKUs sin peso en invoice | Pesos vacíos en CSV — verificar en dry-run que Extensiv los ignora |
| 1 SKU en invoice no existe en export (`NTRW19423`) | Probable rename a `NTRW19425`; confirmar con almacén |
| `NTL49926-1` confirmado con `-1` (no `-1000`) | Mi suposición previa estaba mal |
| `NTEL71426` confirmado como SKU real (no typo) | Sin dims aún, pedir al almacén |

## Plan de upload — Paso a paso

### Paso 0 — Backup obligatorio (5 min)

```
Extensiv → Items > Manage Items → Filter Customer = IFIT → Export
```

Guarda como `IFIT-items-backup-2026-05-14.txt` en una carpeta segura. **Ya tienes ese archivo** (el que me compartiste), úsalo como backup oficial.

### Paso 1 — Dry run con 1 SKU (10 min)

1. Crea un archivo `01_test_1sku.csv` con solo la primera fila + un SKU bajo riesgo:
   ```
   Sku,LabelingUnitLength,LabelingUnitWidth,LabelingUnitHeight,LabelingUnitWeight
   TMAK213,22.80,6.00,3.00,6
   ```
   (Elegí TMAK213 — accessory kit, low criticality, cu-ft pequeño).

2. En Extensiv: `Items > Import Items` → **Update Existing Items Only** (modo UPDATE).

3. Sube `01_test_1sku.csv`.

4. Verifica en UI:
   - Abre TMAK213 → tab Packaging / Units of Measure
   - Las 4 dimensiones deben aparecer: L=22.80, W=6.00, H=3.00, Wt=6
   - El resto del SKU intacto (description, customer, UoM, UPC, etc.)

5. Si OK → continuar al Paso 2. Si algo raro → para y revisamos.

### Paso 2 — Subir CSV completo (15 min)

Sube `01_skus_dimensions_FINAL.csv` (40 SKUs restantes, sin TMAK213) en modo **Update Existing Only**.

Verifica el log de Extensiv:
- ✅ 40 filas updated
- ❌ 0 rows skipped/error
- Si hay errores: revisar y reportar

### Paso 3 — Verificar 5 SKUs random (10 min)

Abre 5 SKUs random después del upload y confirma dimensiones correctas:
- `NTL14125` → 84.00 × 36.00 × 22.08, 308 lb
- `PFTL90924` → 60.00 × 24.00 × 20.52, 250 lb
- `NTEX02425` → 48.00 × 23.16 × 36.00, 200 lb
- `NTL29225` → 72.00 × 36.00 × 42.48, 413 lb
- `NTEL71625` → 63.00 × 30.96 × 33.12, 289 lb

### Paso 4 — Validar storage charge para mayo (al cierre del mes)

Cuando se genere el invoice mayo:
1. Anota el storage cu-ft total que cobra Extensiv
2. Compara contra cálculo manual con las dims subidas
3. Diff esperado: **<2%**
4. Si diff >5% → revisar SKU por SKU

### Paso 5 — Capturar las 25 rates (90-120 min)

Ver `03_rates_setup_TABLE.md` para el detalle paso a paso. Esto es independiente del upload de dimensiones.

### Paso 6 — Setup adjustment recurrente de virtual items (5 min)

En Customer > IFIT > Charges → Add Recurring Charge mensual:
- Description: "Storage infraestructura - FORKLIFT + AREA + PALLETS"
- Amount: **$17,500 MXN/mes** (≈ $1,000 USD)
- Frecuencia: Monthly
- Categoría: Storage Adjustment

(El cálculo: FORKLIFT $1,895 + AREA $727 + CLAMPS $380 + PALLETS $14,495 = $17,497 MXN/mes según invoice abril)

## Decisiones tomadas con el export

| Decisión | v2 (draft) | v3 (final) |
|---|---|---|
| Currency | Pendiente John | Mantener pendiente — capturamos en MXN @ 17.50 con doble columna en `03_rates_setup_TABLE.md` |
| Escenario A/B | Desconocido | **B confirmado** — dims vacías en Extensiv |
| Items no-SKU | Opción A (virtual SKUs) | **Opción B** (adjustment manual $17,500 MXN) — porque virtual items NO están como Items en Extensiv |
| SKUs a subir | 44 (con TODOs) | **41 reales** + 7 anomalías documentadas separado |
| Cycles counts | Manual reminder Billing Wizard | Igual — sin cambio |

## Riesgos residuales

| Riesgo | Mitigación | Probabilidad |
|---|---|---|
| Pesos vacíos sobrescriben pesos buenos | Dry-run con TMAK213 (que tampoco tiene peso actualmente) | Baja |
| `NTRW19423` se rompe (no existe en Extensiv) | NO está en el CSV final, no se sube — sin riesgo | Cero |
| Anomalías introducen confusión operativa | Documentadas en `05_anomalias_pendientes.md` para resolver con almacén | Baja |
| Storage mayo no matchea cálculo manual | Validación en Paso 4 detecta antes del cierre | Baja |

## Tiempo total estimado para completar IFIT

| Tarea | Tiempo |
|---|---|
| Paso 0-3 (upload + verificación) | **40-50 min** |
| Paso 4 (validación cierre mayo) | 30 min (al cierre) |
| Paso 5 (captura 25 rates UI) | **90-120 min** |
| Paso 6 (recurring adjustment virtual) | 5 min |
| Resolver anomalías con almacén | offline, no bloquea |
| **TOTAL focus time** | **~2.5-3 horas** |
