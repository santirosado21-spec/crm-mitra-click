# Checklist de despliegue — CRM Supply Chain

## Pre-deploy

- [ ] Variables de entorno configuradas en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] `npm run build` pasa sin errores
- [ ] `npm run lint` sin warnings críticos
- [ ] Tablas creadas en Supabase (warehouses, clients, providers, operations)
- [ ] RLS habilitado en todas las tablas
- [ ] Politicas RLS aplicadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Al menos un usuario con rol `admin` en Supabase Auth (`user_metadata.role`)
- [ ] `vercel.json` con rewrites para SPA presente en la raíz
- [ ] `.env` en `.gitignore` (no subir credenciales)

## Pruebas manuales

### Auth
- [ ] Login con credenciales válidas redirige a `/dashboard`
- [ ] Login con credenciales inválidas muestra mensaje de error
- [ ] Ruta protegida sin sesión redirige a `/login`
- [ ] Ruta `/billing` deniega acceso a rol `operador`
- [ ] Logout cierra sesión y redirige a `/login`

### Operaciones
- [ ] Listado carga operaciones desde Supabase
- [ ] Filtros (estado, tipo, búsqueda) funcionan correctamente
- [ ] "Nueva Operación" abre el modal
- [ ] Crear operación genera referencia `SCLERxxxxx` y aparece en la lista
- [ ] Botón "Eliminar" abre modal de confirmación
- [ ] EmptyState aparece cuando no hay resultados con los filtros

### Clientes
- [ ] Listado carga clientes activos
- [ ] "Ver" navega al detalle del cliente
- [ ] Detalle muestra información general, tarifas y últimas operaciones
- [ ] Botón "Editar" navega a `/clients/:id/edit` (ruta pendiente)

### Cobranza
- [ ] Sólo visible para roles `admin` y `cobranza`
- [ ] Rol `operador` ve mensaje de acceso denegado

### Reportes
- [ ] Página principal muestra 4 tarjetas de reportes
- [ ] Reporte de operaciones carga y filtra correctamente
- [ ] "Exportar Excel" y "Exportar PDF" (pendiente implementación real)

### UI / UX
- [ ] Sidebar resalta la sección activa
- [ ] Header muestra búsqueda global y campana de notificaciones
- [ ] Campana cierra al hacer clic fuera
- [ ] Búsqueda global muestra resultados agrupados
- [ ] Spinner aparece mientras cargan datos
- [ ] Mensajes de error aparecen cuando falla Supabase

## Responsive

- [ ] Dashboard — visible en móvil (≥ 375 px)
- [ ] Tabla de operaciones — scroll horizontal en pantallas pequeñas
- [ ] Modal "Nueva Operación" — usable en móvil
- [ ] Sidebar — comportamiento en pantallas < 768 px (pendiente: menú hamburguesa)

## Seguridad

- [ ] No hay credenciales hardcodeadas en el código fuente
- [ ] RLS bloquea acceso a filas de otros usuarios/clientes
- [ ] Anon key de Supabase sólo con permisos mínimos necesarios
- [ ] `allowedRoles` en rutas sensibles (`/billing`)
- [ ] Inputs del modal sanitizados / sin XSS

## Pendiente (funcionalidades futuras)

- [ ] Ruta `/clients/:id/edit` — formulario de edición de cliente
- [ ] Ruta `/clients/new` — alta de nuevo cliente
- [ ] Eliminación real de operaciones (conectar `onConfirm` en ConfirmModal)
- [ ] Exportación real a Excel / PDF en reportes
- [ ] Menú hamburguesa en Sidebar para móvil
- [ ] Reporte de cobranza (`/reports/billing`)
- [ ] Reporte de márgenes (`/reports/margins`)
- [ ] Reporte de RCs pendientes (`/reports/pending-rc`)
- [ ] Notificaciones reales desde Supabase Realtime
- [ ] Búsqueda global conectada a Supabase
