// Acceso de desarrollo: abre la app sin pasar por la pantalla de login, para recorrerla
// mientras se construye. NUNCA llega a producción, por dos razones independientes:
//
//   1. `import.meta.env.DEV` es false en `vite build`, así que este bloque se elimina
//      del bundle. No existe en el sitio desplegado aunque alguien ponga la variable.
//   2. Además exige VITE_DEV_AUTO_LOGIN=1, que solo vive en `.env.local` (gitignored).
//
// Dos modos, según lo que haya en `.env.local`:
//
//   · Con VITE_DEV_EMAIL y VITE_DEV_PASSWORD → inicia una sesión REAL con esa cuenta.
//     Es el modo útil: la RLS se comporta igual que en producción y los datos se ven.
//   · Sin credenciales → perfil falso y nada más. Deja ver el shell, la navegación y los
//     estados de error, pero la base rechaza toda consulta porque no hay sesión: las
//     pantallas saldrán con "Tu rol no tiene permiso" o vacías. No es un fallo de la app.
//
// Al terminar la verificación visual: quitar este archivo, su uso en SessionProvider y
// las variables de `.env.local`. Está anotado en docs/PUESTA_EN_MARCHA.md.

import { ALL_ROLES } from './roles'
import type { Profile } from './SessionContext'

export const DEV_ACCESS = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN === '1'

export const DEV_CREDENTIALS = DEV_ACCESS && import.meta.env.VITE_DEV_EMAIL && import.meta.env.VITE_DEV_PASSWORD
  ? { email: import.meta.env.VITE_DEV_EMAIL, password: import.meta.env.VITE_DEV_PASSWORD }
  : null

/** Perfil de mentira para el modo sin credenciales. Lleva todos los roles para que la UI no esconda nada. */
export const DEV_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@local',
  displayName: 'Desarrollo (sin sesión)',
  roles: [...ALL_ROLES],
}
