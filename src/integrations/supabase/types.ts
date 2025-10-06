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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_search_feedback: {
        Row: {
          ai_result: Json
          created_at: string
          feedback_type: string
          id: string
          notes: string | null
          search_query: string
          source_url: string | null
          user_id: string | null
        }
        Insert: {
          ai_result: Json
          created_at?: string
          feedback_type: string
          id?: string
          notes?: string | null
          search_query: string
          source_url?: string | null
          user_id?: string | null
        }
        Update: {
          ai_result?: Json
          created_at?: string
          feedback_type?: string
          id?: string
          notes?: string | null
          search_query?: string
          source_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_badge_interactions: {
        Row: {
          badge_id: string | null
          created_at: string
          id: string
          interaction_type: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          badge_id?: string | null
          created_at?: string
          id?: string
          interaction_type: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string | null
          created_at?: string
          id?: string
          interaction_type?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_badge_interactions_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_searches: {
        Row: {
          ai_analysis_duration_ms: number | null
          best_confidence_score: number | null
          created_at: string
          found_in_database: boolean | null
          found_via_image_matching: boolean | null
          found_via_web_search: boolean | null
          id: string
          image_matching_duration_ms: number | null
          results_found: number | null
          search_duration_ms: number | null
          search_source_used: string | null
          search_type: string
          session_id: string
          total_duration_ms: number | null
          user_id: string | null
          web_search_duration_ms: number | null
          web_search_sources_tried: string[] | null
        }
        Insert: {
          ai_analysis_duration_ms?: number | null
          best_confidence_score?: number | null
          created_at?: string
          found_in_database?: boolean | null
          found_via_image_matching?: boolean | null
          found_via_web_search?: boolean | null
          id?: string
          image_matching_duration_ms?: number | null
          results_found?: number | null
          search_duration_ms?: number | null
          search_source_used?: string | null
          search_type: string
          session_id: string
          total_duration_ms?: number | null
          user_id?: string | null
          web_search_duration_ms?: number | null
          web_search_sources_tried?: string[] | null
        }
        Update: {
          ai_analysis_duration_ms?: number | null
          best_confidence_score?: number | null
          created_at?: string
          found_in_database?: boolean | null
          found_via_image_matching?: boolean | null
          found_via_web_search?: boolean | null
          id?: string
          image_matching_duration_ms?: number | null
          results_found?: number | null
          search_duration_ms?: number | null
          search_source_used?: string | null
          search_type?: string
          session_id?: string
          total_duration_ms?: number | null
          user_id?: string | null
          web_search_duration_ms?: number | null
          web_search_sources_tried?: string[] | null
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_address: unknown | null
          last_activity: string
          platform: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          last_activity?: string
          platform?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          last_activity?: string
          platform?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_call_logs: {
        Row: {
          api_provider: string
          created_at: string
          endpoint: string
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          method: string
          request_data: Json | null
          response_status: number | null
          response_time_ms: number | null
          session_id: string | null
          success: boolean
          tokens_used: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          api_provider: string
          created_at?: string
          endpoint: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          method: string
          request_data?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean
          tokens_used?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          api_provider?: string
          created_at?: string
          endpoint?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          method?: string
          request_data?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean
          tokens_used?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      badge_confirmations: {
        Row: {
          badge_id: string
          confidence_at_time: number
          confirmation_type: string
          created_at: string
          id: string
          similarity_score: number
          user_id: string | null
        }
        Insert: {
          badge_id: string
          confidence_at_time: number
          confirmation_type: string
          created_at?: string
          id?: string
          similarity_score: number
          user_id?: string | null
        }
        Update: {
          badge_id?: string
          confidence_at_time?: number
          confirmation_type?: string
          created_at?: string
          id?: string
          similarity_score?: number
          user_id?: string | null
        }
        Relationships: []
      }
      badge_embeddings: {
        Row: {
          badge_id: string
          created_at: string
          embedding: number[]
          id: string
          updated_at: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          embedding: number[]
          id?: string
          updated_at?: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          embedding?: number[]
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_embeddings_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_images: {
        Row: {
          badge_id: string
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          updated_at: string
        }
        Insert: {
          badge_id: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          updated_at?: string
        }
        Update: {
          badge_id?: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_images_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: Database["public"]["Enums"]["badge_category"] | null
          created_at: string
          description: string | null
          external_link: string | null
          id: string
          image_url: string | null
          maker_id: string | null
          name: string
          retired: boolean
          team_name: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["badge_category"] | null
          created_at?: string
          description?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          maker_id?: string | null
          name: string
          retired?: boolean
          team_name?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["badge_category"] | null
          created_at?: string
          description?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          maker_id?: string | null
          name?: string
          retired?: boolean
          team_name?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_maker_id_fkey"
            columns: ["maker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          badge_approval_notifications: boolean
          badge_rejection_notifications: boolean
          badge_submission_notifications: boolean
          created_at: string
          id: string
          system_announcements: boolean
          updated_at: string
          user_id: string
          weekly_digest_emails: boolean
        }
        Insert: {
          badge_approval_notifications?: boolean
          badge_rejection_notifications?: boolean
          badge_submission_notifications?: boolean
          created_at?: string
          id?: string
          system_announcements?: boolean
          updated_at?: string
          user_id: string
          weekly_digest_emails?: boolean
        }
        Update: {
          badge_approval_notifications?: boolean
          badge_rejection_notifications?: boolean
          badge_submission_notifications?: boolean
          created_at?: string
          id?: string
          system_announcements?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest_emails?: boolean
        }
        Relationships: []
      }
      ownership: {
        Row: {
          badge_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          id?: string
          status: string
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_team: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_login: string | null
          maker_approved: boolean
          role: string
          updated_at: string
          wants_to_be_maker: boolean
        }
        Insert: {
          assigned_team?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          last_login?: string | null
          maker_approved?: boolean
          role?: string
          updated_at?: string
          wants_to_be_maker?: boolean
        }
        Update: {
          assigned_team?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          maker_approved?: boolean
          role?: string
          updated_at?: string
          wants_to_be_maker?: boolean
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_requests: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_description: string | null
          team_name: string
          team_website_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_description?: string | null
          team_name: string
          team_website_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_description?: string | null
          team_name?: string
          team_website_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      uploads: {
        Row: {
          analysis_metadata: Json | null
          badge_category: string | null
          badge_description: string | null
          badge_external_link: string | null
          badge_guess_id: string | null
          badge_maker: string | null
          badge_name: string | null
          badge_year: number | null
          created_at: string
          id: string
          image_url: string
          user_id: string | null
        }
        Insert: {
          analysis_metadata?: Json | null
          badge_category?: string | null
          badge_description?: string | null
          badge_external_link?: string | null
          badge_guess_id?: string | null
          badge_maker?: string | null
          badge_name?: string | null
          badge_year?: number | null
          created_at?: string
          id?: string
          image_url: string
          user_id?: string | null
        }
        Update: {
          analysis_metadata?: Json | null
          badge_category?: string | null
          badge_description?: string | null
          badge_external_link?: string | null
          badge_guess_id?: string | null
          badge_maker?: string | null
          badge_name?: string | null
          badge_year?: number | null
          created_at?: string
          id?: string
          image_url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploads_badge_guess_id_fkey"
            columns: ["badge_guess_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      web_search_sources: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          priority: number
          prompt_template: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          priority?: number
          prompt_template: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          priority?: number
          prompt_template?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_badge_stats: {
        Args: { badge_uuid: string }
        Returns: {
          owners_count: number
          wants_count: number
        }[]
      }
      get_public_maker_info: {
        Args: { maker_user_id: string }
        Returns: {
          display_name: string
          role: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
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
      app_role: "admin" | "moderator" | "user"
      badge_category:
        | "Elect Badge"
        | "None Elect Badge"
        | "SAO"
        | "Tool"
        | "Misc"
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
      app_role: ["admin", "moderator", "user"],
      badge_category: [
        "Elect Badge",
        "None Elect Badge",
        "SAO",
        "Tool",
        "Misc",
      ],
    },
  },
} as const
