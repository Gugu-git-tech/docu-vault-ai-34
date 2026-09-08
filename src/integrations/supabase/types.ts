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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          document_id: string | null
          id: string
          new_status: string | null
          previous_status: string | null
          stage: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          document_id?: string | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          stage?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          document_id?: string | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          stage?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_approvals: {
        Row: {
          action: string
          actor_id: string
          actor_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          document_id: string
          id: string
          reason: string | null
          stage: number
        }
        Insert: {
          action: string
          actor_id: string
          actor_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          document_id: string
          id?: string
          reason?: string | null
          stage: number
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          document_id?: string
          id?: string
          reason?: string | null
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          currency: string | null
          current_stage: number
          doc_date: string | null
          doc_type: Database["public"]["Enums"]["doc_type"] | null
          duplicate_of: string | null
          duplicate_reason: string | null
          extraction_confidence: number | null
          extraction_error: string | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          invoice_number: string | null
          mime_type: string
          raw_extraction: Json | null
          status: Database["public"]["Enums"]["doc_status"]
          subtotal: number | null
          total_amount: number | null
          updated_at: string
          uploaded_by: string
          validation_issues: Json
          vat_amount: number | null
          vendor: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          current_stage?: number
          doc_date?: string | null
          doc_type?: Database["public"]["Enums"]["doc_type"] | null
          duplicate_of?: string | null
          duplicate_reason?: string | null
          extraction_confidence?: number | null
          extraction_error?: string | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          invoice_number?: string | null
          mime_type: string
          raw_extraction?: Json | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
          uploaded_by: string
          validation_issues?: Json
          vat_amount?: number | null
          vendor?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          current_stage?: number
          doc_date?: string | null
          doc_type?: Database["public"]["Enums"]["doc_type"] | null
          duplicate_of?: string | null
          duplicate_reason?: string | null
          extraction_confidence?: number | null
          extraction_error?: string | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          invoice_number?: string | null
          mime_type?: string
          raw_extraction?: Json | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
          uploaded_by?: string
          validation_issues?: Json
          vat_amount?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_activity: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_activity?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_activity?: string | null
          status?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "approver" | "viewer"
      doc_status:
        | "processing"
        | "pending"
        | "approved"
        | "rejected"
        | "duplicate"
      doc_type: "invoice" | "credit_note"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "approver", "viewer"],
      doc_status: [
        "processing",
        "pending",
        "approved",
        "rejected",
        "duplicate",
      ],
      doc_type: ["invoice", "credit_note"],
    },
  },
} as const
