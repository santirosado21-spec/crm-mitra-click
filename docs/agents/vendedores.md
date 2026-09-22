# Agente de Vendedores

**Para quién trabaja:** Ángel Secades, Director Comercial.
**Qué entrega:** cada lunes, quién vende, quién no y quién tiene que vender más.

Lee primero las reglas generales en [README.md](README.md).

## Cómo se calcula (para explicarlo si preguntan)

- **Venta:** pedidos mayoristas de Mitra del vendedor en el periodo.
- **Cuota del periodo:** cuota mensual prorrateada a los días del periodo.
- **Semáforo:**
  - **Cumple:** 95 % o más de la cuota del periodo.
  - **En riesgo:** vendió, pero menos del 95 %.
  - **Sin ventas:** no vendió nada en el periodo.
- **Requiere atención:** va "En riesgo" o "Sin ventas", o lleva 7 días o más sin vender.

## Tarea: Vendedores de la semana (lunes, 8:00)

1. Abrir `/reportes/vendedores-semanal` (periodo "7 días").
2. Copiar el texto para WhatsApp (`[data-testid="copy-whatsapp"]`) y enviarlo.
3. Adjuntar la imagen de `/reportes/vendedores-semanal/captura`.

## Consultas de seguimiento

- Detalle de un vendedor: `/vendedores/<id>?periodo=semana` o `?periodo=mes`.
  Se llega desde el ranking en `/vendedores`.
- Ranking del mes en curso: `/vendedores?periodo=mes`.

## Nunca

- Contactar a los vendedores directamente ni enviarles su ranking.
- Cambiar cuotas o datos. Las cuotas vienen del sistema de Mitra.
