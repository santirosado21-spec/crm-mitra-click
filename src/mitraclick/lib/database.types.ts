// Generado con Supabase (generate_typescript_types) tras aplicar las migraciones 1 a 10.
// No se edita a mano: se regenera cada vez que cambia el esquema.

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
      agent_findings: {
        Row: {
          agent: string
          assigned_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          dedupe_key: string | null
          detail: string | null
          evidence: Json | null
          id: number
          issue_id: number | null
          run_id: number
          status: string
          suggested_action: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent: string
          assigned_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          dedupe_key?: string | null
          detail?: string | null
          evidence?: Json | null
          id?: never
          issue_id?: number | null
          run_id: number
          status?: string
          suggested_action?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent?: string
          assigned_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          dedupe_key?: string | null
          detail?: string | null
          evidence?: Json | null
          id?: never
          issue_id?: number | null
          run_id?: number
          status?: string
          suggested_action?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_findings_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent: string
          error: string | null
          finished_at: string | null
          id: number
          input_summary: Json | null
          mode: string
          output: Json | null
          started_at: string
          status: string
        }
        Insert: {
          agent: string
          error?: string | null
          finished_at?: string | null
          id?: never
          input_summary?: Json | null
          mode?: string
          output?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          agent?: string
          error?: string | null
          finished_at?: string | null
          id?: never
          input_summary?: Json | null
          mode?: string
          output?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          alert_code: string
          created_at: string
          dedupe_key: string
          detail: string | null
          id: number
          payload: Json | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          alert_code: string
          created_at?: string
          dedupe_key: string
          detail?: string | null
          id?: never
          payload?: Json | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          alert_code?: string
          created_at?: string
          dedupe_key?: string
          detail?: string | null
          id?: never
          payload?: Json | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          email: string
          id: string
          roles: Database["public"]["Enums"]["app_role"][]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          email: string
          id?: string
          roles?: Database["public"]["Enums"]["app_role"][]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          roles?: Database["public"]["Enums"]["app_role"][]
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          changed_by_user: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          changed_by_user?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          changed_by_user?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_user_fkey"
            columns: ["changed_by_user"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      control_settings: {
        Row: {
          key: string
          label: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          label: string
          unit?: string
          updated_at?: string
          value: number
        }
        Update: {
          key?: string
          label?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          active: boolean
          billing_address: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          folio: string | null
          id: string
          kind: string
          name: string
          notes: string | null
          phone: string | null
          rep_id: string | null
          rfc: string | null
          shipping_address: string | null
          shopify_customer_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_address?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          folio?: string | null
          id?: string
          kind?: string
          name: string
          notes?: string | null
          phone?: string | null
          rep_id?: string | null
          rfc?: string | null
          shipping_address?: string | null
          shopify_customer_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_address?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          folio?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rep_id?: string | null
          rfc?: string | null
          shipping_address?: string | null
          shopify_customer_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          description: string
          folio: string | null
          id: string
          kind: string
          location_id: string | null
          product_id: string | null
          quantity: number | null
          reported_at: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          updated_at: string
        }
        Insert: {
          description: string
          folio?: string | null
          id?: string
          kind: string
          location_id?: string | null
          product_id?: string | null
          quantity?: number | null
          reported_at?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          updated_at?: string
        }
        Update: {
          description?: string
          folio?: string | null
          id?: string
          kind?: string
          location_id?: string | null
          product_id?: string | null
          quantity?: number | null
          reported_at?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          cfdi_uuid: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          due_on: string | null
          folio: string
          id: string
          issued_on: string
          notes: string | null
          sales_order_id: string | null
          series: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          cfdi_uuid?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_on?: string | null
          folio: string
          id?: string
          issued_on?: string
          notes?: string | null
          sales_order_id?: string | null
          series?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          subtotal?: number
          tax?: number
          total: number
          updated_at?: string
        }
        Update: {
          cfdi_uuid?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_on?: string | null
          folio?: string
          id?: string
          issued_on?: string
          notes?: string | null
          sales_order_id?: string | null
          series?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "order_line_facts"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assigned_role: Database["public"]["Enums"]["app_role"] | null
          assigned_to: string | null
          detail: string | null
          detected_at: string
          entity_id: string | null
          entity_type: string
          id: number
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_code: string
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role?: Database["public"]["Enums"]["app_role"] | null
          assigned_to?: string | null
          detail?: string | null
          detected_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_code: string
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["app_role"] | null
          assigned_to?: string | null
          detail?: string | null
          detected_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_code?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          id: number
          kind: string
          lead_id: string
          notes: string | null
          occurred_at: string
          performed_by: string | null
        }
        Insert: {
          id?: never
          kind: string
          lead_id: string
          notes?: string | null
          occurred_at?: string
          performed_by?: string | null
        }
        Update: {
          id?: never
          kind?: string
          lead_id?: string
          notes?: string | null
          occurred_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          notes: string | null
          phone: string | null
          rep_id: string | null
          source: string
          source_origin: Database["public"]["Enums"]["data_source"]
          status: string
          tracked_link_id: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rep_id?: string | null
          source?: string
          source_origin?: Database["public"]["Enums"]["data_source"]
          status?: string
          tracked_link_id?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rep_id?: string | null
          source?: string
          source_origin?: Database["public"]["Enums"]["data_source"]
          status?: string
          tracked_link_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tracked_link_id_fkey"
            columns: ["tracked_link_id"]
            isOneToOne: false
            referencedRelation: "tracked_link_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tracked_link_id_fkey"
            columns: ["tracked_link_id"]
            isOneToOne: false
            referencedRelation: "tracked_links"
            referencedColumns: ["id"]
          },
        ]
      }
      link_events: {
        Row: {
          device: string | null
          id: number
          link_id: string
          occurred_at: string
        }
        Insert: {
          device?: string | null
          id?: never
          link_id: string
          occurred_at?: string
        }
        Update: {
          device?: string | null
          id?: never
          link_id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "tracked_link_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "tracked_links"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          folio: string | null
          id: string
          invoice_id: string | null
          method: string | null
          notes: string | null
          paid_on: string
          recorded_by: string | null
          reference: string | null
          sales_order_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          folio?: string | null
          id?: string
          invoice_id?: string | null
          method?: string | null
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          sales_order_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          folio?: string | null
          id?: string
          invoice_id?: string | null
          method?: string | null
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          sales_order_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "order_line_facts"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          active: boolean
          created_at: string
          family_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          family_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
        ]
      }
      product_change_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          field: string
          id: number
          new_value: string | null
          old_value: string | null
          product_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field: string
          id?: never
          new_value?: string | null
          old_value?: string | null
          product_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field?: string
          id?: never
          new_value?: string | null
          old_value?: string | null
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
        ]
      }
      product_families: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          barcode: string | null
          brand: string | null
          category_id: string | null
          cost: number | null
          created_at: string
          description: string | null
          family_id: string | null
          id: string
          name: string
          photo_url: string | null
          price: number | null
          reorder_point: number
          shopify_inventory_item_id: string | null
          shopify_product_id: string | null
          shopify_variant_id: string | null
          sku: string
          source: Database["public"]["Enums"]["data_source"]
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          name: string
          photo_url?: string | null
          price?: number | null
          reorder_point?: number
          shopify_inventory_item_id?: string | null
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          sku: string
          source?: Database["public"]["Enums"]["data_source"]
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          price?: number | null
          reorder_point?: number
          shopify_inventory_item_id?: string | null
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          sku?: string
          source?: Database["public"]["Enums"]["data_source"]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          amount: number
          id: string
          line_number: number
          product_id: string
          purchase_order_id: string
          quantity: number
          quantity_received: number
          unit_cost: number
        }
        Insert: {
          amount: number
          id?: string
          line_number: number
          product_id: string
          purchase_order_id: string
          quantity: number
          quantity_received?: number
          unit_cost: number
        }
        Update: {
          amount?: number
          id?: string
          line_number?: number
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          quantity_received?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_on: string | null
          folio: string | null
          id: string
          notes: string | null
          ordered_on: string
          sales_order_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          subtotal: number
          supplier_id: string
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_on?: string | null
          folio?: string | null
          id?: string
          notes?: string | null
          ordered_on?: string
          sales_order_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          subtotal?: number
          supplier_id: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_on?: string | null
          folio?: string | null
          id?: string
          notes?: string | null
          ordered_on?: string
          sales_order_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          subtotal?: number
          supplier_id?: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "order_line_facts"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "purchase_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          amount: number
          description: string
          discount_pct: number
          id: string
          line_number: number
          product_id: string | null
          quantity: number
          quote_id: string
          unit_price: number
        }
        Insert: {
          amount: number
          description: string
          discount_pct?: number
          id?: string
          line_number: number
          product_id?: string | null
          quantity: number
          quote_id: string
          unit_price: number
        }
        Update: {
          amount?: number
          description?: string
          discount_pct?: number
          id?: string
          line_number?: number
          product_id?: string | null
          quantity?: number
          quote_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          folio: string | null
          id: string
          issued_on: string
          last_follow_up_at: string | null
          lost_reason: string | null
          notes: string | null
          rep_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          folio?: string | null
          id?: string
          issued_on?: string
          last_follow_up_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          rep_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          folio?: string | null
          id?: string
          issued_on?: string
          last_follow_up_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          rep_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_lines: {
        Row: {
          id: string
          location_id: string
          movement_id: number | null
          product_id: string
          purchase_order_line_id: string | null
          quantity: number
          receipt_id: string
        }
        Insert: {
          id?: string
          location_id: string
          movement_id?: number | null
          product_id: string
          purchase_order_line_id?: string | null
          quantity: number
          receipt_id: string
        }
        Update: {
          id?: string
          location_id?: string
          movement_id?: number | null
          product_id?: string
          purchase_order_line_id?: string | null
          quantity?: number
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_lines_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          folio: string | null
          id: string
          notes: string | null
          purchase_order_id: string | null
          received_by: string | null
          received_on: string
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          folio?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by?: string | null
          received_on?: string
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          folio?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by?: string | null
          received_on?: string
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      remissions: {
        Row: {
          created_at: string
          delivered_at: string | null
          evidence_paths: string[]
          folio: string | null
          id: string
          notes: string | null
          received_by_name: string | null
          sales_order_id: string
          shipment_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          evidence_paths?: string[]
          folio?: string | null
          id?: string
          notes?: string | null
          received_by_name?: string | null
          sales_order_id: string
          shipment_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          evidence_paths?: string[]
          folio?: string | null
          id?: string
          notes?: string | null
          received_by_name?: string | null
          sales_order_id?: string
          shipment_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remissions_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "order_line_facts"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "remissions_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remissions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remissions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json
          frequency: string
          generated_at: string
          generated_by: string
          id: string
          kind: string
          narrative: string | null
          period_end: string
          period_start: string
        }
        Insert: {
          content: Json
          frequency: string
          generated_at?: string
          generated_by?: string
          id?: string
          kind: string
          narrative?: string | null
          period_end: string
          period_start: string
        }
        Update: {
          content?: Json
          frequency?: string
          generated_at?: string
          generated_by?: string
          id?: string
          kind?: string
          narrative?: string | null
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      sales_order_lines: {
        Row: {
          amount: number
          description: string
          id: string
          line_number: number
          order_id: string
          product_id: string | null
          quantity: number
          quantity_fulfilled: number
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          description: string
          id?: string
          line_number: number
          order_id: string
          product_id?: string | null
          quantity: number
          quantity_fulfilled?: number
          unit_cost?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          line_number?: number
          order_id?: string
          product_id?: string | null
          quantity?: number
          quantity_fulfilled?: number
          unit_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_line_facts"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "sales_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          folio: string | null
          id: string
          notes: string | null
          ordered_on: string
          payment_status: string
          promised_on: string | null
          quote_id: string | null
          rep_id: string | null
          shipping: number
          shipping_address: string | null
          shopify_order_id: string | null
          shopify_order_name: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          subtotal: number
          tax: number
          total: number
          traffic_source: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          folio?: string | null
          id?: string
          notes?: string | null
          ordered_on?: string
          payment_status?: string
          promised_on?: string | null
          quote_id?: string | null
          rep_id?: string | null
          shipping?: number
          shipping_address?: string | null
          shopify_order_id?: string | null
          shopify_order_name?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          traffic_source?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          folio?: string | null
          id?: string
          notes?: string | null
          ordered_on?: string
          payment_status?: string
          promised_on?: string | null
          quote_id?: string | null
          rep_id?: string | null
          shipping?: number
          shipping_address?: string | null
          shopify_order_id?: string | null
          shopify_order_name?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          traffic_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reps: {
        Row: {
          active: boolean
          app_user_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          app_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          app_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_reps_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_metrics: {
        Row: {
          clicks: number
          created_at: string
          dimension: string
          id: number
          impressions: number
          period_end: string
          period_start: string
          position: number | null
          term: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          dimension: string
          id?: never
          impressions?: number
          period_end: string
          period_start: string
          position?: number | null
          term: string
        }
        Update: {
          clicks?: number
          created_at?: string
          dimension?: string
          id?: never
          impressions?: number
          period_end?: string
          period_start?: string
          position?: number | null
          term?: string
        }
        Relationships: []
      }
      shipment_lines: {
        Row: {
          id: string
          location_id: string | null
          movement_id: number | null
          product_id: string
          quantity: number
          sales_order_line_id: string | null
          shipment_id: string
        }
        Insert: {
          id?: string
          location_id?: string | null
          movement_id?: number | null
          product_id: string
          quantity: number
          sales_order_line_id?: string | null
          shipment_id: string
        }
        Update: {
          id?: string
          location_id?: string | null
          movement_id?: number | null
          product_id?: string
          quantity?: number
          sales_order_line_id?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_sales_order_line_id_fkey"
            columns: ["sales_order_line_id"]
            isOneToOne: false
            referencedRelation: "order_line_facts"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "shipment_lines_sales_order_line_id_fkey"
            columns: ["sales_order_line_id"]
            isOneToOne: false
            referencedRelation: "sales_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          driver: string | null
          folio: string | null
          id: string
          notes: string | null
          route: string | null
          sales_order_id: string
          scheduled_on: string | null
          shipped_at: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          driver?: string | null
          folio?: string | null
          id?: string
          notes?: string | null
          route?: string | null
          sales_order_id: string
          scheduled_on?: string | null
          shipped_at?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          driver?: string | null
          folio?: string | null
          id?: string
          notes?: string | null
          route?: string | null
          sales_order_id?: string
          scheduled_on?: string | null
          shipped_at?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "order_line_facts"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "shipments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_inventory_snapshots: {
        Row: {
          available: number
          product_id: string | null
          received_at: string
          shopify_inventory_item_id: string
          shopify_location_id: string
        }
        Insert: {
          available: number
          product_id?: string | null
          received_at?: string
          shopify_inventory_item_id: string
          shopify_location_id?: string
        }
        Update: {
          available?: number
          product_id?: string | null
          received_at?: string
          shopify_inventory_item_id?: string
          shopify_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_inventory_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_inventory_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          adjustment_movement_id: number | null
          counted_at: string
          counted_by: string | null
          counted_quantity: number
          difference: number | null
          id: string
          location_id: string
          notes: string | null
          product_id: string
          resolution_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          system_quantity: number
        }
        Insert: {
          adjustment_movement_id?: number | null
          counted_at?: string
          counted_by?: string | null
          counted_quantity: number
          difference?: number | null
          id?: string
          location_id: string
          notes?: string | null
          product_id: string
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          system_quantity: number
        }
        Update: {
          adjustment_movement_id?: number | null
          counted_at?: string
          counted_by?: string | null
          counted_quantity?: number
          difference?: number | null
          id?: string
          location_id?: string
          notes?: string | null
          product_id?: string
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          system_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_adjustment_movement_id_fkey"
            columns: ["adjustment_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          location_id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          location_id: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          location_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          id: number
          location_id: string
          movement_type: string
          performed_at: string
          performed_by: string | null
          product_id: string
          quantity_delta: number
          reason: string | null
          reference_id: string | null
          reference_type: string
          source: Database["public"]["Enums"]["data_source"]
          transfer_group: string | null
        }
        Insert: {
          id?: never
          location_id: string
          movement_type: string
          performed_at?: string
          performed_by?: string | null
          product_id: string
          quantity_delta: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string
          source?: Database["public"]["Enums"]["data_source"]
          transfer_group?: string | null
        }
        Update: {
          id?: never
          location_id?: string
          movement_type?: string
          performed_at?: string
          performed_by?: string | null
          product_id?: string
          quantity_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string
          source?: Database["public"]["Enums"]["data_source"]
          transfer_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          contact_name: string | null
          created_at: string
          email: string | null
          folio: string | null
          id: string
          lead_time_days: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rfc: string | null
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact_name?: string | null
          created_at?: string
          email?: string | null
          folio?: string | null
          id?: string
          lead_time_days?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rfc?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact_name?: string | null
          created_at?: string
          email?: string | null
          folio?: string | null
          id?: string
          lead_time_days?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rfc?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
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
      tags: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label: string | null
          location_id: string | null
          product_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string | null
          location_id?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string | null
          location_id?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_links: {
        Row: {
          active: boolean
          campaign: string | null
          channel: string
          code: string
          created_at: string
          created_by: string | null
          destination_url: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          campaign?: string | null
          channel: string
          code?: string
          created_at?: string
          created_by?: string | null
          destination_url: string
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          campaign?: string | null
          channel?: string
          code?: string
          created_at?: string
          created_by?: string | null
          destination_url?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_statements: {
        Row: {
          balance: number | null
          folio: string | null
          id: string | null
          invoiced: number | null
          invoices: number | null
          name: string | null
          oldest_due_on: string | null
          overdue_balance: number | null
          paid: number | null
        }
        Relationships: []
      }
      data_quality_findings: {
        Row: {
          assigned_role: Database["public"]["Enums"]["app_role"] | null
          detail: string | null
          entity_id: string | null
          entity_type: string | null
          rule_code: string | null
          severity: string | null
          title: string | null
        }
        Relationships: []
      }
      invoice_balances: {
        Row: {
          balance: number | null
          customer_id: string | null
          due_on: string | null
          folio: string | null
          id: string | null
          issued_on: string | null
          overdue: boolean | null
          paid: number | null
          sales_order_id: string | null
          series: string | null
          status: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "order_line_facts"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_facts: {
        Row: {
          amount: number | null
          category_id: string | null
          channel: string | null
          cost: number | null
          customer_id: string | null
          description: string | null
          family_id: string | null
          line_id: string | null
          order_id: string | null
          ordered_on: string | null
          product_id: string | null
          quantity: number | null
          rep_id: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_inventory_differences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_inventory_differences: {
        Row: {
          difference: number | null
          id: string | null
          name: string | null
          received_at: string | null
          shopify_available: number | null
          sku: string | null
          system_quantity: number | null
        }
        Relationships: []
      }
      tracked_link_stats: {
        Row: {
          active: boolean | null
          campaign: string | null
          channel: string | null
          code: string | null
          created_at: string | null
          destination_url: string | null
          id: string | null
          label: string | null
          last_scan_at: string | null
          leads: number | null
          scans: number | null
          scans_30d: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_invoice: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      convert_finding_to_issue: { Args: { p_id: number }; Returns: number }
      convert_lead_to_customer: { Args: { p_id: string }; Returns: string }
      convert_quote_to_order: { Args: { p_quote_id: string }; Returns: string }
      generate_reports: { Args: { p_frequency: string }; Returns: number }
      import_customers: { Args: { p_rows: Json }; Returns: Json }
      import_products: { Args: { p_rows: Json }; Returns: Json }
      import_seo_metrics: {
        Args: {
          p_dimension: string
          p_end: string
          p_rows: Json
          p_start: string
        }
        Returns: number
      }
      kpi_acquisition: {
        Args: { p_end: string; p_start: string }
        Returns: {
          contacted: number
          conversations: number
          opportunities: number
          pending_follow_up: number
          prospects: number
          replies: number
          source: string
          won: number
        }[]
      }
      kpi_by_family: {
        Args: { p_end: string; p_start: string }
        Returns: {
          family: string
          family_id: string
          margin: number
          products: number
          sales: number
          units: number
        }[]
      }
      kpi_by_product: {
        Args: { p_end: string; p_family_id?: string; p_start: string }
        Returns: {
          family: string
          margin: number
          orders: number
          product: string
          product_id: string
          sales: number
          sku: string
          stock: number
          units: number
        }[]
      }
      kpi_by_rep: {
        Args: { p_end: string; p_start: string }
        Returns: {
          families: number
          orders: number
          pending_follow_ups: number
          quote_conversion: number
          quotes_issued: number
          quotes_won: number
          rep: string
          rep_id: string
          sales: number
        }[]
      }
      kpi_commercial: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      kpi_operations: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      kpi_sales_by_day: {
        Args: { p_end: string; p_start: string }
        Returns: {
          day: string
          orders: number
          sales: number
        }[]
      }
      log_quote_follow_up: { Args: { p_id: string }; Returns: undefined }
      my_profile: {
        Args: never
        Returns: {
          display_name: string
          email: string
          id: string
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      order_timeline: {
        Args: { p_order_id: string }
        Returns: {
          detail: string
          document_id: string
          kind: string
          occurred_at: string
          title: string
        }[]
      }
      receive_purchase: {
        Args: { p_lines: Json; p_notes?: string; p_purchase_id: string }
        Returns: string
      }
      record_transfer: {
        Args: {
          p_from_location_id: string
          p_product_id: string
          p_quantity: number
          p_reason?: string
          p_to_location_id: string
        }
        Returns: string
      }
      register_delivery: {
        Args: {
          p_evidence_paths: string[]
          p_notes?: string
          p_received_by_name: string
          p_shipment_id: string
        }
        Returns: string
      }
      register_invoice: {
        Args: {
          p_cfdi_uuid?: string
          p_due_on?: string
          p_folio: string
          p_issued_on?: string
          p_notes?: string
          p_order_id: string
          p_series?: string
        }
        Returns: string
      }
      register_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_method?: string
          p_notes?: string
          p_paid_on?: string
          p_reference?: string
        }
        Returns: string
      }
      resolve_stock_count: {
        Args: { p_action: string; p_count_id: string; p_reason: string }
        Returns: {
          adjustment_movement_id: number | null
          counted_at: string
          counted_by: string | null
          counted_quantity: number
          difference: number | null
          id: string
          location_id: string
          notes: string | null
          product_id: string
          resolution_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: Database["public"]["Enums"]["data_source"]
          status: string
          system_quantity: number
        }
        SetofOptions: {
          from: "*"
          to: "stock_counts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      run_agent: { Args: { p_agent: string }; Returns: number }
      run_data_quality_check: { Args: never; Returns: Json }
      save_ai_narrative: {
        Args: { p_id: string; p_narrative: string; p_target: string }
        Returns: undefined
      }
      save_order: {
        Args: { p_header: Json; p_id: string; p_lines: Json }
        Returns: string
      }
      save_purchase: {
        Args: { p_header: Json; p_id: string; p_lines: Json }
        Returns: string
      }
      save_quote: {
        Args: { p_header: Json; p_id: string; p_lines: Json }
        Returns: string
      }
      set_control_setting: {
        Args: { p_key: string; p_value: number }
        Returns: undefined
      }
      set_integration_setting: {
        Args: { p_enabled: boolean; p_key: string }
        Returns: undefined
      }
      set_order_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      set_purchase_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      set_quote_status: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: undefined
      }
      set_shipment_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      ship_order: {
        Args: { p_header: Json; p_lines: Json; p_order_id: string }
        Returns: string
      }
      shopify_apply_customer: { Args: { p: Json }; Returns: string }
      shopify_apply_order: { Args: { p: Json }; Returns: string }
      shopify_apply_product: { Args: { p: Json }; Returns: string }
      shopify_inventory_to_push: {
        Args: never
        Returns: {
          quantity: number
          shopify_inventory_item_id: string
          sku: string
        }[]
      }
      shopify_log_run: {
        Args: {
          p_entity: string
          p_error: string
          p_received: number
          p_status: string
          p_triggered_by: string
          p_upserted: number
        }
        Returns: undefined
      }
      shopify_record_inventory: { Args: { p: Json }; Returns: undefined }
      shopify_store_raw: {
        Args: { p_entity: string; p_external_id: string; p_payload: Json }
        Returns: boolean
      }
      track_link: {
        Args: { p_code: string; p_device?: string }
        Returns: string
      }
      update_product: {
        Args: { p_id: string; p_reason?: string; p_values: Json }
        Returns: {
          active: boolean
          barcode: string | null
          brand: string | null
          category_id: string | null
          cost: number | null
          created_at: string
          description: string | null
          family_id: string | null
          id: string
          name: string
          photo_url: string | null
          price: number | null
          reorder_point: number
          shopify_inventory_item_id: string | null
          shopify_product_id: string | null
          shopify_variant_id: string | null
          sku: string
          source: Database["public"]["Enums"]["data_source"]
          unit: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_remission: {
        Args: { p_approved: boolean; p_id: string; p_notes?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "direccion"
        | "admin"
        | "ventas"
        | "compras"
        | "almacen"
        | "logistica"
        | "finanzas"
        | "marketing"
      data_source: "erp" | "shopify" | "ga4" | "manual" | "demo"
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "direccion",
        "admin",
        "ventas",
        "compras",
        "almacen",
        "logistica",
        "finanzas",
        "marketing",
      ],
      data_source: ["erp", "shopify", "ga4", "manual", "demo"],
    },
  },
} as const
