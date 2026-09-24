# Agente de Productos

**Foco:** qué material se vende bien, qué no, qué se agotó con demanda y qué no se mueve.
Los reportes y su envío se configuran en Grok Bot. Lee primero [README.md](README.md).

## Dónde está cada dato

| Pregunta | Pantalla | Qué leer |
|---|---|---|
| Más vendidos | `/productos?periodo=semana` | `table-products-top` |
| Menos vendidos | `/productos?periodo=semana` | `table-products-bottom` (incluye los que no vendieron) |
| Lo que cae | `/productos?periodo=semana` | `table-products-falling` |
| Agotados con demanda | `/productos` | `products-stockouts-list` |
| Sin movimiento | `/productos?sin-movimiento=30` (o 60, 90) | `products-slow` |
| Solo un negocio | agregar `&unidad=mitra` o `&unidad=mitraclick` | |

## Definiciones

- **Lo que cae:** productos cuya venta bajó contra el periodo anterior equivalente.
- **Agotados con demanda:** sin existencia y con venta en los últimos 30 días.
- **Sin movimiento:** con existencia y sin venta en 30, 60 o 90 días, ordenados
  por el valor del inventario detenido.

## Nunca

- Cambiar precios, existencias o catálogo. La plataforma solo lee el inventario.
