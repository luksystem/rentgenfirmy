export type ProjectRow = {
  id: string;
  name: string;
  type: string;
  flow_status: string;
  is_active: boolean;
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
  waiting_depends_on_us: boolean;
  waiting_increases_cost_later: boolean;
  waiting_blocks_settlement: boolean;
  client_id: string | null;
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
  project_id: string | null;
  description: string;
  was_necessary: boolean;
  is_recurring: boolean;
  duration_minutes: number | null;
  kind: string;
  created_at: string;
};

export type InterruptionInsert = Omit<InterruptionRow, "id" | "created_at"> & {
  id?: string;
};

export type InterruptionUpdate = Partial<InterruptionInsert>;

export type AppSettingsRow = {
  id: string;
  data: Record<string, unknown>;
  updated_at: string;
};

export type AppSettingsInsert = {
  id: string;
  data: Record<string, unknown>;
  updated_at?: string;
};

export type ServiceRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  status: string;
  service_type: string;
  title: string;
  client_full_name: string;
  client_location: string;
  client_email: string;
  client_phone: string;
  rates: Record<string, unknown>;
  discounts: Record<string, unknown>;
  estimate_discounts: Record<string, unknown> | null;
  actual_discounts: Record<string, unknown> | null;
  zone_settings: Record<string, unknown>;
  detailed_settlement: boolean;
  show_estimate_comparison: boolean;
  estimate: Record<string, unknown>;
  actual: Record<string, unknown>;
  client_offer_token?: string | null;
  client_offer_expires_at?: string | null;
  client_offer_status?: string | null;
  client_offer_message?: string | null;
  client_offer_responded_at?: string | null;
  client_offer_last_client_message?: string | null;
  client_offer_history?: unknown;
  client_offer_accepted_document?: unknown;
  created_at: string;
  updated_at: string;
};

export type ClientRow = {
  id: string;
  full_name: string;
  location: string;
  email: string;
  phone: string;
  notes: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientInsert = {
  id?: string;
  full_name: string;
  location?: string;
  email?: string;
  phone?: string;
  notes?: string | null;
  external_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ClientUpdate = Partial<ClientInsert>;

export type ServiceInsert = {
  id?: string;
  project_id?: string | null;
  client_id?: string | null;
  status: string;
  service_type: string;
  title: string;
  client_full_name: string;
  client_location: string;
  client_email: string;
  client_phone: string;
  rates: Record<string, unknown>;
  discounts: Record<string, unknown>;
  estimate_discounts?: Record<string, unknown> | null;
  actual_discounts?: Record<string, unknown> | null;
  zone_settings: Record<string, unknown>;
  detailed_settlement?: boolean;
  show_estimate_comparison?: boolean;
  estimate: Record<string, unknown>;
  actual: Record<string, unknown>;
  client_offer_token?: string | null;
  client_offer_expires_at?: string | null;
  client_offer_status?: string | null;
  client_offer_message?: string | null;
  client_offer_responded_at?: string | null;
  client_offer_last_client_message?: string | null;
  client_offer_history?: unknown;
  client_offer_accepted_document?: unknown;
  created_at?: string;
  updated_at?: string;
};

export type ServiceUpdate = Partial<ServiceInsert>;

export type WorkOrderRow = {
  id: string;
  source: string;
  service_id: string | null;
  project_id: string | null;
  client_id: string | null;
  status: string;
  title: string;
  service_type: string;
  client_full_name: string;
  client_location: string;
  client_email: string;
  client_phone: string;
  notes: string | null;
  accepted_at: string | null;
  offer_gross_total: number | null;
  accepted_offer_document?: unknown;
  created_at: string;
  updated_at: string;
};

export type WorkOrderInsert = {
  id?: string;
  source: string;
  service_id?: string | null;
  project_id?: string | null;
  client_id?: string | null;
  status: string;
  title: string;
  service_type: string;
  client_full_name: string;
  client_location: string;
  client_email: string;
  client_phone: string;
  notes?: string | null;
  accepted_at?: string | null;
  offer_gross_total?: number | null;
  accepted_offer_document?: unknown;
  created_at?: string;
  updated_at?: string;
};

export type WorkOrderUpdate = Partial<WorkOrderInsert>;

export type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<Omit<ProfileInsert, "id">>;

export type ProcessTemplateRow = {
  id: string;
  project_type: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type ProcessStageRow = {
  id: string;
  template_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type ProcessMilestoneRow = {
  id: string;
  stage_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type ProcessItemRow = {
  id: string;
  milestone_id: string;
  kind: string;
  title: string;
  position: number;
  created_at: string;
};

export type ProjectProcessRow = {
  id: string;
  project_id: string;
  template_id: string;
  completions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

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
      app_settings: {
        Row: AppSettingsRow;
        Insert: AppSettingsInsert;
        Update: Partial<AppSettingsInsert>;
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: ServiceInsert;
        Update: ServiceUpdate;
        Relationships: [
          {
            foreignKeyName: "services_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: ClientRow;
        Insert: ClientInsert;
        Update: ClientUpdate;
        Relationships: [];
      };
      work_orders: {
        Row: WorkOrderRow;
        Insert: WorkOrderInsert;
        Update: WorkOrderUpdate;
        Relationships: [
          {
            foreignKeyName: "work_orders_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      process_templates: {
        Row: ProcessTemplateRow;
        Insert: Partial<ProcessTemplateRow> & Pick<ProcessTemplateRow, "project_type" | "name">;
        Update: Partial<ProcessTemplateRow>;
        Relationships: [];
      };
      process_stages: {
        Row: ProcessStageRow;
        Insert: Partial<ProcessStageRow> & Pick<ProcessStageRow, "template_id" | "title">;
        Update: Partial<ProcessStageRow>;
        Relationships: [];
      };
      process_milestones: {
        Row: ProcessMilestoneRow;
        Insert: Partial<ProcessMilestoneRow> & Pick<ProcessMilestoneRow, "stage_id" | "title">;
        Update: Partial<ProcessMilestoneRow>;
        Relationships: [];
      };
      process_items: {
        Row: ProcessItemRow;
        Insert: Partial<ProcessItemRow> & Pick<ProcessItemRow, "milestone_id" | "title" | "kind">;
        Update: Partial<ProcessItemRow>;
        Relationships: [];
      };
      project_processes: {
        Row: ProjectProcessRow;
        Insert: Partial<ProjectProcessRow> & Pick<ProjectProcessRow, "project_id" | "template_id">;
        Update: Partial<ProjectProcessRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
