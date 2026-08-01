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
          affected_route_or_stop: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          affected_route_or_stop?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          affected_route_or_stop?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_places: {
        Row: {
          address: string | null
          created_at: string
          id: string
          label: string
          lat: number | null
          lng: number | null
          name: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          label: string
          lat?: number | null
          lng?: number | null
          name: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          label?: string
          lat?: number | null
          lng?: number | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_routes: {
        Row: {
          created_at: string
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string
          filters: Json
          id: string
          name: string
          origin_lat: number | null
          origin_lng: number | null
          origin_name: string
          priority: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name: string
          filters?: Json
          id?: string
          name: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name: string
          priority?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string
          filters?: Json
          id?: string
          name?: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string
          priority?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_stops: {
        Row: {
          created_at: string
          id: string
          stop_code: string | null
          stop_lat: number | null
          stop_lng: number | null
          stop_name: string
          transport_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stop_code?: string | null
          stop_lat?: number | null
          stop_lng?: number | null
          stop_name: string
          transport_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stop_code?: string | null
          stop_lat?: number | null
          stop_lng?: number | null
          stop_name?: string
          transport_type?: string
          user_id?: string
        }
        Relationships: []
      }
      incident_reports: {
        Row: {
          bus_stop_code: string | null
          confirms: number
          created_at: string
          description: string | null
          dismisses: number
          expires_at: string
          id: string
          lat: number | null
          lng: number | null
          service_no: string | null
          type: Database["public"]["Enums"]["incident_type"]
          user_id: string
        }
        Insert: {
          bus_stop_code?: string | null
          confirms?: number
          created_at?: string
          description?: string | null
          dismisses?: number
          expires_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          service_no?: string | null
          type: Database["public"]["Enums"]["incident_type"]
          user_id: string
        }
        Update: {
          bus_stop_code?: string | null
          confirms?: number
          created_at?: string
          description?: string | null
          dismisses?: number
          expires_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          service_no?: string | null
          type?: Database["public"]["Enums"]["incident_type"]
          user_id?: string
        }
        Relationships: []
      }
      incident_votes: {
        Row: {
          created_at: string
          id: string
          is_confirm: boolean
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_confirm: boolean
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_confirm?: boolean
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_votes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          card_type: string
          created_at: string
          display_name: string | null
          home_lat: number | null
          home_lng: number | null
          home_name: string | null
          id: string
          location_permission: string | null
          notification_permission: string | null
          occupation: string
          points: number
          reports_count: number
          terms_accepted_at: string | null
          updated_at: string
          work_lat: number | null
          work_lng: number | null
          work_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          card_type?: string
          created_at?: string
          display_name?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_name?: string | null
          id: string
          location_permission?: string | null
          notification_permission?: string | null
          occupation?: string
          points?: number
          reports_count?: number
          terms_accepted_at?: string | null
          updated_at?: string
          work_lat?: number | null
          work_lng?: number | null
          work_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          card_type?: string
          created_at?: string
          display_name?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_name?: string | null
          id?: string
          location_permission?: string | null
          notification_permission?: string | null
          occupation?: string
          points?: number
          reports_count?: number
          terms_accepted_at?: string | null
          updated_at?: string
          work_lat?: number | null
          work_lng?: number | null
          work_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      incident_type:
        | "crowding"
        | "breakdown"
        | "delay"
        | "no_show"
        | "accessibility"
        | "police"
        | "hazard"
        | "other"
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
      incident_type: [
        "crowding",
        "breakdown",
        "delay",
        "no_show",
        "accessibility",
        "police",
        "hazard",
        "other",
      ],
    },
  },
} as const
