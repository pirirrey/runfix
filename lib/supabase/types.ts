export type UserRole = "coach" | "runner";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role: UserRole;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          coach_id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          coach_id: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      team_memberships: {
        Row: {
          id: string;
          team_id: string;
          runner_id: string;
          joined_at: string;
        };
        Insert: {
          team_id: string;
          runner_id: string;
        };
        Update: never;
      };
      training_plans: {
        Row: {
          id: string;
          team_id: string;
          runner_id: string;
          coach_id: string;
          plan_month: string;
          storage_path: string;
          file_name: string;
          file_size: number | null;
          notes: string | null;
          uploaded_at: string;
        };
        Insert: {
          team_id: string;
          runner_id: string;
          coach_id: string;
          plan_month: string;
          storage_path: string;
          file_name: string;
          file_size?: number | null;
          notes?: string | null;
        };
        Update: {
          storage_path?: string;
          file_name?: string;
          file_size?: number | null;
          notes?: string | null;
        };
      };
    };
    Enums: {
      user_role: UserRole;
    };
  };
};
