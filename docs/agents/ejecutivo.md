# Agente Ejecutivo

**Foco:** venta del día y del mes contra meta, de Mitra mayorista y de Mitra Click.
Los reportes y su envío se configuran en Grok Bot. Lee primero [README.md](README.md).

## Dónde está cada dato

| Pregunta | Pantalla | Qué leer |
|---|---|---|
| ¿Cuánto se vendió hoy? | `/?periodo=hoy` | `today-sales` y `kpi-mitra`, `kpi-mitraclick` |
| ¿Cómo vamos en el mes contra la meta? | `/` | `goal-progress`: venta del mes, meta, % del ritmo y cierre proyectado por negocio |
| ¿Qué pasa en el mayorista? | `/mitra?periodo=semana` | Venta, categorías, clientes sin comprar en 30+ días, cotizaciones por vendedor |
| ¿Qué pasa en la tienda en línea? | `/mitra-click?periodo=semana` | Venta, conversión, canales, embudo, agotados |
| ¿Qué alertas hay? | `/` | Panel "Alertas": vendedores fuera de cuota, agotados con demanda, clientes inactivos |

## Definiciones

- **Ritmo de meta:** venta del mes ÷ (meta × días transcurridos ÷ días del mes).
  100 % significa que va justo para cumplir la meta.
- **Cierre proyectado:** venta del mes ÷ días transcurridos × días del mes.
- **Variación:** contra el periodo anterior equivalente. "Hoy" se compara con el
  mismo día de la semana pasada; "Mes" con el mismo tramo del mes anterior.
