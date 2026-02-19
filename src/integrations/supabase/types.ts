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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          status: string
          tables_included: string[]
          total_records: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          status?: string
          tables_included?: string[]
          total_records?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          status?: string
          tables_included?: string[]
          total_records?: number | null
          user_id?: string
        }
        Relationships: []
      }
      client_users: {
        Row: {
          can_view_financials: boolean | null
          client_id: string
          created_at: string | null
          id: string
          is_owner: boolean | null
          user_id: string
        }
        Insert: {
          can_view_financials?: boolean | null
          client_id: string
          created_at?: string | null
          id?: string
          is_owner?: boolean | null
          user_id: string
        }
        Update: {
          can_view_financials?: boolean | null
          client_id?: string
          created_at?: string | null
          id?: string
          is_owner?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      duplicate_deletion_logs: {
        Row: {
          audit_type: string
          client_id: string
          created_at: string
          deleted_by: string
          id: string
          justification: string
          platform: string
          transaction_data: Json
          transaction_id: string
          transaction_identifier: string
        }
        Insert: {
          audit_type?: string
          client_id: string
          created_at?: string
          deleted_by: string
          id?: string
          justification: string
          platform: string
          transaction_data: Json
          transaction_id: string
          transaction_identifier: string
        }
        Update: {
          audit_type?: string
          client_id?: string
          created_at?: string
          deleted_by?: string
          id?: string
          justification?: string
          platform?: string
          transaction_data?: Json
          transaction_id?: string
          transaction_identifier?: string
        }
        Relationships: []
      }
      eduzz_transaction_deletion_logs: {
        Row: {
          client_id: string
          created_at: string
          deleted_by: string
          id: string
          justification: string
          sale_id: string
          transaction_data: Json
          transaction_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_by: string
          id?: string
          justification: string
          sale_id: string
          transaction_data: Json
          transaction_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_by?: string
          id?: string
          justification?: string
          sale_id?: string
          transaction_data?: Json
          transaction_id?: string
        }
        Relationships: []
      }
      eduzz_transactions: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          cancelled_at: string | null
          client_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          import_id: string | null
          invoice_code: string | null
          original_currency: string | null
          original_value: number | null
          payment_form: string | null
          payment_method: string | null
          product: string | null
          product_id: string | null
          sale_date: string | null
          sale_id: string
          sale_value: number
          source: string | null
          status: string
          total_installments: number | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          import_id?: string | null
          invoice_code?: string | null
          original_currency?: string | null
          original_value?: number | null
          payment_form?: string | null
          payment_method?: string | null
          product?: string | null
          product_id?: string | null
          sale_date?: string | null
          sale_id: string
          sale_value?: number
          source?: string | null
          status?: string
          total_installments?: number | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          import_id?: string | null
          invoice_code?: string | null
          original_currency?: string | null
          original_value?: number | null
          payment_form?: string | null
          payment_method?: string | null
          product?: string | null
          product_id?: string | null
          sale_date?: string | null
          sale_id?: string
          sale_value?: number
          source?: string | null
          status?: string
          total_installments?: number | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eduzz_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eduzz_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          export_type: string
          file_name: string | null
          file_path: string | null
          filters: Json | null
          id: string
          progress: number | null
          status: string
          total_records: number | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_type?: string
          file_name?: string | null
          file_path?: string | null
          filters?: Json | null
          id?: string
          progress?: number | null
          status?: string
          total_records?: number | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_type?: string
          file_name?: string | null
          file_path?: string | null
          filters?: Json | null
          id?: string
          progress?: number | null
          status?: string
          total_records?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      external_webhooks: {
        Row: {
          client_id: string | null
          created_at: string
          custom_text_end: string | null
          custom_text_start: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          schedule: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          custom_text_end?: string | null
          custom_text_start?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          schedule?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          custom_text_end?: string | null
          custom_text_start?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          schedule?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_webhooks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_views: {
        Row: {
          billing_type: string | null
          client_id: string | null
          created_at: string | null
          custom_date_end: string | null
          custom_date_start: string | null
          id: string
          is_favorite: boolean | null
          name: string
          payment_method: string | null
          period: string | null
          product: string | null
          sck_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_type?: string | null
          client_id?: string | null
          created_at?: string | null
          custom_date_end?: string | null
          custom_date_start?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          payment_method?: string | null
          period?: string | null
          product?: string | null
          sck_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_type?: string | null
          client_id?: string | null
          created_at?: string | null
          custom_date_end?: string | null
          custom_date_start?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          payment_method?: string | null
          period?: string | null
          product?: string | null
          sck_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filter_views_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_history: {
        Row: {
          action: string
          created_at: string
          goal_id: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          goal_id: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          goal_id?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          client_id: string | null
          created_at: string
          currency: string
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          currency?: string
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          currency?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          created_at: string
          error_message: string | null
          error_type: string
          id: string
          import_id: string
          raw_data: Json | null
          row_number: number | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          error_type: string
          id?: string
          import_id: string
          raw_data?: Json | null
          row_number?: number | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          error_type?: string
          id?: string
          import_id?: string
          raw_data?: Json | null
          row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          duplicate_rows: number | null
          error_rows: number | null
          file_name: string
          file_size: number | null
          id: string
          imported_rows: number | null
          started_at: string | null
          status: string
          template_type: string
          total_rows: number | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          duplicate_rows?: number | null
          error_rows?: number | null
          file_name: string
          file_size?: number | null
          id?: string
          imported_rows?: number | null
          started_at?: string | null
          status?: string
          template_type?: string
          total_rows?: number | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          duplicate_rows?: number | null
          error_rows?: number | null
          file_name?: string
          file_size?: number | null
          id?: string
          imported_rows?: number | null
          started_at?: string | null
          status?: string
          template_type?: string
          total_rows?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          instagram: string
          name: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          instagram: string
          name: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          instagram?: string
          name?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      invitation_history: {
        Row: {
          action: string
          created_at: string
          email_sent: boolean | null
          id: string
          invitation_id: string
          new_expires_at: string | null
          new_token: string | null
          notes: string | null
          old_expires_at: string | null
          old_token: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          email_sent?: boolean | null
          id?: string
          invitation_id: string
          new_expires_at?: string | null
          new_token?: string | null
          notes?: string | null
          old_expires_at?: string | null
          old_token?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          email_sent?: boolean | null
          id?: string
          invitation_id?: string
          new_expires_at?: string | null
          new_token?: string | null
          notes?: string | null
          old_expires_at?: string | null
          old_token?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_history_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      known_landing_pages: {
        Row: {
          alert_sent: boolean
          client_id: string
          created_at: string
          first_lead_id: string | null
          first_seen_at: string
          id: string
          normalized_url: string
        }
        Insert: {
          alert_sent?: boolean
          client_id: string
          created_at?: string
          first_lead_id?: string | null
          first_seen_at?: string
          id?: string
          normalized_url: string
        }
        Update: {
          alert_sent?: boolean
          client_id?: string
          created_at?: string
          first_lead_id?: string | null
          first_seen_at?: string
          id?: string
          normalized_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "known_landing_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "known_landing_pages_first_lead_id_fkey"
            columns: ["first_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_deletion_logs: {
        Row: {
          client_id: string
          created_at: string
          deleted_by: string
          id: string
          justification: string
          lead_data: Json
          lead_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_by: string
          id?: string
          justification: string
          lead_data: Json
          lead_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_by?: string
          id?: string
          justification?: string
          lead_data?: Json
          lead_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          city: string | null
          client_id: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          customer_account: string | null
          email: string | null
          external_id: string | null
          first_name: string | null
          id: string
          ip_address: string | null
          last_name: string | null
          organization: string | null
          page_url: string | null
          phone: string | null
          raw_payload: Json | null
          region: string | null
          series_id: string | null
          source: string | null
          tags: string | null
          traffic_type: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          city?: string | null
          client_id?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          customer_account?: string | null
          email?: string | null
          external_id?: string | null
          first_name?: string | null
          id?: string
          ip_address?: string | null
          last_name?: string | null
          organization?: string | null
          page_url?: string | null
          phone?: string | null
          raw_payload?: Json | null
          region?: string | null
          series_id?: string | null
          source?: string | null
          tags?: string | null
          traffic_type?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          customer_account?: string | null
          email?: string | null
          external_id?: string | null
          first_name?: string | null
          id?: string
          ip_address?: string | null
          last_name?: string | null
          organization?: string | null
          page_url?: string | null
          phone?: string | null
          raw_payload?: Json | null
          region?: string | null
          series_id?: string | null
          source?: string | null
          tags?: string | null
          traffic_type?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_integrations: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          provider: string
          test_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          provider: string
          test_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          provider?: string
          test_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      permission_audit_logs: {
        Row: {
          action: string
          changed_by: string
          client_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: boolean
          old_value: boolean | null
          permission_type: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_by: string
          client_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value: boolean
          old_value?: boolean | null
          permission_type?: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_by?: string
          client_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: boolean
          old_value?: boolean | null
          permission_type?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_currency: string | null
          full_name: string | null
          id: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string | null
          full_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string | null
          full_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tmb_transactions: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          cancelled_at: string | null
          client_id: string | null
          created_at: string | null
          currency: string | null
          effective_date: string | null
          id: string
          import_id: string | null
          order_id: string
          product: string | null
          source: string | null
          status: string
          ticket_value: number
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          effective_date?: string | null
          id?: string
          import_id?: string | null
          order_id: string
          product?: string | null
          source?: string | null
          status?: string
          ticket_value?: number
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          effective_date?: string | null
          id?: string
          import_id?: string | null
          order_id?: string
          product?: string | null
          source?: string | null
          status?: string
          ticket_value?: number
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmb_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmb_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          billing_type: string | null
          business_model: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          client_id: string | null
          computed_value: number
          country: string | null
          created_at: string
          currency: string
          date_next_charge: string | null
          gross_value_with_taxes: number
          id: string
          import_id: string | null
          marketplace_commission: number | null
          offer_code: string | null
          original_currency: string | null
          original_value: number | null
          payment_method: string | null
          producer_commission: number | null
          product: string | null
          product_id: string | null
          product_ucode: string | null
          projected_value: number | null
          purchase_date: string | null
          recurrence_number: number | null
          sck_code: string | null
          source: string | null
          subscriber_code: string | null
          subscription_status: string | null
          total_installments: number | null
          transaction_code: string
          user_id: string
        }
        Insert: {
          billing_type?: string | null
          business_model?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          client_id?: string | null
          computed_value?: number
          country?: string | null
          created_at?: string
          currency?: string
          date_next_charge?: string | null
          gross_value_with_taxes?: number
          id?: string
          import_id?: string | null
          marketplace_commission?: number | null
          offer_code?: string | null
          original_currency?: string | null
          original_value?: number | null
          payment_method?: string | null
          producer_commission?: number | null
          product?: string | null
          product_id?: string | null
          product_ucode?: string | null
          projected_value?: number | null
          purchase_date?: string | null
          recurrence_number?: number | null
          sck_code?: string | null
          source?: string | null
          subscriber_code?: string | null
          subscription_status?: string | null
          total_installments?: number | null
          transaction_code: string
          user_id: string
        }
        Update: {
          billing_type?: string | null
          business_model?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          client_id?: string | null
          computed_value?: number
          country?: string | null
          created_at?: string
          currency?: string
          date_next_charge?: string | null
          gross_value_with_taxes?: number
          id?: string
          import_id?: string | null
          marketplace_commission?: number | null
          offer_code?: string | null
          original_currency?: string | null
          original_value?: number | null
          payment_method?: string | null
          producer_commission?: number | null
          product?: string | null
          product_id?: string | null
          product_ucode?: string | null
          projected_value?: number | null
          purchase_date?: string | null
          recurrence_number?: number | null
          sck_code?: string | null
          source?: string | null
          subscriber_code?: string | null
          subscription_status?: string | null
          total_installments?: number | null
          transaction_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_backup_20260118: {
        Row: {
          backup_created_at: string | null
          billing_type: string | null
          business_model: string | null
          buyer_email: string | null
          buyer_name: string | null
          client_id: string | null
          computed_value: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          date_next_charge: string | null
          gross_value_with_taxes: number | null
          id: string | null
          import_id: string | null
          marketplace_commission: number | null
          offer_code: string | null
          payment_method: string | null
          producer_commission: number | null
          product: string | null
          product_id: string | null
          product_ucode: string | null
          purchase_date: string | null
          recurrence_number: number | null
          sck_code: string | null
          source: string | null
          subscriber_code: string | null
          subscription_status: string | null
          total_installments: number | null
          transaction_code: string | null
          user_id: string | null
        }
        Insert: {
          backup_created_at?: string | null
          billing_type?: string | null
          business_model?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          client_id?: string | null
          computed_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_next_charge?: string | null
          gross_value_with_taxes?: number | null
          id?: string | null
          import_id?: string | null
          marketplace_commission?: number | null
          offer_code?: string | null
          payment_method?: string | null
          producer_commission?: number | null
          product?: string | null
          product_id?: string | null
          product_ucode?: string | null
          purchase_date?: string | null
          recurrence_number?: number | null
          sck_code?: string | null
          source?: string | null
          subscriber_code?: string | null
          subscription_status?: string | null
          total_installments?: number | null
          transaction_code?: string | null
          user_id?: string | null
        }
        Update: {
          backup_created_at?: string | null
          billing_type?: string | null
          business_model?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          client_id?: string | null
          computed_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_next_charge?: string | null
          gross_value_with_taxes?: number | null
          id?: string | null
          import_id?: string | null
          marketplace_commission?: number | null
          offer_code?: string | null
          payment_method?: string | null
          producer_commission?: number | null
          product?: string | null
          product_id?: string | null
          product_ucode?: string | null
          purchase_date?: string | null
          recurrence_number?: number | null
          sck_code?: string | null
          source?: string | null
          subscriber_code?: string | null
          subscription_status?: string | null
          total_installments?: number | null
          transaction_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions_computed_backup: {
        Row: {
          backup_created_at: string | null
          billing_type: string | null
          business_model: string | null
          buyer_email: string | null
          buyer_name: string | null
          client_id: string | null
          computed_value: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          date_next_charge: string | null
          gross_value_with_taxes: number | null
          id: string | null
          import_id: string | null
          marketplace_commission: number | null
          offer_code: string | null
          payment_method: string | null
          producer_commission: number | null
          product: string | null
          product_id: string | null
          product_ucode: string | null
          purchase_date: string | null
          recurrence_number: number | null
          sck_code: string | null
          source: string | null
          subscriber_code: string | null
          subscription_status: string | null
          total_installments: number | null
          transaction_code: string | null
          user_id: string | null
        }
        Insert: {
          backup_created_at?: string | null
          billing_type?: string | null
          business_model?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          client_id?: string | null
          computed_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_next_charge?: string | null
          gross_value_with_taxes?: number | null
          id?: string | null
          import_id?: string | null
          marketplace_commission?: number | null
          offer_code?: string | null
          payment_method?: string | null
          producer_commission?: number | null
          product?: string | null
          product_id?: string | null
          product_ucode?: string | null
          purchase_date?: string | null
          recurrence_number?: number | null
          sck_code?: string | null
          source?: string | null
          subscriber_code?: string | null
          subscription_status?: string | null
          total_installments?: number | null
          transaction_code?: string | null
          user_id?: string | null
        }
        Update: {
          backup_created_at?: string | null
          billing_type?: string | null
          business_model?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          client_id?: string | null
          computed_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_next_charge?: string | null
          gross_value_with_taxes?: number | null
          id?: string | null
          import_id?: string | null
          marketplace_commission?: number | null
          offer_code?: string | null
          payment_method?: string | null
          producer_commission?: number | null
          product?: string | null
          product_id?: string | null
          product_ucode?: string | null
          purchase_date?: string | null
          recurrence_number?: number | null
          sck_code?: string | null
          source?: string | null
          subscriber_code?: string | null
          subscription_status?: string | null
          total_installments?: number | null
          transaction_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions_inverted_backup: {
        Row: {
          backup_created_at: string | null
          billing_type: string | null
          business_model: string | null
          buyer_email: string | null
          buyer_name: string | null
          client_id: string | null
          computed_value: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          date_next_charge: string | null
          gross_value_with_taxes: number | null
          id: string | null
          import_id: string | null
          marketplace_commission: number | null
          offer_code: string | null
          payment_method: string | null
          producer_commission: number | null
          product: string | null
          product_id: string | null
          product_ucode: string | null
          projected_value: number | null
          purchase_date: string | null
          recurrence_number: number | null
          sck_code: string | null
          source: string | null
          subscriber_code: string | null
          subscription_status: string | null
          total_installments: number | null
          transaction_code: string | null
          user_id: string | null
        }
        Insert: {
          backup_created_at?: string | null
          billing_type?: string | null
          business_model?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          client_id?: string | null
          computed_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_next_charge?: string | null
          gross_value_with_taxes?: number | null
          id?: string | null
          import_id?: string | null
          marketplace_commission?: number | null
          offer_code?: string | null
          payment_method?: string | null
          producer_commission?: number | null
          product?: string | null
          product_id?: string | null
          product_ucode?: string | null
          projected_value?: number | null
          purchase_date?: string | null
          recurrence_number?: number | null
          sck_code?: string | null
          source?: string | null
          subscriber_code?: string | null
          subscription_status?: string | null
          total_installments?: number | null
          transaction_code?: string | null
          user_id?: string | null
        }
        Update: {
          backup_created_at?: string | null
          billing_type?: string | null
          business_model?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          client_id?: string | null
          computed_value?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_next_charge?: string | null
          gross_value_with_taxes?: number | null
          id?: string | null
          import_id?: string | null
          marketplace_commission?: number | null
          offer_code?: string | null
          payment_method?: string | null
          producer_commission?: number | null
          product?: string | null
          product_id?: string | null
          product_ucode?: string | null
          projected_value?: number | null
          purchase_date?: string | null
          recurrence_number?: number | null
          sck_code?: string | null
          source?: string | null
          subscriber_code?: string | null
          subscription_status?: string | null
          total_installments?: number | null
          transaction_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_dispatch_logs: {
        Row: {
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          payload: Json | null
          response_code: number | null
          status: string
          user_id: string
          webhook_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          response_code?: number | null
          status: string
          user_id: string
          webhook_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          response_code?: number | null
          status?: string
          user_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_dispatch_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_dispatch_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "external_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          client_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          status: string
          transaction_code: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          status: string
          transaction_code?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          status?: string
          transaction_code?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_leads_for_export: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: number
      }
      export_leads_batch: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_start_date?: string
        }
        Returns: {
          city: string
          country: string
          created_at: string
          email: string
          first_name: string
          last_name: string
          page_url: string
          phone: string
          source: string
          tags: string
          traffic_type: string
          utm_campaign: string
          utm_content: string
          utm_medium: string
          utm_source: string
        }[]
      }
      get_ad_trend_data: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_group_by?: string
          p_mode?: string
          p_start_date?: string
          p_top_item_names?: string[]
        }
        Returns: Json
      }
      get_conversion_summary: {
        Args: { p_client_id: string; p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_database_schema: { Args: never; Returns: Json }
      get_eduzz_filter_options: {
        Args: { p_client_id?: string }
        Returns: Json
      }
      get_eduzz_sales_by_date: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_eduzz_top_customers: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_limit?: number
          p_start_date?: string
        }
        Returns: Json
      }
      get_eduzz_transaction_stats: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_filter_options_with_counts: {
        Args: { p_client_id?: string }
        Returns: Json
      }
      get_funnel_evolution: {
        Args: {
          p_client_id: string
          p_end_date: string
          p_group_by?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_landing_page_stats: {
        Args: {
          p_client_id: string
          p_end_date?: string
          p_limit?: number
          p_min_leads?: number
          p_start_date?: string
        }
        Returns: Json
      }
      get_lead_stats: {
        Args: {
          p_client_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_leads_paginated: {
        Args: {
          p_client_id?: string
          p_country?: string
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_page_url?: string
          p_search?: string
          p_show_test_leads?: boolean
          p_source?: string
          p_start_date?: string
          p_traffic_type?: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
        }
        Returns: Json
      }
      get_sales_breakdown_by_type: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_sales_by_date: {
        Args: {
          p_billing_type?: string
          p_client_id?: string
          p_end_date?: string
          p_payment_method?: string
          p_product?: string
          p_sck_code?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_tmb_filter_options: { Args: { p_client_id?: string }; Returns: Json }
      get_tmb_sales_by_date: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_tmb_top_customers: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_limit?: number
          p_start_date?: string
        }
        Returns: Json
      }
      get_tmb_transaction_stats: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_tmb_transaction_stats_by_user: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: Json
      }
      get_top_ads: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_limit?: number
          p_mode?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_top_ads_by_conversion: {
        Args: {
          p_client_id?: string
          p_end_date?: string
          p_limit?: number
          p_mode?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_top_customers: {
        Args: {
          p_billing_type?: string
          p_client_id?: string
          p_end_date?: string
          p_limit?: number
          p_payment_method?: string
          p_product?: string
          p_sck_code?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_transaction_date_range: {
        Args: { p_client_id?: string }
        Returns: Json
      }
      get_transaction_stats: {
        Args: {
          p_billing_type?: string
          p_client_id?: string
          p_end_date?: string
          p_payment_method?: string
          p_product?: string
          p_sck_code?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_transaction_stats_by_user: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: Json
      }
      get_transaction_stats_with_projection: {
        Args: {
          p_billing_type?: string
          p_client_id?: string
          p_end_date?: string
          p_payment_method?: string
          p_product?: string
          p_sck_code?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_user_clients: {
        Args: never
        Returns: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_client_access: { Args: { _client_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "master"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user", "master"],
    },
  },
} as const
