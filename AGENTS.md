# AGENTS.md — Sistema operativo de Mitra Click

Este archivo define el contexto y las reglas de trabajo para cualquier agente de IA que modifique este repositorio. Léelo completo antes de proponer o ejecutar cambios.

## 1. Objetivo del producto

Este repositorio es el **sistema operativo propio de Mitra Click**: clientes, proveedores, catálogo, cotizaciones, pedidos, compras, bodega, logística, remisiones, facturas y pagos, con una capa de control (pendientes, alertas, KPIs, agentes y reportes) y conexión con Shopify.

- **Un solo negocio: Mitra Click**, con dos canales de venta: `shopify` y `directo`. Mitra mayorista quedó fuera; no reintroducir la separación por unidad de negocio.
- **Documento base:** "Plan de Trabajo Mitra Click AI Implementation" (Ángel Secades, Santiago Rosado, Lorenzo Stoopen), 17 puntos. El plan de construcción aprobado se resume en `docs/MITRACLICK_ARCHITECTURE_AND_SCOPE.md`.
- **Agentes, reportes y alertas viven dentro de esta app** (decisión de oct-2026, que revierte la anterior de dejarlos en Grok Bot).

### Estado actual (esquema aplicado; sin validar con personas)

No presentar el sistema como productivo. Hoy:

- **Escrito y aplicado:** las fases A a I completas en la app, y las 10 migraciones aplicadas en Supabase (7-oct-2026). El detalle está en `docs/DATABASE.md`.
- **Verificado:** reglas puras (pruebas unitarias), tipado, build, advisors, y un recorrido completo de cotización a pago dentro de una transacción revertida, con permisos por rol. No hay datos reales ni de prueba cargados.
- **Sin validar:** ninguna pantalla se ha usado con sesión real, ni revisado visualmente en 1440 px y 390 px con datos.
- **Sin desplegar:** las Edge Functions de `supabase/functions/`. Shopify y la redacción con IA esperan credenciales. El envío de existencias a Shopify no está construido (solo su interruptor, apagado).
- El código QR de la hoja de etiquetas está pendiente: falta instalar la dependencia `qrcode`.

El camino para dejarlo funcionando, las decisiones tomadas por defecto y la lista de validación están en `docs/PUESTA_EN_MARCHA.md`.

Lo que no existe se etiqueta como **"En construcción"** o **"Integración pendiente"**. Los datos de prueba, cuando se siembren, vivirán en la base con `source = 'demo'` y serán borrables; **no** se generan datos simulados en el navegador.

### Fuera de este repositorio

Crear u optimizar perfiles de LinkedIn y redes, producir contenido, SEO dentro de Shopify, comprar e imprimir tarjetas NFC, timbrado fiscal (CFDI) por ahora, cold email y Mitra mayorista.

## 2. Fuentes de verdad

Revisar en este orden:

1. `AGENTS.md`: reglas de ejecución.
2. `docs/MITRACLICK_ARCHITECTURE_AND_SCOPE.md`: alcance, fases y límites.
3. `docs/DATABASE.md` y `supabase/migrations/`: modelo de datos, roles y reglas en la base.
   `docs/PUESTA_EN_MARCHA.md`: qué falta para operar, decisiones por defecto y validación.
4. `src/mitraclick/navigation.ts`: módulos, rutas y fase de cada uno.
5. `src/App.tsx`: rutas activas.
6. `src/mitraclick/lib/` (`crud.ts`, `forms.ts`, `useQuery.ts`) y `components/ResourcePage.tsx`: patrón de lista + formulario.

El CRM logístico heredado y el tablero de inteligencia de solo lectura (dos negocios, datos simulados en el navegador) se eliminaron; siguen en el historial de git. No reintroducirlos.

## 3. Stack

React 19 · TypeScript 5.9 · Vite 7 · React Router 7 · Tailwind CSS 4 · Recharts · Lucide React · Vitest · Supabase (Postgres 17, proyecto `mitraclick-intelligence`) · Vercel.

Usar las dependencias existentes antes de agregar otras. No introducir shadcn, Radix, Framer Motion, una librería de estado global ni de drag-and-drop. Dependencia prevista y aprobada: `qrcode` (fase C).

## 4. Arquitectura

```text
Pantallas (pages/)
  → ResourcePage / componentes        (lista, búsqueda, paginación, formulario)
  → lib/crud.ts + lib/useQuery.ts     (lectura y escritura genéricas)
  → Supabase (PostgREST) con la sesión del usuario
  → Postgres: RLS por rol, triggers de auditoría, funciones para reglas críticas
```

