/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Llave pública (sb_publishable_…). Nunca la service_role. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Solo desarrollo: "1" entra a la app sin pasar por el login. Ver auth/devAccess.ts. */
  readonly VITE_DEV_AUTO_LOGIN?: string
  /** Solo desarrollo: con estas dos la sesión es real y los datos se ven. */
  readonly VITE_DEV_EMAIL?: string
  readonly VITE_DEV_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
