# Agentes de Grok Bot en MitraClick Intelligence

Los agentes de IA de Mitra operan desde **Grok Bot (xAI)**. Los reportes, los
envíos por WhatsApp y las automatizaciones se definen y ejecutan **en Grok Bot**.
Esta plataforma solo les da los datos: dashboards con links estables y
selectores que pueden leer.

| Agente | Guía | Pantallas principales |
|---|---|---|
| Agente Ejecutivo | [ejecutivo.md](ejecutivo.md) | `/`, `/mitra`, `/mitra-click` |
| Agente de Vendedores | [vendedores.md](vendedores.md) | `/vendedores`, `/vendedores/<id>` |
| Agente de Productos | [productos.md](productos.md) | `/productos` |

## Acceso

- **URL:** https://mitraclick-intelligence-review.vercel.app (demo con datos simulados).
- **Cuenta:** la cuenta de Google compartida de agentes. El inicio de sesión con
  Google todavía no está implementado; hoy la demo no pide sesión.
- **Perfil:** cuando exista el login, cada agente elegirá su perfil al entrar.

## Links con filtros

Todas las pantallas de dirección aceptan el periodo en la URL, así el mismo link
siempre reproduce la misma vista con los datos más recientes:

- `?periodo=hoy`, `semana` (7 días), `mes` (mes en curso), `30d` o `90d`.
- Productos además acepta `?unidad=mitra` o `?unidad=mitraclick`, y `?sin-movimiento=30|60|90`.

## Selectores estables (`data-testid`)

| Dato | Selector |
|---|---|
| Barra de filtros y periodo activo | `filter-bar`, `filter-period`, `filter-unit`, `period-label` |
| Avance del mes contra meta | `goal-progress`, `goal-mitra`, `goal-mitraclick`, `month-total` |
| Venta de hoy | `today-sales` |
| KPIs del Resumen | `kpi-mitra`, `kpi-mitraclick`, `kpi-orders`, `kpi-ticket` (valor en `<id>-value`) |
| Ranking de vendedores | `rep-leaderboard`; filas `rep-row-<id>` con `data-status` = `cumple`, `riesgo` o `sin-ventas` |
| Vendedores que requieren atención | `reps-attention` |
| Productos | `table-products-top`, `table-products-bottom`, `table-products-falling`, `products-stockouts-list`, `products-slow` |
| Estado de los datos | `data-mode` ("Datos simulados"), `source-stamp` (fuente, periodo y fecha) |

## Reglas para todos los agentes

1. **Solo lectura.** No modificar datos, no mover oportunidades, no restablecer datos.
2. **No inventar cifras.** Usar los valores que muestra la plataforma. Si un número
   parece incorrecto, reportarlo a Santiago en lugar de corregirlo.
3. **Datos simulados.** Mientras aparezca "Datos simulados", las cifras no son reales.
4. **Nunca** compartir credenciales ni datos de clientes fuera de lo que se reporta.
