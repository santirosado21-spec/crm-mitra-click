/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `supabase` para leer datos reales; cualquier otro valor usa datos simulados. */
  readonly VITE_DATA_SOURCE?: string
  readonly VITE_SUPABASE_URL?: string
  /** Llave pública (sb_publishable_…). Nunca la service_role. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
