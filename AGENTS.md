# AGENTS.md — MitraClick Intelligence

Este archivo define el contexto y las reglas de trabajo para cualquier agente de IA que modifique este repositorio. Léelo completo antes de proponer o ejecutar cambios.

## 1. Objetivo del producto

**MitraClick Intelligence** es un centro de inteligencia comercial en español para representar el ciclo:

`Canal → Campaña → Lead → Empresa → Oportunidad → Cotización → Venta`

La experiencia actual es un **esqueleto demostrativo API-free**. Sirve para validar producto, navegación, contratos de dominio y experiencia visual antes de conectar fuentes reales.

No presentar la demo como un sistema productivo. Actualmente:

- Los datos de MitraClick son sintéticos y viven en memoria.
- Los cambios hechos en la interfaz se pierden al recargar o restablecer la sesión.
- No hay atribución causal real ni actualización en tiempo real.
- No se ejecutan automatizaciones externas.
- No se envían emails, mensajes de WhatsApp ni mensajes de LinkedIn.
- No se consulta ningún modelo de IA.
- No hay autenticación ni permisos productivos para MitraClick.

Usar etiquetas claras como **“Datos simulados”**, **“Simulación”** o **“Integración pendiente”** cuando corresponda.

## 2. Fuentes de verdad

Antes de trabajar, revisar en este orden:

1. `AGENTS.md`: reglas de ejecución del repositorio.
2. `docs/MITRACLICK_ARCHITECTURE_AND_SCOPE.md`: alcance aprobado, límites e integraciones futuras.
3. `src/mitraclick/domain.ts`: contratos del dominio.
4. `src/App.tsx`: rutas activas de la experiencia actual.
5. `src/mitraclick/MitraClickContext.ts` y `MitraClickProvider.tsx`: contrato y estado consumidos por la UI.
6. `src/mitraclick/data/repository.ts`: puerto de lectura y adaptador activo.
7. `src/mitraclick/selectors.ts` y sus pruebas: lógica derivada y reglas puras.

El `README.md` y buena parte de `src/pages`, `src/hooks`, `src/types` y `supabase/` pertenecen al CRM logístico original de Supply Chain México. Son contexto heredado, pero **no describen por sí solos el alcance actual de MitraClick Intelligence**.

No borrar, migrar ni reactivar módulos heredados salvo que la tarea lo pida explícitamente.

## 3. Stack

- React 19
- TypeScript 5.9
- Vite 7
- React Router 7
- Tailwind CSS 4
- Recharts
- Lucide React
- Vitest
- Supabase en el código heredado y como posible infraestructura futura
- Vercel para hosting

Usar las dependencias existentes antes de agregar otras. No introducir shadcn, Radix, Framer Motion, una librería de estado global o una librería de drag-and-drop sólo por conveniencia visual.

## 4. Arquitectura activa de MitraClick

```text
Pantallas React
  → MitraClickContext
  → MitraClickProvider
  → MitraRepository
  → MockMitraRepository
  → mockData.ts
```

Responsabilidades:

- `src/mitraclick/domain.ts`: entidades y contratos normalizados.
- `src/mitraclick/data/mockData.ts`: única fuente de datos sintéticos.
- `src/mitraclick/data/repository.ts`: puerto `MitraRepository` e implementación demo.
- `src/mitraclick/MitraClickContext.ts`: API estable que consume la UI.
- `src/mitraclick/MitraClickProvider.tsx`: carga, estado de sesión y comandos locales.
- `src/mitraclick/selectors.ts`: métricas, filtros, agrupaciones y atribución como funciones puras.
- `src/mitraclick/components/*`: shell y primitivas compartidas.
- `src/mitraclick/pages/*`: presentación por módulo.

### Reglas de dependencia

- Las páginas nunca deben importar `mockData.ts` directamente.
- Las páginas consumen `useMitraClick()` y selectores puros.
- Normalizar datos externos antes de exponerlos como `MitraData`.
- No hacer llamadas directas a Shopify, GA4, Google Ads, Meta Ads, WhatsApp, email u otros proveedores desde componentes React.
- Las integraciones reales deben implementarse detrás de adaptadores o servicios del lado servidor.
- Las futuras escrituras deben pasar por comandos/servicios usados por el Provider, con permisos, auditoría, idempotencia y manejo explícito de errores.
- Nunca exponer secretos o credenciales en el bundle del navegador.

## 5. Módulos y rutas activas

- `/`: Dashboard ejecutivo
- `/leads`: Leads
- `/empresas`: Empresas B2B y contactos
- `/oportunidades`: Pipeline comercial
- `/cotizaciones`: Seguimiento de cotizaciones
- `/productos`: Inteligencia comercial de productos
- `/atribucion`: Recorrido y atribución demostrativa
- `/actividad`: Timeline y seguimiento
- `/automatizaciones`: Reglas en modo simulación
- `/agentes`: Vista previa de agentes IA
- `/reportes`: Reportes comerciales

Límites funcionales importantes:

- **Productos** es una superficie de lectura e inteligencia, no un administrador de catálogo.
- **Cotizaciones** da seguimiento comercial; no es un cotizador logístico.
- **Atribución** es demostrativa; correlación no equivale a causalidad.
- **Automatizaciones** sólo simula reglas y no ejecuta acciones externas.
- **Agentes IA** es una vista previa sin inferencia real.
- Chatbot, outbound B2B y promesas como “tracking al 100%” requieren definición y aprobación antes de implementarse o comunicarse.

