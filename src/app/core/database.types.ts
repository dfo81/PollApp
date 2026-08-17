export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      surveys: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string;
          ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category: string;
          ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          ends_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          survey_id: string;
          text: string;
          position: number;
          allow_multiple: boolean;
        };
        Insert: {
          id?: string;
          survey_id: string;
          text: string;
          position: number;
          allow_multiple?: boolean;
        };
        Update: {
          id?: string;
          survey_id?: string;
          text?: string;
          position?: number;
          allow_multiple?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_survey_id_fkey';
            columns: ['survey_id'];
            referencedRelation: 'surveys';
            referencedColumns: ['id'];
          },
        ];
      };
      options: {
        Row: {
          id: string;
          question_id: string;
          text: string;
          position: number;
        };
        Insert: {
          id?: string;
          question_id: string;
          text: string;
          position: number;
        };
        Update: {
          id?: string;
          question_id?: string;
          text?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'options_question_id_fkey';
            columns: ['question_id'];
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      votes: {
        Row: {
          id: string;
          option_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          option_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          option_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'votes_option_id_fkey';
            columns: ['option_id'];
            referencedRelation: 'options';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
