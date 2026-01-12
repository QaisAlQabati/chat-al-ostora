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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content_ar: string
          content_en: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_important: boolean | null
          target_audience: string | null
          title_ar: string
          title_en: string
        }
        Insert: {
          content_ar: string
          content_en: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_important?: boolean | null
          target_audience?: string | null
          title_ar: string
          title_en: string
        }
        Update: {
          content_ar?: string
          content_en?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_important?: boolean | null
          target_audience?: string | null
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          icon: string
          id: string
          name_ar: string
          name_en: string
          requirement_type: string | null
          requirement_value: number | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          icon: string
          id?: string
          name_ar: string
          name_en: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          icon?: string
          id?: string
          name_ar?: string
          name_en?: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          participant_one: string
          participant_two: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant_one: string
          participant_two: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant_one?: string
          participant_two?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      frames: {
        Row: {
          created_at: string | null
          frame_type: string | null
          id: string
          image_url: string
          is_active: boolean | null
          is_vip_only: boolean | null
          min_level: number | null
          name_ar: string
          name_en: string
          price_points: number | null
          price_ruby: number | null
          rarity: Database["public"]["Enums"]["gift_rarity"] | null
        }
        Insert: {
          created_at?: string | null
          frame_type?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          is_vip_only?: boolean | null
          min_level?: number | null
          name_ar: string
          name_en: string
          price_points?: number | null
          price_ruby?: number | null
          rarity?: Database["public"]["Enums"]["gift_rarity"] | null
        }
        Update: {
          created_at?: string | null
          frame_type?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          is_vip_only?: boolean | null
          min_level?: number | null
          name_ar?: string
          name_en?: string
          price_points?: number | null
          price_ruby?: number | null
          rarity?: Database["public"]["Enums"]["gift_rarity"] | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          category: string | null
          created_at: string | null
          has_animation: boolean | null
          has_sound: boolean | null
          id: string
          image_url: string
          is_active: boolean | null
          name_ar: string
          name_en: string
          price_points: number
          price_ruby: number | null
          rarity: Database["public"]["Enums"]["gift_rarity"] | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          has_animation?: boolean | null
          has_sound?: boolean | null
          id?: string
          image_url: string
          is_active?: boolean | null
          name_ar: string
          name_en: string
          price_points?: number
          price_ruby?: number | null
          rarity?: Database["public"]["Enums"]["gift_rarity"] | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          has_animation?: boolean | null
          has_sound?: boolean | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          price_points?: number
          price_ruby?: number | null
          rarity?: Database["public"]["Enums"]["gift_rarity"] | null
        }
        Relationships: []
      }
      live_room_members: {
        Row: {
          id: string
          is_on_mic: boolean | null
          joined_at: string | null
          mic_position: number | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_on_mic?: boolean | null
          joined_at?: string | null
          mic_position?: number | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_on_mic?: boolean | null
          joined_at?: string | null
          mic_position?: number | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "public_live_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_read: boolean | null
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"] | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_lives: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          id: string
          is_live: boolean | null
          started_at: string | null
          title: string | null
          total_gifts: number | null
          total_points_earned: number | null
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean | null
          started_at?: string | null
          title?: string | null
          total_gifts?: number | null
          total_points_earned?: number | null
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean | null
          started_at?: string | null
          title?: string | null
          total_gifts?: number | null
          total_points_earned?: number | null
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ban_expires_at: string | null
          ban_reason: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          cover_picture: string | null
          created_at: string | null
          diamonds: number | null
          display_name: string
          email: string | null
          experience: number | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          interests: Json | null
          is_banned: boolean | null
          is_verified: boolean | null
          is_vip: boolean | null
          languages: Json | null
          last_seen: string | null
          level: number | null
          phone: string | null
          points: number | null
          profile_picture: string | null
          ruby: number | null
          status: Database["public"]["Enums"]["user_status"] | null
          total_gifts_received: number | null
          total_gifts_sent: number | null
          total_lives_started: number | null
          total_messages_sent: number | null
          total_stories_posted: number | null
          total_time_online: number | null
          updated_at: string | null
          user_id: string
          username: string
          vip_expires_at: string | null
          vip_type: Database["public"]["Enums"]["vip_type"] | null
        }
        Insert: {
          ban_expires_at?: string | null
          ban_reason?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          cover_picture?: string | null
          created_at?: string | null
          diamonds?: number | null
          display_name: string
          email?: string | null
          experience?: number | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          interests?: Json | null
          is_banned?: boolean | null
          is_verified?: boolean | null
          is_vip?: boolean | null
          languages?: Json | null
          last_seen?: string | null
          level?: number | null
          phone?: string | null
          points?: number | null
          profile_picture?: string | null
          ruby?: number | null
          status?: Database["public"]["Enums"]["user_status"] | null
          total_gifts_received?: number | null
          total_gifts_sent?: number | null
          total_lives_started?: number | null
          total_messages_sent?: number | null
          total_stories_posted?: number | null
          total_time_online?: number | null
          updated_at?: string | null
          user_id: string
          username: string
          vip_expires_at?: string | null
          vip_type?: Database["public"]["Enums"]["vip_type"] | null
        }
        Update: {
          ban_expires_at?: string | null
          ban_reason?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          cover_picture?: string | null
          created_at?: string | null
          diamonds?: number | null
          display_name?: string
          email?: string | null
          experience?: number | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          interests?: Json | null
          is_banned?: boolean | null
          is_verified?: boolean | null
          is_vip?: boolean | null
          languages?: Json | null
          last_seen?: string | null
          level?: number | null
          phone?: string | null
          points?: number | null
          profile_picture?: string | null
          ruby?: number | null
          status?: Database["public"]["Enums"]["user_status"] | null
          total_gifts_received?: number | null
          total_gifts_sent?: number | null
          total_lives_started?: number | null
          total_messages_sent?: number | null
          total_stories_posted?: number | null
          total_time_online?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string
          vip_expires_at?: string | null
          vip_type?: Database["public"]["Enums"]["vip_type"] | null
        }
        Relationships: []
      }
      public_live_rooms: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string | null
          created_by: string | null
          current_users: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_vip_only: boolean | null
          max_users: number | null
          mic_count: number | null
          min_level: number | null
          name: string
          total_gifts: number | null
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          current_users?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_vip_only?: boolean | null
          max_users?: number | null
          mic_count?: number | null
          min_level?: number | null
          name: string
          total_gifts?: number | null
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          current_users?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_vip_only?: boolean | null
          max_users?: number | null
          mic_count?: number | null
          min_level?: number | null
          name?: string
          total_gifts?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          evidence_url: string | null
          id: string
          reason: string
          report_type: string
          reported_user_id: string | null
          reporter_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          reason: string
          report_type: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          reason?: string
          report_type?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      sent_gifts: {
        Row: {
          context: string | null
          created_at: string | null
          gift_id: string | null
          id: string
          live_id: string | null
          quantity: number | null
          receiver_id: string | null
          sender_id: string | null
          total_points: number
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          gift_id?: string | null
          id?: string
          live_id?: string | null
          quantity?: number | null
          receiver_id?: string | null
          sender_id?: string | null
          total_points: number
        }
        Update: {
          context?: string | null
          created_at?: string | null
          gift_id?: string | null
          id?: string
          live_id?: string | null
          quantity?: number | null
          receiver_id?: string | null
          sender_id?: string | null
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "sent_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string | null
          expires_at: string
          hashtags: Json | null
          id: string
          is_active: boolean | null
          location: string | null
          media_type: string
          media_url: string
          mentions: Json | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          expires_at: string
          hashtags?: Json | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          media_type?: string
          media_url: string
          mentions?: Json | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string
          hashtags?: Json | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          media_type?: string
          media_url?: string
          mentions?: Json | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_frames: {
        Row: {
          frame_id: string
          id: string
          is_active: boolean | null
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          frame_id: string
          id?: string
          is_active?: boolean | null
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          frame_id?: string
          id?: string
          is_active?: boolean | null
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_frames_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "frames"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_points: {
        Args: { points_param: number; user_id_param: string }
        Returns: undefined
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      gender_type: "male" | "female" | "other" | "prefer_not_to_say"
      gift_rarity: "common" | "rare" | "epic" | "legendary"
      message_type: "text" | "image" | "video" | "audio" | "gift"
      user_role: "user" | "moderator" | "admin" | "super_owner"
      user_status: "online" | "offline" | "busy" | "in_live"
      vip_type: "gold" | "diamond"
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
      gender_type: ["male", "female", "other", "prefer_not_to_say"],
      gift_rarity: ["common", "rare", "epic", "legendary"],
      message_type: ["text", "image", "video", "audio", "gift"],
      user_role: ["user", "moderator", "admin", "super_owner"],
      user_status: ["online", "offline", "busy", "in_live"],
      vip_type: ["gold", "diamond"],
    },
  },
} as const
