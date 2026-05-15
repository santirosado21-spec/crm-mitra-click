# IFIT — Anomalías y SKUs pendientes de decisión

> Generado del cross-match entre el export `itemsGridExport-20260514053632.txt` (47 SKUs en Extensiv) y la storage table del invoice abril 2026 (44 SKUs con cu-ft).

## SKUs en Extensiv SIN dimensiones que no pudimos asignar

Estos existen como Items en IFIT pero NO aparecen en el storage table del invoice abril, así que **no tenemos dimensiones para asignarles**. Quedan sin cu-ft hasta que el almacén las mida.

| SKU | Description en Extensiv | Acción sugerida |
|---|---|---|
| `NTEL71426` | ELLIPTICALS NORDICTRACK AIRGLIDE 16 | Pedir dims al almacén. SKU activo, recibieron 12u en abril. |
| `NTL49926-1` | ORDICTRACK ULTRA 3 TREADMILL | Pedir dims. Recibieron 1u en abril. **Nota typo en description: "ORDIC" sin N inicial.** |
| `BTEX02425` | EXERCISE BIKE NORDICTRACK X24BIKE | **Probable duplicado** de `NTEX02425` (misma description). Sospechar typo histórico (B vs N). Confirmar con almacén si se puede desactivar. |
| `NTLE71423` | Confirmar descripción | **Item sin descripción válida**. Probable typo de `NTEL71423`. Recomendado desactivar o renombrar. |
| `NAMSDB20 LX` | LX, NT, 55LB SELECT-A-WEIGTH PAI | **Variant con espacio en el SKU code**. Distinto a `NAMSDB20` principal. Validar si es variant real o duplicado. |
| `SBH-INT-F-021` | PATAS METALICAS | **NO es fitness equipment**. Aparentemente material de mobiliario. ¿Pertenece realmente a IFIT? |

## SKU en invoice abril pero NO en Extensiv

| SKU | Description (invoice) | Hipótesis |
|---|---|---|
| `NTRW19423` | RO,NORDICTRACK RW900 | Aparece en storage table abril con qty=0. **NO existe en el export**. Probablemente renombrado a `NTRW19425` (que sí existe y es "ROWER NORDICTRACK RW900"). Confirmar con almacén. |

## Tipografía y consistencia detectada

- `NTL49926-1` description en Extensiv: "ORDICTRACK..." — falta la N inicial → cosmético, no afecta facturación
- `PFEL07525` description: "EL,PROFORM TRAINER H" — falta la L final de "HL"
- `PFEX40122` description: "EXERCISE BIKE PROFORM SPORT CX" — correcto
- `NTEL71625` description: "EL,NT FREESTRIDE TRAINER FS14**l**" — minúscula L en lugar de I
- `NTL10425` description: "TL NORDIC**K**TRACK T SERIE**8**" — typo K extra, 8 en lugar de 7

Estos typos son cosméticos. **No afectan el upload de dimensiones** pero conviene flaggearlos al admin para fix futuro.

## Pesos vacíos en 6 SKUs (de los 41 listos para upload)

| SKU | Razón |
|---|---|
| `HRMC1098` | Peso "—" en invoice (faltante) |
| `PFTL38825` | Peso missing en invoice |
| `NTL15725CW` | Peso missing en invoice |
| `PFEL07525` | Peso missing + qty 0 en abril |
| `NTEX50725CW` | Peso missing |
| `NTRW39125` | Peso missing |
| `NTL16426-1000` | Peso missing |

El CSV `01_skus_dimensions_FINAL.csv` deja el campo vacío en estos. Si Extensiv interpreta vacío = "no tocar" → seguro. Si interpreta como NULL → no se asigna peso. Verificar comportamiento en dry-run.

## Virtual items (FORKLIFT, ORDER PROCESING, etc.)

**NO están en el export de Items.** Eso significa que los 4 items virtuales del invoice (FORKLIFT, ORDER PROCESING, FORKLIFT (Accesory), PALLETS) **no viven como SKUs en Extensiv**.

Probablemente están en:
- **Customer > IFIT > Storage Charges/Rates** (Storage Rates a nivel customer, no item)
- **Manual adjustments mensuales** (alguien captura el monto a mano cada cierre)
- **Items en otra cuenta** (NTMX-USA-43-2 secondary?)

### Recomendación

**Cambiar a Opción B** (descartada en draft v2): hacer adjustment manual mensual de ~$17,500 MXN por el storage de infraestructura, en lugar de crear SKUs virtuales.

Razones:
1. Crear los 4 como Items nuevos en Extensiv requiere data setup (UoM, customer assignment, etc.)
2. Sus dimensiones físicas no tienen sentido como "items" inventariables
3. El monto es fijo cada mes (~$17,500), fácil de capturar como adjustment recurrente
4. Mantiene Items limpio = solo SKUs reales del cliente

**Archivo a deprecar**: `02_virtual_skus_OPCION_A.csv` se renombra a `02_virtual_skus_DEPRECATED.csv` y se documenta que no se subió.

## Pendientes para resolver con el almacén

1. **Dimensiones físicas** de:
   - NTEL71426 (AIRGLIDE 16)
   - NTL49926-1 (ULTRA 3 TREADMILL)

2. **Confirmar status** de los SKUs anómalos:
   - ¿Desactivamos `BTEX02425` (duplicado de `NTEX02425`)?
   - ¿Desactivamos `NTLE71423` (typo de `NTEL71423`)?
   - ¿Qué es `NAMSDB20 LX` (variant con espacio)?
   - ¿`SBH-INT-F-021` (PATAS METALICAS) pertenece a IFIT?

3. **Confirmar fate** de `NTRW19423` — ¿renombrado a `NTRW19425` o desactivado?

4. **Mejorar descriptions** (cosmético) de:
   - NTL49926-1: "ORDICTRACK..." → "NORDICTRACK ULTRA 3 TREADMILL"
   - PFEL07525: "EL,PROFORM TRAINER H" → "EL,PROFORM TRAINER HL"
   - NTL10425: "TL NORDIC**K**TRACK T SERIE**8**" → "TL,NORDICTRACK,T SERIES 7"

Ninguno de estos bloquea el upload del CSV de dimensiones.
