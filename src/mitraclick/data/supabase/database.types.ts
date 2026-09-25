// Generado desde el proyecto Supabase `mitraclick-intelligence` (drdaenkvtjjrtyjjxnrr).
// No editar a mano: regenerar después de cada migración (MCP generate_typescript_types).
// Se conservan solo los helpers que usa la app (Tables, Enums).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_profiles: {
        Row: {
          description: string
          id: string
          name: string
        }
        Insert: {
          description: string
          id: string
          name: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          active: boolean
          created_at: string
          display_name: string | null
          email: string
          kind: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          email: string
          kind?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          email?: string
          kind?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          agent_profile: string | null
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: number
          occurred_at: string
          user_id: string
        }
        Insert: {
          action: string
          agent_profile?: string | null
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: never
          occurred_at?: string
          user_id?: string
        }
        Update: {
          action?: string
          agent_profile?: string | null
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: never
          occurred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_agent_profile_fkey"
            columns: ["agent_profile"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_goals: {
        Row: {
          amount: number
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          id: string
          month: string
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
        }
        Insert: {
          amount: number
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          month: string
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Update: {
          amount?: number
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          month?: string
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          client_type: string | null
          created_at: string
          external_id: string
          id: string
          name: string
          rep_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
        }
        Insert: {
          client_type?: string | null
          created_at?: string
          external_id: string
          id?: string
          name: string
          rep_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Update: {
          client_type?: string | null
          created_at?: string
          external_id?: string
          id?: string
          name?: string
          rep_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_traffic_daily: {
        Row: {
          carts: number
          checkouts: number
          created_at: string
          day: string
          id: string
          orders: number
          product_views: number
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
          visits: number
        }
        Insert: {
          carts?: number
          checkouts?: number
          created_at?: string
          day: string
          id?: string
          orders?: number
          product_views?: number
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
          visits?: number
        }
        Update: {
          carts?: number
          checkouts?: number
          created_at?: string
          day?: string
          id?: string
          orders?: number
          product_views?: number
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
          visits?: number
        }
        Relationships: []
      }
      inventory_levels: {
        Row: {
          as_of: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
          warehouse: string
        }
        Insert: {
          as_of?: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
          warehouse?: string
        }
        Update: {
          as_of?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
          warehouse?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          category: string | null
          created_at: string
          external_id: string
          id: string
          list_price: number
          name: string
          reorder_point: number
          sku: string
          source: Database["public"]["Enums"]["data_source"]
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          category?: string | null
          created_at?: string
          external_id: string
          id?: string
          list_price?: number
          name: string
          reorder_point?: number
          sku: string
          source?: Database["public"]["Enums"]["data_source"]
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string | null
          created_at?: string
          external_id?: string
          id?: string
          list_price?: number
          name?: string
          reorder_point?: number
          sku?: string
          source?: Database["public"]["Enums"]["data_source"]
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      rep_monthly_quotas: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: string
          rep_id: string
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          month: string
          rep_id: string
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: string
          rep_id?: string
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_monthly_quotas_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_order_lines: {
        Row: {
          amount: number
          created_at: string
          id: string
          line_number: number
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          line_number: number
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          line_number?: number
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retail_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "retail_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_orders: {
        Row: {
          amount: number
          channel: string | null
          created_at: string
          currency: string
          external_id: string
          id: string
          order_date: string
          source: Database["public"]["Enums"]["data_source"]
          status: Database["public"]["Enums"]["retail_order_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          channel?: string | null
          created_at?: string
          currency?: string
          external_id: string
          id?: string
          order_date: string
          source?: Database["public"]["Enums"]["data_source"]
          status?: Database["public"]["Enums"]["retail_order_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          channel?: string | null
          created_at?: string
          currency?: string
          external_id?: string
          id?: string
          order_date?: string
          source?: Database["public"]["Enums"]["data_source"]
          status?: Database["public"]["Enums"]["retail_order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      sales_reps: {
        Row: {
          active: boolean
          created_at: string
          external_id: string
          id: string
          name: string
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
          zone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          external_id: string
          id?: string
          name: string
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
          zone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          external_id?: string
          id?: string
          name?: string
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          entity: string
          error: string | null
          finished_at: string | null
          id: number
          rows_received: number
          rows_upserted: number
          source: Database["public"]["Enums"]["data_source"]
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          entity: string
          error?: string | null
          finished_at?: string | null
          id?: never
          rows_received?: number
          rows_upserted?: number
          source: Database["public"]["Enums"]["data_source"]
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          entity?: string
          error?: string | null
          finished_at?: string | null
          id?: never
          rows_received?: number
          rows_upserted?: number
          source?: Database["public"]["Enums"]["data_source"]
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      wholesale_order_lines: {
        Row: {
          amount: number
          created_at: string
          id: string
          line_number: number
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          line_number: number
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          line_number?: number
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wholesale_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_orders: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          currency: string
          external_id: string
          id: string
          order_date: string
          rep_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: Database["public"]["Enums"]["wholesale_order_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          currency?: string
          external_id: string
          id?: string
          order_date: string
          rep_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: Database["public"]["Enums"]["wholesale_order_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          external_id?: string
          id?: string
          order_date?: string
          rep_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: Database["public"]["Enums"]["wholesale_order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_orders_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_quotes: {
        Row: {
          amount: number
          client_id: string | null
          closed_date: string | null
          created_at: string
          external_id: string
          id: string
          quote_date: string
          rep_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          closed_date?: string | null
          created_at?: string
          external_id: string
          id?: string
          quote_date: string
          rep_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          closed_date?: string | null
          created_at?: string
          external_id?: string
          id?: string
          quote_date?: string
          rep_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_quotes_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sales_facts: {
        Row: {
          amount: number | null
          business_unit: Database["public"]["Enums"]["business_unit"] | null
          channel: string | null
          client_id: string | null
          order_date: string | null
          order_folio: string | null
          order_id: string | null
          product_id: string | null
          quantity: number | null
          rep_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      business_unit: "mitra" | "mitraclick"
      data_source: "erp" | "shopify" | "ga4" | "manual" | "demo"
      quote_status: "enviada" | "negociacion" | "ganada" | "perdida"
      retail_order_status: "pendiente" | "enviado" | "entregado" | "cancelado"
      wholesale_order_status: "pendiente" | "surtido" | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
