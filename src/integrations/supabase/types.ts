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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      match_invites: {
        Row: {
          created_at: string
          from_user_id: string
          game_id: string
          id: string
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          game_id: string
          id?: string
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          game_id?: string
          id?: string
          status?: string
          to_user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          ai_score: number
          balls_played: number
          created_at: string
          id: string
          innings_data: Json | null
          mode: string
          result: string
          user_id: string
          user_score: number
        }
        Insert: {
          ai_score?: number
          balls_played?: number
          created_at?: string
          id?: string
          innings_data?: Json | null
          mode?: string
          result: string
          user_id: string
          user_score?: number
        }
        Update: {
          ai_score?: number
          balls_played?: number
          created_at?: string
          id?: string
          innings_data?: Json | null
          mode?: string
          result?: string
          user_id?: string
          user_score?: number
        }
        Relationships: []
      }
      multiplayer_games: {
        Row: {
          abandoned_by: string | null
          created_at: string
          current_turn: number
          guest_id: string | null
          guest_move: string | null
          guest_reserve_ms: number
          guest_score: number
          host_batting: boolean
          host_id: string
          host_move: string | null
          host_reserve_ms: number
          host_score: number
          id: string
          innings: number
          status: string
          target_guest_id: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          abandoned_by?: string | null
          created_at?: string
          current_turn?: number
          guest_id?: string | null
          guest_move?: string | null
          guest_reserve_ms?: number
          guest_score?: number
          host_batting?: boolean
          host_id: string
          host_move?: string | null
          host_reserve_ms?: number
          host_score?: number
          id?: string
          innings?: number
          status?: string
          target_guest_id?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          abandoned_by?: string | null
          created_at?: string
          current_turn?: number
          guest_id?: string | null
          guest_move?: string | null
          guest_reserve_ms?: number
          guest_score?: number
          host_batting?: boolean
          host_id?: string
          host_move?: string | null
          host_reserve_ms?: number
          host_score?: number
          id?: string
          innings?: number
          status?: string
          target_guest_id?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          abandons: number
          avatar_index: number
          avatar_url: string | null
          best_streak: number
          created_at: string
          current_streak: number
          display_name: string
          draws: number
          high_score: number
          id: string
          invite_code: string
          losses: number
          total_matches: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          abandons?: number
          avatar_index?: number
          avatar_url?: string | null
          best_streak?: number
          created_at?: string
          current_streak?: number
          display_name?: string
          draws?: number
          high_score?: number
          id?: string
          invite_code?: string
          losses?: number
          total_matches?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          abandons?: number
          avatar_index?: number
          avatar_url?: string | null
          best_streak?: number
          created_at?: string
          current_streak?: number
          display_name?: string
          draws?: number
          high_score?: number
          id?: string
          invite_code?: string
          losses?: number
          total_matches?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: []
      }
      season_snapshots: {
        Row: {
          abandons: number
          best_streak: number
          created_at: string
          draws: number
          high_score: number
          id: string
          losses: number
          rank: number | null
          season_end: string
          season_label: string
          season_start: string
          total_matches: number
          user_id: string
          wins: number
        }
        Insert: {
          abandons?: number
          best_streak?: number
          created_at?: string
          draws?: number
          high_score?: number
          id?: string
          losses?: number
          rank?: number | null
          season_end: string
          season_label: string
          season_start: string
          total_matches?: number
          user_id: string
          wins?: number
        }
        Update: {
          abandons?: number
          best_streak?: number
          created_at?: string
          draws?: number
          high_score?: number
          id?: string
          losses?: number
          rank?: number | null
          season_end?: string
          season_label?: string
          season_start?: string
          total_matches?: number
          user_id?: string
          wins?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { request_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
