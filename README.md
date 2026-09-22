# MitraClick Intelligence

Plataforma de inteligencia comercial para **Mitra** (B2B, material industrial) y
**Mitra Click** (e-commerce B2C). Muestra desempeño por vendedor, desempeño de
productos, dashboards ejecutivos y reportes listos para enviarse por WhatsApp
mediante los agentes de Grok Bot.

> Estado: demostración con **datos simulados**. Todavía no hay conexión con el
> ERP de Mitra, Shopify ni Analytics.

## Stack

React 19 · TypeScript · Vite 7 · React Router 7 · Tailwind CSS 4 · Recharts ·
Vitest · Vercel.

## Desarrollo

```bash
npm ci
npm run dev
```

Controles de calidad antes de entregar:

```bash
npm run lint
npm run type-check
npm run test:run
npm run build
```

## Documentación

- `AGENTS.md`: reglas para cualquier agente de IA que modifique el repositorio.
- `docs/MITRACLICK_ARCHITECTURE_AND_SCOPE.md`: arquitectura, alcance e integraciones futuras.
- `docs/agents/`: instrucciones de operación para los agentes de Grok Bot.
- `.claude/skills/`: skills del proyecto y su procedencia.