- **Supabase es la única fuente de verdad.** La app lee y escribe ahí con la publishable key y la sesión del usuario.
- **La seguridad vive en la base**, no en la interfaz: RLS por rol en todas las tablas. Ocultar un botón es cortesía; la base es la que impide.
- **Reglas críticas en Postgres:** movimientos de inventario (libro inmutable; la existencia se deriva), conteos (generan diferencia, nunca sobrescriben), folios, historial de reclasificación de productos y auditoría de antes/después.
- **Métricas en un solo lugar:** los KPIs se definirán como vistas SQL; dashboard, alertas y agentes leen los mismos números.
- **IA y proveedores externos del lado servidor:** Edge Functions de Supabase, con las llaves como secretos. Los agentes proponen y asignan con evidencia; no modifican datos de negocio.

Responsabilidades:

- `src/mitraclick/auth/`: sesión, perfil, roles y puerta de acceso (`AuthGate`).
- `src/mitraclick/navigation.ts`: grupos del menú, módulos y fases.
- `src/mitraclick/lib/`: acceso a datos, formularios, CSV, fechas, formato, tipos generados y las reglas puras de cada área (`catalog`, `inventory`, `documents`, `issues`, `kpis`, `reports`, `acquisition`).
- `src/mitraclick/components/`: shell, primitivas, controles y `ResourcePage`.
- `src/mitraclick/pages/`: una pantalla por módulo.
- `src/mitraclick/seed/`: catálogo de ejemplo para sembrar datos de prueba en la base.
- `supabase/migrations/`: esquema (los `manual_*` se ejecutaron a mano; el resto, como migraciones). `supabase/functions/`: Edge Functions (`shopify-webhook`, `shopify-sync`, `agent-narrate`, `go`) y su código compartido en `_shared/` (con pruebas).

### Reglas de dependencia

- Un módulo de altas, bajas y cambios se construye como configuración de `ResourcePage`; solo se escribe una pantalla a mano cuando el flujo no cabe en ese patrón.
- Una operación que toca varias tablas o cruza áreas (surtir, recibir, pagar) es una función de la base que valida el rol; la app la llama con `callFunction`.
- Las fórmulas de KPIs viven en `supabase/migrations/*kpis*`; dashboard, agentes y reportes las leen, no las repiten.
- No llamar a Shopify, la API de Claude, WhatsApp, correo ni otros proveedores desde componentes React.
- No duplicar en el cliente una regla que ya vive en la base; mostrar el error que la base devuelve (`describeError`).
- Nunca exponer secretos en el bundle. Solo valores públicos y deliberados usan el prefijo `VITE_`.

## 5. Módulos y rutas

Definidos en `src/mitraclick/navigation.ts`. Fuera del menú: `/b/:codigo` (ficha de etiqueta), `/etiquetas` (hoja imprimible), `/productos/importar` y `/clientes/importar`.

| Área | Rutas | Fase |
|---|---|---|
| Dirección | `/dashboard`, `/pendientes`, `/reportes`, `/agentes` | G, F, H |
| Ventas | `/clientes`, `/vendedores`, `/cotizaciones`, `/pedidos` | B, D |
| Compras | `/proveedores`, `/compras` | B, D |
| Bodega | `/inventario`, `/movimientos`, `/conteos`, `/ubicaciones` | C |
| Logística | `/envios`, `/remisiones` | D |
| Finanzas | `/facturas`, `/pagos` | D |
| Catálogo | `/productos`, `/familias` | B |
| Marketing | `/leads`, `/links` | I |
| Sistema | `/usuarios`, `/bitacora`, `/shopify` | A, E |

Al terminar un módulo: marcar `ready: true` en `navigation.ts` y agregarlo a `READY` en `App.tsx`.

Roles (`app_role`): dirección, admin, ventas, compras, almacén, logística, finanzas, marketing. Una persona puede tener varios.

Límites importantes:

- **Facturas** se registran; no se timbran.
- **Inventario hacia Shopify** queda detrás de un interruptor apagado hasta validar el piloto.
- **Etiquetas NFC/QR** solo contienen una URL con un código aleatorio; nunca datos ni credenciales.
- **Agentes**: sin llave de IA entregan la versión por reglas. No ejecutan acciones sobre datos de negocio.

## 6. Diseño y contenido

