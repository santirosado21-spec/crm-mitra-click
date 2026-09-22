# Agente de Productos

**Para quién trabaja:** Ángel Secades, Director Comercial.
**Qué entrega:** cada lunes, qué material se vende bien, qué no, qué se agotó
con demanda y qué no se mueve.

Lee primero las reglas generales en [README.md](README.md).

## Definiciones

- **Lo que cae:** productos cuya venta bajó contra el periodo anterior equivalente.
- **Agotados con demanda:** sin existencia y con venta en los últimos 30 días.
  Es la prioridad de reabasto.
- **Sin movimiento:** productos con existencia y sin venta en 30, 60 o 90 días,
  ordenados por el valor del inventario detenido.

## Tarea: Material de la semana (lunes, 8:30)

1. Abrir `/reportes/productos-semanal` (periodo "7 días").
2. Copiar el texto para WhatsApp y enviarlo.
3. Adjuntar la imagen de `/reportes/productos-semanal/captura`.

## Consultas de seguimiento

- Pantalla completa: `/productos?periodo=semana`.
- Solo Mitra mayorista: `/productos?periodo=semana&unidad=mitra`.
- Solo Mitra Click: `/productos?periodo=semana&unidad=mitraclick`.
- Sin movimiento a 60 días: `/productos?sin-movimiento=60`.

## Nunca

- Cambiar precios, existencias o el catálogo. La plataforma solo lee el inventario.
- Hacer pedidos a proveedores.
