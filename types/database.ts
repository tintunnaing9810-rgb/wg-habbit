export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          grace_week_year: number | null;
          grace_week_num: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          grace_week_year?: number | null;
          grace_week_num?: number | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          email?: string;
          avatar_url?: string | null;
          grace_week_year?: number | null;
          grace_week_num?: number | null;
        };
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          emoji: string;
          category: 'Health & Body' | 'Mind & Focus' | 'No Bad Habits' | 'Custom';
          frequency: 'daily' | 'weekdays' | 'x_per_week';
          frequency_target: number;
          target_type: 'yes_no' | 'quantity';
          target_quantity: number | null;
          is_public: boolean;
          current_streak: number;
          best_streak: number;
          last_logged_date: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          emoji?: string;
          category: 'Health & Body' | 'Mind & Focus' | 'No Bad Habits' | 'Custom';
          frequency: 'daily' | 'weekdays' | 'x_per_week';
          frequency_target?: number;
          target_type: 'yes_no' | 'quantity';
          target_quantity?: number | null;
          is_public?: boolean;
          current_streak?: number;
          best_streak?: number;
          last_logged_date?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          emoji?: string;
          category?: 'Health & Body' | 'Mind & Focus' | 'No Bad Habits' | 'Custom';
          frequency?: 'daily' | 'weekdays' | 'x_per_week';
          frequency_target?: number;
          target_type?: 'yes_no' | 'quantity';
          target_quantity?: number | null;
          is_public?: boolean;
          current_streak?: number;
          best_streak?: number;
          last_logged_date?: string | null;
          is_active?: boolean;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          log_date: string;
          quantity: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          log_date: string;
          quantity?: number | null;
        };
        Update: {
          quantity?: number | null;
        };
      };
      habit_reactions: {
        Row: {
          id: string;
          log_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          log_id: string;
          user_id: string;
          emoji: string;
        };
        Update: {
          emoji?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type User = Database['public']['Tables']['users']['Row'];
export type Habit = Database['public']['Tables']['habits']['Row'];
export type HabitLog = Database['public']['Tables']['habit_logs']['Row'];
export type HabitReaction = Database['public']['Tables']['habit_reactions']['Row'];
