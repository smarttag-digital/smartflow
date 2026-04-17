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
      automation_rules: {
        Row: {
          action: string
          created_at: string
          delay: string | null
          enabled: boolean
          id: string
          message: string | null
          name: string
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          delay?: string | null
          enabled?: boolean
          id?: string
          message?: string | null
          name: string
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          delay?: string | null
          enabled?: boolean
          id?: string
          message?: string | null
          name?: string
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          business_type: string
          commission_percent: number | null
          commission_value: number
          created_at: string
          deal_value: number
          expected_date: string | null
          id: string
          lead_id: string
          notes: string | null
          partner_id: string | null
          partner_percent: number | null
          partner_value: number | null
          received_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_type?: string
          commission_percent?: number | null
          commission_value?: number
          created_at?: string
          deal_value?: number
          expected_date?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          partner_id?: string | null
          partner_percent?: number | null
          partner_value?: number | null
          received_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_type?: string
          commission_percent?: number | null
          commission_value?: number
          created_at?: string
          deal_value?: number
          expected_date?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          partner_id?: string | null
          partner_percent?: number | null
          partner_value?: number | null
          received_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          created_at: string
          direction: string
          id: string
          lead_id: string
          message: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          lead_id: string
          message?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string
          message?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_properties: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          property_id?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          business_type: string | null
          commission_percent: number | null
          commission_value: number | null
          contract_duration: string | null
          created_at: string
          deal_value: number | null
          email: string | null
          id: string
          interest: string | null
          last_contact: string | null
          last_response: string | null
          lost_reason: string | null
          name: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string
          rent_value: number | null
          score: string
          source: string
          stage: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          business_type?: string | null
          commission_percent?: number | null
          commission_value?: number | null
          contract_duration?: string | null
          created_at?: string
          deal_value?: number | null
          email?: string | null
          id?: string
          interest?: string | null
          last_contact?: string | null
          last_response?: string | null
          lost_reason?: string | null
          name: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone: string
          rent_value?: number | null
          score?: string
          source?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          business_type?: string | null
          commission_percent?: number | null
          commission_value?: number | null
          contract_duration?: string | null
          created_at?: string
          deal_value?: number | null
          email?: string | null
          id?: string
          interest?: string | null
          last_contact?: string | null
          last_response?: string | null
          lost_reason?: string | null
          name?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string
          rent_value?: number | null
          score?: string
          source?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          partner_type: string
          phone: string | null
          region: string | null
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          partner_type?: string
          phone?: string | null
          region?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          partner_type?: string
          phone?: string | null
          region?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          default_commission_percent: number | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp_template: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          default_commission_percent?: number | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp_template?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          default_commission_percent?: number | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_template?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          business_type: string
          city: string | null
          created_at: string
          deal_value: number | null
          description: string | null
          id: string
          image_url: string | null
          neighborhood: string | null
          owner_email: string | null
          owner_name: string | null
          owner_notes: string | null
          owner_phone: string | null
          parking_spots: number | null
          property_type: string
          rent_value: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          business_type?: string
          city?: string | null
          created_at?: string
          deal_value?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          neighborhood?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_notes?: string | null
          owner_phone?: string | null
          parking_spots?: number | null
          property_type?: string
          rent_value?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          business_type?: string
          city?: string | null
          created_at?: string
          deal_value?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          neighborhood?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_notes?: string | null
          owner_phone?: string | null
          parking_spots?: number | null
          property_type?: string
          rent_value?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["user_account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["user_account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["user_account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_account_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_overdue_commissions: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      user_account_status: "pending" | "approved" | "rejected" | "blocked"
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
      user_account_status: ["pending", "approved", "rejected", "blocked"],
    },
  },
} as const
