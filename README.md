# Mitra Click — Sistema operativo

Sistema propio de **Mitra Click** para operar el negocio de punta a punta:
clientes, proveedores, catálogo, cotizaciones, pedidos (Shopify y venta directa),
compras, bodega (layout, mapa, surtido por recorrido y operación del día), logística,
remisiones, facturas y pagos, con bitácora de cambios, pendientes, KPIs, agentes y reportes.

> Estado: **todas las fases están escritas y el esquema está aplicado en Supabase.** Las Edge Functions están
> desplegadas. Falta conectar Shopify y validar con datos y personas reales.
> Verificado: reglas puras, tipado, build y un recorrido completo de cotización a pago en
> una transacción revertida. Ver `docs/PUESTA_EN_MARCHA.md`.

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
