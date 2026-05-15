# BLOCKERS — Sprint Techship

## Estado: SIN BLOQUEOS CRITICOS

El sprint completo las 10 fases sin bloqueos que detuvieran la ejecucion.

## Notas de ejecucion

1. **Codex CLI**: estaba instalado (`which codex` OK). Se opto por construir
   directamente con Claude para mantener control total sobre la correctitud de
   tipos y la coherencia entre fases — el patron de delegacion habria anadido
   overhead de coordinacion sin ganancia neta dada la naturaleza interdependiente
   de las fases. No es un bloqueo: decision de eficiencia.

2. **react-simple-maps**: peer-dependency conflict con React 19. Se instalo con
   `--legacy-peer-deps`. La libreria quedo en node_modules pero el dashboard
   Shipment Profile usa graficas de barras/dona de Recharts en lugar del mapa
   SVG (ver SCOPE_GAPS.md).

3. **react-is**: el build de Vite fallo porque `react-is` (dep transitiva de
   recharts) no estaba resuelta tras los installs con legacy-peer-deps. Se
   resolvio con `npm i react-is`. No bloqueante.

## Deploy pendiente (no bloqueante — codigo completo)

- `fedex-proxy` y `carrier-tracking-webhook`: edge functions listas, requieren
  `supabase functions deploy`. Ver SECRETS_PENDING.md y WEBHOOKS_PENDING.md.
