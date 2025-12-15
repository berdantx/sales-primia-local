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
      filter_views: {
        Row: {
          billing_type: string | null
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          created_at: string | null
          currency: string | null
          effective_date: string | null
          id: string
          import_id: string | null
          order_id: string
          product: string | null
          source: string | null
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
          created_at?: string | null
          currency?: string | null
          effective_date?: string | null
          id?: string
          import_id?: string | null
          order_id: string
          product?: string | null
          source?: string | null
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
          created_at?: string | null
          currency?: string | null
          effective_date?: string | null
          id?: string
          import_id?: string | null
          order_id?: string
          product?: string | null
          source?: string | null
          ticket_value?: number
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
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
          buyer_email: string | null
          buyer_name: string | null
          computed_value: number
          country: string | null
          created_at: string
          currency: string
          gross_value_with_taxes: number
          id: string
          import_id: string | null
          payment_method: string | null
          product: string | null
          purchase_date: string | null
          sck_code: string | null
          source: string | null
          total_installments: number | null
          transaction_code: string
          user_id: string
        }
        Insert: {
          billing_type?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          computed_value?: number
          country?: string | null
          created_at?: string
          currency?: string
          gross_value_with_taxes?: number
          id?: string
          import_id?: string | null
          payment_method?: string | null
          product?: string | null
          purchase_date?: string | null
          sck_code?: string | null
          source?: string | null
          total_installments?: number | null
          transaction_code: string
          user_id: string
        }
        Update: {
          billing_type?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          computed_value?: number
          country?: string | null
          created_at?: string
          currency?: string
          gross_value_with_taxes?: number
          id?: string
          import_id?: string | null
          payment_method?: string | null
          product?: string | null
          purchase_date?: string | null
          sck_code?: string | null
          source?: string | null
          total_installments?: number | null
          transaction_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_filter_options_with_counts: { Args: never; Returns: Json }
      get_sales_by_date:
        | {
            Args: { p_end_date?: string; p_start_date?: string }
            Returns: Json
          }
        | {
            Args: {
              p_billing_type?: string
              p_end_date?: string
              p_payment_method?: string
              p_sck_code?: string
              p_start_date?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_billing_type?: string
              p_end_date?: string
              p_payment_method?: string
              p_product?: string
              p_sck_code?: string
              p_start_date?: string
            }
            Returns: Json
          }
      get_top_customers:
        | {
            Args: {
              p_end_date?: string
              p_limit?: number
              p_start_date?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_billing_type?: string
              p_end_date?: string
              p_limit?: number
              p_payment_method?: string
              p_sck_code?: string
              p_start_date?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_billing_type?: string
              p_end_date?: string
              p_limit?: number
              p_payment_method?: string
              p_product?: string
              p_sck_code?: string
              p_start_date?: string
            }
            Returns: Json
          }
      get_transaction_date_range: { Args: never; Returns: Json }
      get_transaction_stats:
        | {
            Args: { p_end_date?: string; p_start_date?: string }
            Returns: Json
          }
        | {
            Args: {
              p_billing_type?: string
              p_end_date?: string
              p_payment_method?: string
              p_sck_code?: string
              p_start_date?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_billing_type?: string
              p_end_date?: string
              p_payment_method?: string
              p_product?: string
              p_sck_code?: string
              p_start_date?: string
            }
            Returns: Json
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
