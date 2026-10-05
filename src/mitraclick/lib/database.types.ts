// PROVISIONAL: escrito a mano a partir de supabase/migrations/*op2* mientras las
// migraciones del sistema operativo no estén aplicadas en Supabase. En cuanto se
// apliquen, regenerar con el MCP (generate_typescript_types) y reemplazar este archivo.
// Solo cubre lo que usa la Fase A (acceso y auditoría); el resto de las tablas se
// consulta con el cliente genérico de `lib/crud.ts`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type AppRole = 'direccion' | 'admin' | 'ventas' | 'compras' | 'almacen' | 'logistica' | 'finanzas' | 'marketing'

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: { id: string; email: string; display_name: string; roles: AppRole[]; active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; email: string; display_name: string; roles?: AppRole[]; active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; display_name?: string; roles?: AppRole[]; active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      audit_log: {
        Row: { id: number; table_name: string; record_id: string | null; action: string; old_data: Json | null; new_data: Json | null; changed_by: string | null; changed_by_user: string | null; changed_at: string }
        Insert: { id?: never; table_name: string; record_id?: string | null; action: string; old_data?: Json | null; new_data?: Json | null; changed_by?: string | null; changed_by_user?: string | null; changed_at?: string }
        Update: { id?: never; table_name?: string; record_id?: string | null; action?: string; old_data?: Json | null; new_data?: Json | null; changed_by?: string | null; changed_by_user?: string | null; changed_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      my_profile: {
        Args: Record<PropertyKey, never>
        Returns: { id: string; email: string; display_name: string; roles: AppRole[] }[]
      }
    }
    Enums: {
      app_role: AppRole
    }
    CompositeTypes: { [_ in never]: never }
  }
}
