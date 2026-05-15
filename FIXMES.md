# FIXMES — Sprint Techship

## Estado: SIN FIXMES AUTONOMOS

No se insertaron marcadores `// FIXME-AUTONOMOUS` durante el sprint.

Todas las fases compilaron limpio en los archivos nuevos/tocados
(`npx tsc --noEmit` sin errores en archivos del sprint) y `npm run build`
(Vite) termino exitosamente tras cada fase.

## Nota sobre tsc del repo completo

El repo tenia errores de TypeScript PRE-EXISTENTES en archivos ajenos al
sprint (CotizadorPage, CostosTransportePage, ProformasPage, RCPage,
OperationModal, etc.). No se modificaron — quedan como estaban antes del
sprint. El build de produccion (`vite build`) no hace type-check, por lo que
no afectan el deploy.