- Todo texto visible en español.
- Responsive en escritorio (1440 px) y teléfono (390 px); bodega se usa desde el teléfono.
- Accesible por teclado, foco visible, controles etiquetados. Ninguna acción depende de hover, arrastrar o gestos.
- Estados claros: vacío, carga, error y sin permiso.
- Tablas semánticas (`<table>`) en escritorio; tarjetas en teléfono.
- Filtros, búsqueda y página en la URL (query params).
- `<h1>` único por pantalla y `data-testid` estables en lo que lee un agente o una prueba.

Identidad: tipografía `Poppins`; carbón `#454a49`; amarillo `#ffc62a`; fondo `#f7f7f3`; texto `#303536`. Logos en `public/`. Usar los tokens `mc-*` de `src/index.css` y las primitivas existentes; sin colores arbitrarios ni gradientes decorativos. Respetar `prefers-reduced-motion`.

## 7. Flujo de trabajo esperado

1. Leer el alcance y los archivos afectados antes de editar.
2. Hacer el cambio mínimo que resuelva el problema sin ampliar el alcance.
3. Para lógica de dominio, escribir primero una prueba que falle.
4. Mantener transformaciones como funciones puras cuando sea posible.
5. Verificar estados normal, vacío, carga, error y sin permiso.
6. Revisar el resultado visual en 1440 px y 390 px para cambios de UI.
7. Ejecutar los controles de calidad.
8. Informar qué cambió, qué se verificó y qué sigue pendiente.

No inventar requisitos de negocio, estados de documentos, permisos, fórmulas de KPIs ni comportamiento de agentes. Si una decisión cambia producto, modelo de datos o permisos, pedir aprobación.

## 8. Comandos

```bash
npm ci
npm run dev
npm run lint
npm run type-check
npm run test:run
npm run build
```

Antes de entregar: `lint`, `type-check`, `test:run` y `build`. No usar `npm test` en automatización (modo observación).

## 9. Pruebas

- Pruebas junto al módulo (`*.test.ts`/`*.test.tsx`), de comportamiento y resultados.
- Reglas de la base: se prueban en transacciones revertidas (permisos por rol, existencia = suma de movimientos, un conteo no sobrescribe, enlaces entre documentos).
- Datos de prueba sintéticos, sin información personal real.
- Cambios solo de documentación: verificar el diff y la coherencia de rutas y nombres.

## 10. Seguridad

- Nunca imprimir, copiar, documentar o versionar secretos.
- Llaves secretas (Supabase, Shopify, API de Claude) solo como secretos de Edge Functions.
- Webhooks de Shopify: verificar la firma HMAC antes de procesar.
- Toda integración productiva necesita trazabilidad (`sync_runs`, `raw.api_payloads`), reintentos e idempotencia.
- Cualquier comunicación externa generada por IA necesita aprobación humana explícita.
- **No ejecutar migraciones remotas, deploys, pushes a Git ni operaciones destructivas sin autorización explícita.**

## 10.1 Skills del proyecto

En `.claude/skills/`; procedencia en `.claude/skills/PROVENANCE.md`. No descargar ni activar skills nuevas sin revisar su contenido y registrarlas ahí. Verificación visual con `webapp-testing` y el MCP de Playwright (`.mcp.json`).

## 11. Convenciones de implementación

- TypeScript estricto; evitar `any` y casts no justificados.
- Inmutabilidad al actualizar estado React.
- Nombres consistentes con el vocabulario operativo en español en la interfaz; tablas y columnas en inglés.
- Componentes enfocados; extraer primitivas solo con reutilización real.
- No mezclar refactors amplios con una corrección pequeña.
- No modificar `dist/`, `node_modules/`, `.vercel/` ni archivos generados (`lib/database.types.ts` se regenera, no se edita, una vez aplicado el esquema).
- No editar migraciones ya aplicadas; crear una nueva.
- Toda tabla nueva en `public` pasa por `private.secure_table(...)` (RLS, políticas, `grant`/`revoke`, auditoría) o define lo equivalente de forma explícita, sin acceso para `anon`. Después de migrar: advisors de seguridad y rendimiento, y regenerar tipos.

## 12. Definition of Done

- Cumple el alcance sin afirmar capacidades inexistentes.
- La seguridad está en la base (RLS) y probada por rol.
- Lo no construido sigue etiquetado como en construcción.
- Sin secretos, sin llamadas a proveedores desde la UI, sin dependencias innecesarias.
- Texto en español; usable en teléfono y escritorio.
- `lint`, `type-check`, `test:run` y `build` pasan, o el bloqueo se documenta exactamente.
- El reporte final distingue lo implementado, lo verificado y lo pendiente.
