# Mitra Click — Sistema operativo

Sistema propio de **Mitra Click** para operar el negocio de punta a punta:
clientes, proveedores, catálogo, cotizaciones, pedidos (Shopify y venta directa),
compras, bodega con etiquetas NFC/QR, logística, remisiones, facturas y pagos, con
bitácora de cambios, pendientes, KPIs, agentes y reportes.

> Estado: **Fase A (fundación) en curso.** Funcionan el inicio de sesión, la
> navegación, Usuarios y permisos y la Bitácora. Los demás módulos aparecen como
> "en construcción". El modelo operativo de la base está escrito pero aún no se
> aplica en Supabase; no hay conexión con Shopify ni datos cargados.

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
- `docs/DATABASE.md`: modelo de datos, roles, seguridad y cómo aplicar el esquema.
- `.claude/skills/`: skills del proyecto y su procedencia.
