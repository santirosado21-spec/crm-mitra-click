# Agentes de Grok Bot en MitraClick Intelligence

Los agentes de IA de Mitra operan desde **Grok Bot (xAI)**. Cada uno usa la
plataforma por navegador, arma su reporte y lo envía por WhatsApp a dirección.
**La plataforma no envía mensajes**: el envío lo hace el agente desde Grok Bot.

| Agente | Instrucciones | Reportes |
|---|---|---|
| Agente Ejecutivo | [ejecutivo.md](ejecutivo.md) | Ventas del día (diario 19:00), Alertas del día (diario 8:00) |
| Agente de Vendedores | [vendedores.md](vendedores.md) | Vendedores de la semana (lunes 8:00) |
| Agente de Productos | [productos.md](productos.md) | Material de la semana (lunes 8:30) |

## Acceso

- **URL de la plataforma:** pendiente del deploy de producción. Hoy corre en demo.
- **Cuenta:** la cuenta de Google compartida de agentes. Pendiente: el login con
  Google llega en la Fase 5; mientras tanto la demo no pide sesión.
- **Perfil:** al entrar con la cuenta de agentes, elegir el perfil propio
  (Ejecutivo, Vendedores o Productos). La bitácora registra el perfil y la cuenta.

## Links estables

Cada reporte tiene tres links que no cambian. Siempre muestran los datos más
recientes:

| Qué | Link |
|---|---|
| Vista del reporte con texto para WhatsApp | `/reportes/<tipo>` |
| Solo la tarjeta, para captura de pantalla (ancho de teléfono) | `/reportes/<tipo>/captura` |
| Cambiar periodo | agregar `?periodo=hoy`, `?periodo=semana` o `?periodo=mes` |

Tipos: `ventas-diario`, `vendedores-semanal`, `productos-semanal`, `alertas-dia`.

## Elementos que el agente debe leer o usar

| Elemento | Selector estable |
|---|---|
| Texto para WhatsApp | `[data-testid="whatsapp-text"]` (textarea de solo lectura) |
| Botón copiar | `[data-testid="copy-whatsapp"]` |
| Tarjeta del reporte | `[data-testid="report-card"]` |
| Titular del reporte | `[data-testid="report-headline"]` |
| Aviso de datos simulados | `[data-testid="data-mode"]` |

## Reglas para todos los agentes

1. **Solo lectura.** No modificar datos, no mover oportunidades, no restablecer datos.
2. **No inventar cifras.** Enviar el texto tal como lo genera la plataforma. Si un
   número parece incorrecto, reportarlo a Santiago en lugar de corregirlo.
3. **Datos simulados.** Mientras el texto diga "(datos simulados)", el envío es
   de prueba: mandarlo solo al grupo de pruebas, no a Ángel.
4. **Un envío por reporte y por horario.** Si falla, reintentar una vez y avisar.
5. **Nunca** compartir credenciales, capturas de otras pantallas ni datos de
   clientes fuera del reporte.
