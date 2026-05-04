# CRM Supply Chain México

Sistema interno para gestión de operaciones logísticas.
Piloto: Oficina Lerma.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- Supabase (Auth + Database)
- Vercel (Hosting)

## Instalación local

```bash
git clone [repo]
cd crm-supply-chain
npm install
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase
npm run dev
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key de Supabase |

## Deploy en Vercel

1. Conecta el repo en [vercel.com](https://vercel.com)
2. Agrega las variables de entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`)
3. Deploy automático en cada push a `main`

> El archivo `vercel.json` ya está configurado para manejar rutas SPA.

## Roles de usuario

| Rol | Acceso |
|---|---|
| `admin` | Acceso total |
| `almacen` | Crear y editar operaciones |
| `servicio_cliente` | Gestión de operaciones |
| `cobranza` | Facturación y proformas |

Para asignar un rol en Supabase:

```sql
update auth.users
set raw_user_meta_data = '{"role": "admin"}'
where email = 'usuario@ejemplo.com';
```

## Estructura del proyecto

```
src/
├── components/
│   ├── common/     # ProtectedRoute
│   ├── features/   # OperationModal, ProformaModal
│   ├── layout/     # Header, Sidebar, GlobalSearch, NotificationBell
│   └── ui/         # Button, Card, Input, Spinner, EmptyState, ConfirmModal
├── context/        # AuthContext
├── hooks/          # useAuth, useOperations, useClients
├── lib/            # Configuración Supabase
├── pages/
│   ├── auth/       # Login
│   ├── billing/    # BillingList
│   ├── clients/    # ClientsList, ClientDetail
│   ├── dashboard/  # Dashboard
│   ├── operations/ # OperationsList
│   └── reports/    # ReportsList, OperationsReport
└── types/          # TypeScript interfaces
```
