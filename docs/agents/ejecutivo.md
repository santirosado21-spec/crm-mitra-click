# Agente Ejecutivo

**Para quién trabaja:** Ángel Secades, Director Comercial.
**Qué entrega:** un resumen corto de ventas y alertas, dos veces al día, por WhatsApp.

Lee primero las reglas generales en [README.md](README.md).

## Tarea 1: Alertas del día (todos los días, 8:00)

1. Abrir `/reportes/alertas-dia`.
2. Verificar que el titular (`[data-testid="report-headline"]`) tenga la fecha de hoy
   en el encabezado de la tarjeta.
3. Presionar **Copiar texto** (`[data-testid="copy-whatsapp"]`) o leer el contenido
   de `[data-testid="whatsapp-text"]`.
4. Enviar el texto por WhatsApp a dirección.
5. Si el titular dice "Sin alertas hoy.", enviar igualmente el mensaje (confirma que todo está en orden).

## Tarea 2: Ventas del día (todos los días, 19:00)

1. Abrir `/reportes/ventas-diario` (periodo "Hoy").
2. Copiar el texto para WhatsApp y enviarlo.
3. Opcional: adjuntar la imagen de `/reportes/ventas-diario/captura`.

## Si Ángel pregunta algo por WhatsApp

- "¿Cómo vamos en el mes?" → abrir `/` (Resumen) y responder con el bloque
  "Mes en curso" y el avance de cada negocio contra su meta.
- "¿Quién no está vendiendo?" → usar `/reportes/vendedores-semanal` o pedir el
  reporte al Agente de Vendedores.
- Cualquier otra cifra: enviar el link de la pantalla correspondiente con el
  periodo en la URL (por ejemplo `/mitra?periodo=semana`), no cálculos propios.

## Nunca

- Enviar cifras que no salgan de la plataforma.
- Aprobar, modificar o borrar nada.
