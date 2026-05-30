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
      alerts: {
        Row: {
          agent_name: string | null
          created_at: string
          description: string | null
          detected_at: string
          external_id: string | null
          id: string
          organization: string | null
          raw_data: Json | null
          rule_id: string | null
          severity: number
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_name?: string | null
          created_at?: string
          description?: string | null
          detected_at?: string
          external_id?: string | null
          id?: string
          organization?: string | null
          raw_data?: Json | null
          rule_id?: string | null
          severity?: number
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_name?: string | null
          created_at?: string
          description?: string | null
          detected_at?: string
          external_id?: string | null
          id?: string
          organization?: string | null
          raw_data?: Json | null
          rule_id?: string | null
          severity?: number
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      iocs: {
        Row: {
          created_at: string
          external_id: string | null
          first_seen: string | null
          id: string
          ioc_type: string
          last_seen: string | null
          organization: string | null
          source: string
          tags: string[] | null
          threat_level: string
          threat_name: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          first_seen?: string | null
          id?: string
          ioc_type: string
          last_seen?: string | null
          organization?: string | null
          source?: string
          tags?: string[] | null
          threat_level?: string
          threat_name?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          first_seen?: string | null
          id?: string
          ioc_type?: string
          last_seen?: string | null
          organization?: string | null
          source?: string
          tags?: string[] | null
          threat_level?: string
          threat_name?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          generation: string | null
          id: string
          info: string | null
          is_active: boolean
          matricule: string | null
          organization: string | null
          perm_dispatching: boolean | null
          perm_show_experiences: boolean | null
          perm_show_followers: boolean | null
          phone: string | null
          physical_address: string | null
          tag_policy: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          generation?: string | null
          id: string
          info?: string | null
          is_active?: boolean
          matricule?: string | null
          organization?: string | null
          perm_dispatching?: boolean | null
          perm_show_experiences?: boolean | null
          perm_show_followers?: boolean | null
          phone?: string | null
          physical_address?: string | null
          tag_policy?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          generation?: string | null
          id?: string
          info?: string | null
          is_active?: boolean
          matricule?: string | null
          organization?: string | null
          perm_dispatching?: boolean | null
          perm_show_experiences?: boolean | null
          perm_show_followers?: boolean | null
          phone?: string | null
          physical_address?: string | null
          tag_policy?: string | null
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      get_user_org: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyste" | "manager" | "client"
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
      app_role: ["admin", "analyste", "manager", "client"],
    },
  },
} as const
