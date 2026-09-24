# MitraClick Intelligence

Plataforma de inteligencia comercial para **Mitra** (B2B, material industrial) y
**Mitra Click** (e-commerce B2C). Muestra desempeño por vendedor, desempeño de
productos y dashboards ejecutivos. Los reportes, envíos por WhatsApp y
automatizaciones los hacen los agentes de Grok Bot leyendo estos dashboards.

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
- `docs/agents/`: guía para los agentes de Grok Bot (dónde leer cada dato).
- `.claude/skills/`: skills del proyecto y su procedencia.
