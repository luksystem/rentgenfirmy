export type ProjectRow = {
  id: string;
  name: string;
  type: string;
  flow_status: string;
  stage: string;
  priority: string;
  next_step_owner: string;
  next_contact_date: string;
  blocker_reason: string | null;
  notes: string | null;
  last_changed_by: string;
  last_changed_at: string;
  last_contact_date: string;
  close_blocker: string | null;
  remaining_hours: number | null;
  next_action: string | null;
  close_deadline: string | null;
  created_at: string;
};

export type ProjectInsert = Omit<ProjectRow, "id" | "created_at"> & {
  id?: string;
};

export type ProjectUpdate = Partial<ProjectInsert>;

export type InterruptionRow = {
  id: string;
  date: string;
  person: string;
  type: string;
  project_id: string;
  description: string;
  created_at: string;
};

export type InterruptionInsert = Omit<InterruptionRow, "id" | "created_at"> & {
  id?: string;
};

export type InterruptionUpdate = Partial<InterruptionInsert>;

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [];
      };
      interruptions: {
        Row: InterruptionRow;
        Insert: InterruptionInsert;
        Update: InterruptionUpdate;
        Relationships: [
          {
            foreignKeyName: "interruptions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
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
