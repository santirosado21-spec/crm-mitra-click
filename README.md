# Mitra Click — Sistema operativo

Sistema propio de **Mitra Click** para operar el negocio de punta a punta:
clientes, proveedores, catálogo, cotizaciones, pedidos (Shopify y venta directa),
compras, bodega con etiquetas NFC/QR, logística, remisiones, facturas y pagos, con
bitácora de cambios, pendientes, KPIs, agentes y reportes.

> Estado: **todas las fases están escritas; solo las migraciones 1 a 4 están aplicadas** en
> Supabase (accesos, catálogo, clientes y bodega). Las migraciones 5 a 10 y las Edge
> Functions siguen pendientes, y nada se ha probado con datos. Lo verificado son las
> reglas puras (pruebas), el tipado y el build. Ver `docs/PUESTA_EN_MARCHA.md`.

## Stack

React 19 · TypeScript · Vite 7 · React Router 7 · Tailwind CSS 4 · Vitest ·
Supabase (Postgres, RLS por rol) · Vercel.

## Desarrollo

```bash
npm ci
cp .env.example .env.local   # URL y publishable key de Supabase (valores públicos)
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
- `docs/MITRACLICK_ARCHITECTURE_AND_SCOPE.md`: alcance, fases y límites.
- `docs/DATABASE.md`: modelo de datos, roles y seguridad.
- `docs/PUESTA_EN_MARCHA.md`: pasos para dejarlo operando, decisiones por defecto y validación.
- `.claude/skills/`: skills del proyecto y su procedencia.