## 6. Diseño y contenido

La interfaz debe mantenerse:

- En español para todo texto visible.
- Responsive en escritorio y móvil.
- Accesible por teclado, con foco visible y controles etiquetados.
- Clara sobre estados vacíos, errores, carga y simulación.
- Densa pero legible, orientada a operación comercial B2B.

Identidad MitraClick:

- Tipografía: `Poppins`, con fallbacks del sistema.
- Carbón principal: `#454a49`.
- Amarillo principal: `#ffc62a`.
- Fondo de aplicación: `#f7f7f3`.
- Texto principal: `#303536`.
- Logos: `public/mitraclick-logo.jpg` y `public/mitraclick-mark.svg`.

Preferir los tokens y primitivas existentes. Evitar colores arbitrarios, gradientes decorativos o patrones visuales que rompan la marca. Respetar `prefers-reduced-motion`.

## 7. Flujo de trabajo esperado

1. Leer el alcance y los archivos afectados antes de editar.
2. Confirmar si la tarea pertenece a MitraClick o al CRM logístico heredado.
3. Hacer el cambio mínimo que resuelva el problema sin ampliar alcance de producto.
4. Para lógica de dominio, escribir primero una prueba que falle.
5. Mantener selectores y transformaciones como funciones puras cuando sea posible.
6. Verificar estados normal, vacío, carga y error si la pantalla los expone.
7. Revisar manualmente el resultado visual en escritorio y móvil para cambios de UI.
8. Ejecutar los controles de calidad antes de dar por terminada la tarea.
9. Informar con precisión qué cambió, qué se verificó y qué continúa siendo simulado o pendiente.

No inventar requisitos de negocio, mapeos de datos, permisos, eventos de analytics, fórmulas de atribución ni comportamiento de agentes. Si una decisión cambia producto, contratos, fuentes de datos o responsabilidades entre proveedores, solicitar aprobación.

## 8. Comandos locales

```bash
npm ci
npm run dev
npm run lint
npm run type-check
npm run test:run
npm run build
npm run preview
```

Para una entrega normal, ejecutar como mínimo:

```bash
npm run lint
npm run type-check
npm run test:run
npm run build
```

No usar `npm test` en automatización porque inicia Vitest en modo observación; usar `npm run test:run`.

## 9. Pruebas

Las pruebas actuales cubren principalmente selectores de MitraClick y utilidades heredadas.

- Colocar pruebas de lógica MitraClick junto a los módulos, con `*.test.ts` o `*.test.tsx`.
- Probar comportamiento y resultados, no detalles internos de implementación.
- Cubrir casos límite de filtros, KPIs, etapas, atribución y transiciones.
- No sustituir pruebas deterministas por snapshots extensos.
- Mantener datos de prueba sintéticos y sin información personal real.

Si un cambio sólo afecta documentación, no es necesario reconstruir toda la aplicación; sí verificar el diff y la coherencia de rutas, comandos y nombres citados.

## 10. Seguridad e integraciones

- Nunca imprimir, copiar, documentar o versionar secretos.
- No incluir claves reales en archivos `.env`, código, fixtures, capturas o logs.
- Sólo las variables públicas y deliberadas pueden usar el prefijo `VITE_`.
- Email, WhatsApp, Ads, Shopify, Analytics e IA deben operar mediante servicios del lado servidor.
- Toda integración productiva necesita autorización, trazabilidad, reintentos y manejo de errores.
- Cualquier acción sensible o comunicación externa generada por IA necesita aprobación humana explícita.
- No ejecutar `npm run db:push`, migraciones remotas, deploys, pushes a Git ni operaciones destructivas sin autorización explícita.

## 11. Convenciones de implementación

- Mantener TypeScript estricto; evitar `any` y casts no justificados.
- Reutilizar tipos de `domain.ts`; no duplicar modelos dentro de las páginas.
- Preservar inmutabilidad al actualizar estado React.
- Usar nombres descriptivos y consistentes con el vocabulario comercial en español.
- Mantener componentes enfocados; extraer primitivas sólo cuando exista reutilización real.
- No mezclar refactors amplios con una corrección pequeña.
- No modificar `dist/`, `node_modules/`, `.vercel/` ni archivos generados.
- No editar migraciones de Supabase ya aplicadas; crear una nueva migración cuando una tarea autorizada lo requiera.

## 12. Definition of Done

Una tarea está terminada cuando:

- Cumple el alcance solicitado sin afirmar capacidades inexistentes.
- Respeta la arquitectura Context → Provider → Repository.
- Mantiene datos sintéticos y estados de integración claramente etiquetados.
- No introduce secretos, llamadas externas desde la UI ni dependencias innecesarias.
- El texto visible está en español y la interfaz sigue siendo usable en móvil y escritorio.
- Las pruebas nuevas o afectadas pasan.
- `lint`, `type-check`, `test:run` y `build` pasan, o el bloqueo ambiental se documenta exactamente.
- El diff no contiene cambios accidentales en código heredado o artefactos generados.
- El reporte final distingue entre lo implementado, lo verificado y lo que sigue pendiente.