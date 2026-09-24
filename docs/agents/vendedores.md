# Agente de Vendedores

**Foco:** quién vende, quién no y quién tiene que vender más (vendedores de Mitra mayorista).
Los reportes y su envío se configuran en Grok Bot. Lee primero [README.md](README.md).

## Dónde está cada dato

| Pregunta | Pantalla | Qué leer |
|---|---|---|
| Ranking de la semana | `/vendedores?periodo=semana` | `rep-leaderboard`, filas `rep-row-<id>` |
| Ranking del mes | `/vendedores?periodo=mes` | Igual, con cuota prorrateada al mes en curso |
| ¿Quién requiere atención? | `/vendedores` | `reps-attention` (del caso más grave al menos grave) |
| Detalle de un vendedor | `/vendedores/<id>?periodo=mes` | Venta vs cuota, venta diaria, material que vende, cartera, cotizaciones abiertas |

## Cómo se calcula

- **Venta:** pedidos mayoristas del vendedor en el periodo.
- **Cuota del periodo:** cuota mensual prorrateada a los días del periodo.
- **Semáforo** (`data-status` de cada fila):
  - `cumple`: 95 % o más de la cuota del periodo.
  - `riesgo`: vendió, pero menos del 95 %.
  - `sin-ventas`: no vendió en el periodo.
- **Requiere atención:** va en `riesgo` o `sin-ventas`, o lleva 7 días o más sin vender.

## Nunca

- Contactar a los vendedores directamente.
- Cambiar cuotas o datos. Las cuotas vendrán del sistema de Mitra.
