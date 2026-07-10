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
  system_handover_at: string | null;
  warranty_duration_months: number | null;
  warranty_ends_at: string | null;
};

export type ProjectInsert = Omit<ProjectRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
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
  contact_id?: string | null;
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
  optional_items?: unknown;
  client_offer_token?: string | null;
  client_offer_expires_at?: string | null;
  client_offer_status?: string | null;
  client_offer_message?: string | null;
  client_offer_responded_at?: string | null;
  client_offer_last_client_message?: string | null;
  client_offer_history?: unknown;
  client_offer_accepted_document?: unknown;
  ai_estimate?: unknown;
  intake_reference?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientRow = {
  id: string;
  full_name: string;
  location: string;
  address_street: string;
  address_city: string;
  address_postal_code: string;
  email: string;
  phone: string;
  notes: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactRow = {
  id: string;
  full_name: string;
  location: string;
  address_street: string;
  address_city: string;
  address_postal_code: string;
  email: string;
  phone: string;
  notes: string | null;
  external_id: string | null;
  converted_client_id: string | null;
  converted_at: string | null;
  conversion_source: string | null;
  handled_at: string | null;
  history: unknown;
  created_at: string;
  updated_at: string;
};

export type ContactInsert = Partial<ContactRow> &
  Pick<ContactRow, "full_name"> & {
    history?: unknown;
  };

export type ContactUpdate = Partial<ContactRow>;

export type ClientInsert = {
  id?: string;
  full_name: string;
  location?: string;
  address_street?: string;
  address_city?: string;
  address_postal_code?: string;
  email?: string;
  phone?: string;
  notes?: string | null;
  external_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ClientUpdate = Partial<ClientInsert>;

export type DashboardSpaceRow = {
  id: string;
  kind: string;
  project_id: string | null;
  client_id: string | null;
  profile_id: string | null;
  title: string;
  public_token: string;
  public_enabled: boolean;
  public_access_password_hash: string | null;
  public_access_username: string | null;
  public_author_name: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardSpaceInsert = {
  id?: string;
  kind: string;
  project_id?: string | null;
  client_id?: string | null;
  profile_id?: string | null;
  title?: string;
  public_token?: string;
  public_enabled?: boolean;
  public_access_password_hash?: string | null;
  public_access_username?: string | null;
  public_author_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DashboardSpaceUpdate = Partial<DashboardSpaceInsert>;

export type ProjectClientAgreementRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  proposed_cost_net: number | string | null;
  proposed_cost_gross: number | string | null;
  proposed_cost_vat_rate: number | null;
  cost_note: string | null;
  created_by_name: string;
  created_by_side: string;
  submitted_at: string | null;
  client_responded_at: string | null;
  client_response_name: string | null;
  client_response_note: string | null;
  proposed_warranty_end_date: string | null;
  position: number;
  public_token: string;
  public_enabled: boolean;
  discussion_open: boolean;
  active_version_id: string | null;
  communication_protocols: string[] | null;
  acceptance_deadline_stage_id: string | null;
  blocks_next_stage: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectClientAgreementInsert = {
  id?: string;
  project_id: string;
  title: string;
  body?: string;
  category?: string;
  status?: string;
  proposed_cost_net?: number | null;
  proposed_cost_gross?: number | null;
  proposed_cost_vat_rate?: number | null;
  cost_note?: string | null;
  created_by_name: string;
  created_by_side?: string;
  submitted_at?: string | null;
  client_responded_at?: string | null;
  client_response_name?: string | null;
  client_response_note?: string | null;
  proposed_warranty_end_date?: string | null;
  position?: number;
  public_token?: string;
  public_enabled?: boolean;
  discussion_open?: boolean;
  active_version_id?: string | null;
  communication_protocols?: string[] | null;
  acceptance_deadline_stage_id?: string | null;
  blocks_next_stage?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProjectClientAgreementUpdate = Partial<ProjectClientAgreementInsert>;

export type ProjectChangeRequestRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  status: string;
  proposed_cost_net: number | string | null;
  proposed_cost_gross: number | string | null;
  proposed_cost_vat_rate: number | string | null;
  cost_note: string | null;
  created_by_name: string;
  created_by_side: string;
  submitted_at: string | null;
  client_responded_at: string | null;
  client_response_name: string | null;
  client_response_note: string | null;
  position: number;
  acceptance_deadline_stage_id: string | null;
  blocks_next_stage: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectChangeRequestInsert = {
  id?: string;
  project_id: string;
  title: string;
  body?: string;
  status?: string;
  proposed_cost_net?: number | null;
  proposed_cost_gross?: number | null;
  proposed_cost_vat_rate?: number | null;
  cost_note?: string | null;
  created_by_name: string;
  created_by_side?: string;
  submitted_at?: string | null;
  client_responded_at?: string | null;
  client_response_name?: string | null;
  client_response_note?: string | null;
  position?: number;
  acceptance_deadline_stage_id?: string | null;
  blocks_next_stage?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProjectChangeRequestUpdate = Partial<ProjectChangeRequestInsert>;

export type ProjectProcessItemLinkRow = {
  id: string;
  project_process_item_id: string;
  document_id: string | null;
  meeting_note_id: string | null;
  created_at: string;
};

export type ProjectProcessItemLinkInsert = {
  id?: string;
  project_process_item_id: string;
  document_id?: string | null;
  meeting_note_id?: string | null;
  created_at?: string;
};

export type ProjectProcessItemLinkUpdate = Partial<ProjectProcessItemLinkInsert>;

export type KnowledgeSourceRow = {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | string | null;
  status: string;
  error_message: string | null;
  char_count: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type KnowledgeSourceInsert = {
  id?: string;
  type: string;
  title: string;
  description?: string;
  url?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  status?: string;
  error_message?: string | null;
  char_count?: number;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type KnowledgeSourceUpdate = Partial<KnowledgeSourceInsert>;

export type KnowledgeChunkRow = {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  created_at: string;
};

export type KnowledgeChunkInsert = {
  id?: string;
  source_id: string;
  chunk_index?: number;
  content: string;
  created_at?: string;
};

export type KnowledgeChunkUpdate = Partial<KnowledgeChunkInsert>;

export type ProcessProtocolTemplateRow = {
  id: string;
  name: string;
  description: string;
  source: string;
  fields: unknown;
  reference_pdf_path: string | null;
  reference_pdf_name: string | null;
  project_type: string | null;
  created_at: string;
  updated_at: string;
};

export type ProcessProtocolTemplateInsert = {
  id?: string;
  name: string;
  description?: string;
  source?: string;
  fields?: unknown;
  reference_pdf_path?: string | null;
  reference_pdf_name?: string | null;
  project_type?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProcessProtocolTemplateUpdate = Partial<ProcessProtocolTemplateInsert>;

export type ProjectProcessProtocolRow = {
  id: string;
  project_process_item_id: string;
  protocol_template_id: string | null;
  field_values: unknown;
  notes: string;
  company_signature: unknown;
  client_signature: unknown;
  annotations: unknown;
  overlay_items: unknown;
  generated_pdf_path: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  linked_document_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectProcessProtocolInsert = {
  id?: string;
  project_process_item_id: string;
  protocol_template_id?: string | null;
  field_values?: unknown;
  notes?: string;
  company_signature?: unknown;
  client_signature?: unknown;
  annotations?: unknown;
  overlay_items?: unknown;
  generated_pdf_path?: string | null;
  accepted_at?: string | null;
  accepted_by?: string | null;
  linked_document_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProjectProcessProtocolUpdate = Partial<ProjectProcessProtocolInsert>;

export type ProjectAgreementApproverRoleRow = {
  id: string;
  agreement_id: string;
  label: string;
  position: number;
  is_required: boolean;
  is_client_role: boolean;
  is_team_role: boolean;
  created_at: string;
};

export type ProjectAgreementCommentRow = {
  id: string;
  agreement_id: string;
  author_name: string;
  author_source: string;
  author_role_label: string | null;
  body: string;
  created_at: string;
};

export type ProjectAgreementAttachmentRow = {
  id: string;
  agreement_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  media_kind: string;
  size_bytes: number;
  position: number;
  uploaded_by_name: string;
  uploaded_by_source: string;
  created_at: string;
};

export type ProjectSystemCredentialRow = {
  id: string;
  project_id: string;
  label: string;
  system_url: string | null;
  login_username: string | null;
  password_ciphertext: string;
  password_iv: string;
  password_tag: string;
  notes: string | null;
  visible_to_client: boolean;
  position: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type ProjectIntegrationRow = {
  id: string;
  project_id: string;
  integration_type: string;
  name: string;
  connection_method: string;
  api_url: string | null;
  port: number | null;
  login_username: string | null;
  is_active: boolean;
  technical_notes: string | null;
  config_json: Record<string, unknown>;
  last_sync_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  created_by_user_id: string | null;
  created_by_name: string;
  updated_by_user_id: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectIntegrationSecretRow = {
  integration_id: string;
  password_ciphertext: string;
  password_iv: string;
  password_tag: string;
  updated_at: string;
};

export type ProjectTelemetryRow = {
  id: string;
  project_id: string;
  integration_id: string;
  temperature: number | null;
  humidity: number | null;
  setpoint: number | null;
  alarm_status: string | null;
  online_status: boolean;
  source_name: string | null;
  measured_at: string;
  raw_payload_json: Record<string, unknown>;
  created_at: string;
};

export type ProjectIntegrationAuditLogRow = {
  id: string;
  integration_id: string | null;
  project_id: string;
  action: string;
  actor_user_id: string | null;
  actor_name: string;
  changes_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type ServiceIntakeRequestRow = {
  id: string;
  reference_number: string;
  status: string;
  client_id: string | null;
  project_id: string | null;
  service_id: string | null;
  contact_email: string;
  contact_full_name: string;
  contact_phone: string | null;
  warranty_status: string | null;
  service_type_hint: string;
  request_type: string;
  priority: string | null;
  post_warranty_action: string | null;
  description: string;
  accepted_paid_terms: boolean;
  accepted_paid_terms_at: string | null;
  tracking_token: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  due_at: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  ai_estimate?: unknown;
  work_preference?: string | null;
  preliminary_accepted_at?: string | null;
};

export type ServiceIntakeAttachmentRow = {
  id: string;
  intake_id: string;
  kind: string;
  url: string;
  label: string | null;
  created_at: string;
};

export type ServiceIntakeCommentRow = {
  id: string;
  intake_id: string;
  author_name: string;
  author_side: string;
  body: string;
  created_at: string;
};

export type ProjectAgreementVersionRow = {
  id: string;
  agreement_id: string;
  version_number: number;
  title: string;
  body: string;
  category: string;
  proposed_cost_net: number | string | null;
  proposed_cost_gross: number | string | null;
  proposed_cost_vat_rate: number | null;
  cost_note: string | null;
  proposed_warranty_end_date: string | null;
  published_by_name: string;
  published_at: string;
};

export type ProjectAgreementApprovalRow = {
  id: string;
  version_id: string;
  role_id: string;
  status: string;
  responded_by_name: string | null;
  response_note: string | null;
  responded_at: string | null;
};

export type ProjectDashboardContentRow = {
  id: string;
  project_id: string;
  section: string;
  content_type: string;
  title: string;
  url: string;
  description: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ProjectDashboardContentInsert = {
  id?: string;
  project_id: string;
  section: string;
  content_type?: string;
  title?: string;
  url?: string;
  description?: string;
  position?: number;
  created_at?: string;
  updated_at?: string;
};

export type ProjectDashboardContentUpdate = Partial<ProjectDashboardContentInsert>;

export type SpecificationCatalogItemRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  position: number;
  is_active: boolean;
  internal_acceptance_items: unknown;
  created_at: string;
};

export type ProjectSpecificationItemRow = {
  id: string;
  project_id: string;
  catalog_item_id: string | null;
  title: string;
  category: string;
  description: string;
  notes: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ProjectTradeRow = {
  id: string;
  project_id: string;
  name: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  description: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ProjectMeetingNoteRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  meeting_at: string | null;
  author_name: string;
  status: string;
  published_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ProjectInvoiceRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  kind: string;
  title: string;
  vendor_name: string;
  invoice_number: string;
  amount_net: number | null;
  amount_gross: number | null;
  vat_rate: number | null;
  currency: string;
  issue_date: string | null;
  notes: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type ProjectDocumentRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  category: string;
  title: string;
  description: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  source: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type RequisitionRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  scope: string;
  status: string;
  project_id: string | null;
  client_id: string | null;
  requested_by_name: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string;
  created_at: string;
  updated_at: string;
};

export type ProjectAgreementFulfillmentRow = {
  id: string;
  project_id: string;
  agreement_id: string;
  status: string;
  note: string;
  reviewed_by_name: string;
  reviewed_by_side: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectSpecificationFulfillmentRow = {
  id: string;
  project_id: string;
  specification_item_id: string;
  status: string;
  note: string;
  reviewed_by_name: string;
  reviewed_by_side: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectStageSatisfactionRow = {
  id: string;
  project_id: string;
  stage_id: string;
  stage_title: string;
  score: number;
  best_aspect: string;
  worst_aspect: string;
  comment: string;
  author_name: string;
  author_side: string;
  created_at: string;
  updated_at: string;
};

export type ProjectSatisfactionOverviewRow = {
  project_id: string;
  expectation_score: number | null;
  reality_score: number | null;
  overall_note: string;
  reviewed_by_name: string;
  reviewed_by_side: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceInsert = {
  id?: string;
  project_id?: string | null;
  client_id?: string | null;
  contact_id?: string | null;
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
  optional_items?: unknown;
  client_offer_token?: string | null;
  client_offer_expires_at?: string | null;
  client_offer_status?: string | null;
  client_offer_message?: string | null;
  client_offer_responded_at?: string | null;
  client_offer_last_client_message?: string | null;
  client_offer_history?: unknown;
  client_offer_accepted_document?: unknown;
  ai_estimate?: unknown;
  intake_reference?: string | null;
  reviewed_at?: string | null;
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
  daily_hours_limit: number | null;
  weekly_hours_limit: number | null;
  base_location: string;
  cost_rate: number | null;
  is_available_for_planning: boolean;
  supervisor_id: string | null;
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
  daily_hours_limit?: number | null;
  weekly_hours_limit?: number | null;
  base_location?: string;
  cost_rate?: number | null;
  is_available_for_planning?: boolean;
  supervisor_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<Omit<ProfileInsert, "id">>;

export type LeaveRequestRow = {
  id: string;
  profile_id: string;
  leave_type_item_id: string | null;
  start_date: string;
  end_date: string;
  note: string;
  status: string;
  supervisor_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
  signature: unknown;
  generated_pdf_path: string | null;
  generated_pdf_name: string | null;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaveRequestInsert = {
  id?: string;
  profile_id: string;
  leave_type_item_id?: string | null;
  start_date: string;
  end_date: string;
  note?: string;
  status?: string;
  supervisor_id?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_note?: string;
  signature?: unknown;
  generated_pdf_path?: string | null;
  generated_pdf_name?: string | null;
  google_calendar_event_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type LeaveRequestUpdate = Partial<Omit<LeaveRequestInsert, "id" | "profile_id">>;

export type UserNavFavoriteRow = {
  user_id: string;
  href: string;
  created_at: string;
};

export type UserNavFavoriteInsert = {
  user_id: string;
  href: string;
  created_at?: string;
};

export type UserOperationalRoleRow = {
  id: string;
  user_id: string;
  role_item_id: string;
  created_at: string;
};

export type UserOperationalRoleInsert = {
  id?: string;
  user_id: string;
  role_item_id: string;
  created_at?: string;
};

export type UserCompetencyRow = {
  id: string;
  user_id: string;
  competency_item_id: string;
  level_item_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type UserCompetencyInsert = {
  id?: string;
  user_id: string;
  competency_item_id: string;
  level_item_id?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type UserCompetencyUpdate = Partial<Omit<UserCompetencyInsert, "id" | "user_id" | "competency_item_id">>;

export type UserTeamRow = {
  id: string;
  user_id: string;
  team_item_id: string;
  is_lead: boolean;
  created_at: string;
};

export type UserTeamInsert = {
  id?: string;
  user_id: string;
  team_item_id: string;
  is_lead?: boolean;
  created_at?: string;
};

export type UserCertificateRow = {
  id: string;
  user_id: string;
  name: string;
  issued_at: string | null;
  expires_at: string | null;
  file_url: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type UserCertificateInsert = {
  id?: string;
  user_id: string;
  name: string;
  issued_at?: string | null;
  expires_at?: string | null;
  file_url?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type UserCertificateUpdate = Partial<Omit<UserCertificateInsert, "id" | "user_id">>;

export type UserAbsenceRow = {
  id: string;
  user_id: string;
  absence_type_item_id: string | null;
  start_date: string;
  end_date: string;
  note: string;
  status: string;
  leave_request_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UserAbsenceInsert = {
  id?: string;
  user_id: string;
  absence_type_item_id?: string | null;
  start_date: string;
  end_date: string;
  note?: string;
  status?: string;
  leave_request_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserAbsenceUpdate = Partial<Omit<UserAbsenceInsert, "id" | "user_id">>;

export type ResourceDictionaryItemRow = {
  id: string;
  dictionary_key: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ResourceDictionaryItemInsert = {
  id?: string;
  dictionary_key: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  sort_order?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type ResourceDictionaryItemUpdate = Partial<Omit<ResourceDictionaryItemInsert, "id" | "dictionary_key">>;

export type ResourcePlanItemRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  process_stage_id: string | null;
  task_id: string | null;
  service_intake_request_id: string | null;
  work_type_item_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  planned_hours: number | null;
  actual_hours: number | null;
  assignee_id: string | null;
  team_item_id: string | null;
  status_item_id: string | null;
  risk_item_id: string | null;
  risk_note: string;
  labor_budget: number | null;
  material_budget: number | null;
  travel_budget: number | null;
  notes: string;
  accepted_risk: boolean;
  created_by: string | null;
  /** Elementy z tym samym linked_group_id to części jednego przydziału podzielonego w czasie. */
  linked_group_id: string | null;
  /** "Zależność pociętych" — patrz setLinkedGroupShiftEnabled w resource-plan-repository.ts. */
  shift_with_linked_group: boolean;
  created_at: string;
  updated_at: string;
};

export type ResourcePlanItemInsert = {
  id?: string;
  project_id?: string | null;
  client_id?: string | null;
  process_stage_id?: string | null;
  task_id?: string | null;
  service_intake_request_id?: string | null;
  work_type_item_id?: string | null;
  title?: string;
  start_at: string;
  end_at: string;
  planned_hours?: number | null;
  actual_hours?: number | null;
  assignee_id?: string | null;
  team_item_id?: string | null;
  status_item_id?: string | null;
  risk_item_id?: string | null;
  risk_note?: string;
  labor_budget?: number | null;
  material_budget?: number | null;
  travel_budget?: number | null;
  notes?: string;
  accepted_risk?: boolean;
  created_by?: string | null;
  linked_group_id?: string | null;
  shift_with_linked_group?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ResourcePlanItemUpdate = Partial<Omit<ResourcePlanItemInsert, "id">>;

export type ResourcePlanItemParticipantRow = {
  id: string;
  plan_item_id: string;
  user_id: string;
  role_item_id: string | null;
  is_lead: boolean;
  /** Procent godzin elementu przypisany tej osobie — patrz participant-contribution.ts. */
  involvement_percent: number;
  /** Własny zakres dat uczestnika (podzbiór zakresu elementu) — NULL = cały zakres elementu. */
  start_at: string | null;
  end_at: string | null;
  created_at: string;
};

export type ResourcePlanItemParticipantInsert = {
  id?: string;
  plan_item_id: string;
  user_id: string;
  role_item_id?: string | null;
  is_lead?: boolean;
  involvement_percent?: number;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string;
};

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
  description: string;
  position: number;
  min_people_count: number;
  optimal_people_count: number | null;
  estimated_duration_days: number | null;
  estimated_labor_hours: number | null;
  default_labor_budget: number | null;
  default_material_budget: number | null;
  default_risk_item_id: string | null;
  can_run_in_parallel: boolean;
  requires_leader: boolean;
  allows_trainee: boolean;
  created_at: string;
};

export type ProcessStageRoleRequirementRow = {
  id: string;
  stage_id: string;
  role_item_id: string;
  min_count: number;
  created_at: string;
};

export type ProcessStageCompetencyRequirementRow = {
  id: string;
  stage_id: string;
  competency_item_id: string;
  min_level_item_id: string | null;
  created_at: string;
};

export type ProcessStageDependencyRow = {
  id: string;
  stage_id: string;
  depends_on_stage_id: string;
  created_at: string;
};

export type ProcessMilestoneRow = {
  id: string;
  stage_id: string;
  title: string;
  position: number;
  planned_date: string | null;
  created_at: string;
};

export type ProcessElementRow = {
  id: string;
  kind: string;
  title: string;
  description: string;
  default_payload: unknown;
  is_internal_acceptance: boolean;
  created_at: string;
  updated_at: string;
};

export type ProcessItemRow = {
  id: string;
  milestone_id: string;
  element_id: string | null;
  kind: string;
  title: string;
  position: number;
  default_payload: unknown;
  is_internal_acceptance: boolean;
  created_at: string;
};

export type ProjectProcessRow = {
  id: string;
  project_id: string;
  template_id: string;
  template_snapshot?: unknown;
  completions: Record<string, unknown>;
  milestone_dates: Record<string, unknown>;
  active_stage_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectProcessItemRow = {
  id: string;
  project_id: string;
  template_item_id: string;
  kind: string;
  payload: unknown;
  status: string;
  is_internal_acceptance: boolean;
  internal_acceptance_state: unknown;
  assignee_id: string | null;
  assignee_name: string | null;
  signed_at: string | null;
  signed_by: string | null;
  signed_by_name: string | null;
  signature_note: string | null;
  blocks_next_stage: boolean;
  created_at: string;
  updated_at: string;
};

export type ProcessInternalAcceptanceConfigRow = {
  id: string;
  process_item_id: string;
  template_id: string;
  config: unknown;
  created_at: string;
  updated_at: string;
};

export type ProcessElementKindMetaRow = {
  kind: string;
  label: string;
  description: string;
  icon: string;
  supports_public_link: boolean;
  supports_internal_acceptance: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectProcessItemPublicAccessRow = {
  project_process_item_id: string;
  public_token: string;
  public_enabled: boolean;
  public_access_password_hash: string | null;
  public_access_username: string | null;
  public_author_name: string | null;
  created_at: string;
  updated_at: string;
};

export type InspectionProtocolTemplateRow = {
  id: string;
  client_id: string | null;
  system_code: string;
  name: string;
  file_path: string | null;
  file_url: string | null;
  fields_schema: unknown;
  created_at: string;
  updated_at: string;
};

export type InspectionClientPlanRow = {
  id: string;
  client_id: string;
  project_id: string | null;
  system_code: string;
  frequency: string;
  schedule_months: number[];
  protocol_template_id: string | null;
  work_scope: string;
  responsible_profile_id: string | null;
  responsible_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InspectionRow = {
  id: string;
  client_id: string;
  project_id: string | null;
  plan_id: string | null;
  system_code: string;
  system_label: string;
  status: string;
  title: string;
  work_scope: string;
  preliminary_date: string | null;
  confirmed_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  responsible_id: string | null;
  responsible_name: string | null;
  protocol_template_id: string | null;
  protocol_data: unknown;
  protocol_company_signed_at: string | null;
  protocol_client_signed_at: string | null;
  protocol_company_signer: string | null;
  protocol_client_signer: string | null;
  planning_reminder_sent_at: string | null;
  completed_at: string | null;
  billing_settled_at: string | null;
  billing_notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InspectionCommentRow = {
  id: string;
  inspection_id: string;
  author_profile_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

export type InspectionReactionRow = {
  id: string;
  inspection_id: string;
  emoji: string;
  author_profile_id: string | null;
  author_name: string;
  created_at: string;
};

export type GoalBoardKindRow = {
  code: string;
  label: string;
  description: string;
  icon: string;
  visibility: string;
  sort_order: number;
  is_active: boolean;
};

export type GoalBoardRow = {
  id: string;
  kind: string;
  name: string;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalMethodologyRow = {
  code: string;
  name: string;
  short_description: string;
  purpose: string;
  when_to_use: string;
  when_not_to_use: string;
  structure_md: string;
  example_md: string;
  best_practices_md: string;
  common_mistakes_md: string;
  field_schema: unknown;
  schema_version: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type GoalRow = {
  id: string;
  board_id: string;
  level: string;
  name: string;
  description: string;
  owner_id: string | null;
  priority: string;
  status: string;
  period_type: string;
  period_start: string;
  period_end: string;
  progress_percent: number;
  methodology_id: string | null;
  methodology_fields: unknown;
  is_recurring: boolean;
  recurrence_parent_id: string | null;
  recurrence_root_id: string | null;
  parent_goal_id: string | null;
  project_id: string | null;
  client_id: string | null;
  process_stage_id: string | null;
  process_milestone_id: string | null;
  settlement_status: string | null;
  settlement_what_worked: string | null;
  settlement_what_failed: string | null;
  settlement_conclusions: string | null;
  settled_at: string | null;
  settled_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalParticipantRow = {
  goal_id: string;
  profile_id: string;
  role: string;
};

export type GoalKpiRow = {
  id: string;
  goal_id: string;
  name: string;
  unit: string;
  target_value: number | null;
  current_value: number;
  source: string;
  position: number;
};

export type GoalUpdateRow = {
  id: string;
  goal_id: string;
  author_id: string | null;
  previous_progress: number | null;
  new_progress: number | null;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
};

export type GoalCommentRow = {
  id: string;
  goal_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

export type GoalReviewRow = {
  id: string;
  goal_id: string;
  scheduled_at: string;
  requires_action: boolean;
  completed_at: string | null;
  closed_by: string | null;
  outcome: string | null;
  progress_snapshot: number | null;
  note: string | null;
  created_at: string;
};

export type GoalInitiativeRow = {
  id: string;
  goal_id: string;
  kind: string;
  title: string;
  description: string;
  estimated_value: number | null;
  estimated_unit: string | null;
  status: string;
  converted_task_id: string | null;
  source: string;
  created_at: string;
};

export type GoalLinkRow = {
  id: string;
  goal_id: string;
  linked_type: string;
  linked_id: string;
  created_at: string;
};

export type GoalAiSuggestionRow = {
  id: string;
  goal_id: string | null;
  trigger: string;
  input_description: string;
  suggested_methodology_code: string | null;
  justification: string | null;
  alternatives: unknown;
  structure: unknown;
  vague_warning: string | null;
  accepted: boolean;
  created_by: string | null;
  created_at: string;
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
      contacts: {
        Row: ContactRow;
        Insert: ContactInsert;
        Update: ContactUpdate;
        Relationships: [];
      };
      dashboard_spaces: {
        Row: DashboardSpaceRow;
        Insert: DashboardSpaceInsert;
        Update: DashboardSpaceUpdate;
        Relationships: [];
      };
      project_client_agreements: {
        Row: ProjectClientAgreementRow;
        Insert: ProjectClientAgreementInsert;
        Update: ProjectClientAgreementUpdate;
        Relationships: [];
      };
      project_change_requests: {
        Row: ProjectChangeRequestRow;
        Insert: ProjectChangeRequestInsert;
        Update: ProjectChangeRequestUpdate;
        Relationships: [];
      };
      project_process_item_links: {
        Row: ProjectProcessItemLinkRow;
        Insert: ProjectProcessItemLinkInsert;
        Update: ProjectProcessItemLinkUpdate;
        Relationships: [];
      };
      knowledge_sources: {
        Row: KnowledgeSourceRow;
        Insert: KnowledgeSourceInsert;
        Update: KnowledgeSourceUpdate;
        Relationships: [];
      };
      knowledge_chunks: {
        Row: KnowledgeChunkRow;
        Insert: KnowledgeChunkInsert;
        Update: KnowledgeChunkUpdate;
        Relationships: [];
      };
      process_protocol_templates: {
        Row: ProcessProtocolTemplateRow;
        Insert: ProcessProtocolTemplateInsert;
        Update: ProcessProtocolTemplateUpdate;
        Relationships: [];
      };
      project_process_protocols: {
        Row: ProjectProcessProtocolRow;
        Insert: ProjectProcessProtocolInsert;
        Update: ProjectProcessProtocolUpdate;
        Relationships: [];
      };
      project_agreement_approver_roles: {
        Row: ProjectAgreementApproverRoleRow;
        Insert: Partial<ProjectAgreementApproverRoleRow> &
          Pick<ProjectAgreementApproverRoleRow, "agreement_id" | "label">;
        Update: Partial<ProjectAgreementApproverRoleRow>;
        Relationships: [];
      };
      project_agreement_comments: {
        Row: ProjectAgreementCommentRow;
        Insert: Partial<ProjectAgreementCommentRow> &
          Pick<ProjectAgreementCommentRow, "agreement_id" | "author_name" | "author_source" | "body">;
        Update: Partial<ProjectAgreementCommentRow>;
        Relationships: [];
      };
      project_agreement_attachments: {
        Row: ProjectAgreementAttachmentRow;
        Insert: Partial<ProjectAgreementAttachmentRow> &
          Pick<
            ProjectAgreementAttachmentRow,
            | "agreement_id"
            | "storage_path"
            | "file_name"
            | "mime_type"
            | "media_kind"
            | "size_bytes"
            | "uploaded_by_name"
            | "uploaded_by_source"
          >;
        Update: Partial<ProjectAgreementAttachmentRow>;
        Relationships: [];
      };
      project_system_credentials: {
        Row: ProjectSystemCredentialRow;
        Insert: Partial<ProjectSystemCredentialRow> &
          Pick<
            ProjectSystemCredentialRow,
            | "project_id"
            | "label"
            | "password_ciphertext"
            | "password_iv"
            | "password_tag"
            | "created_by_name"
          >;
        Update: Partial<ProjectSystemCredentialRow>;
        Relationships: [];
      };
      project_integrations: {
        Row: ProjectIntegrationRow;
        Insert: Partial<ProjectIntegrationRow> &
          Pick<
            ProjectIntegrationRow,
            "project_id" | "integration_type" | "name" | "connection_method" | "created_by_name"
          >;
        Update: Partial<ProjectIntegrationRow>;
        Relationships: [];
      };
      project_integration_secrets: {
        Row: ProjectIntegrationSecretRow;
        Insert: Partial<ProjectIntegrationSecretRow> &
          Pick<
            ProjectIntegrationSecretRow,
            "integration_id" | "password_ciphertext" | "password_iv" | "password_tag"
          >;
        Update: Partial<ProjectIntegrationSecretRow>;
        Relationships: [];
      };
      project_telemetry: {
        Row: ProjectTelemetryRow;
        Insert: Partial<ProjectTelemetryRow> &
          Pick<ProjectTelemetryRow, "project_id" | "integration_id" | "online_status">;
        Update: Partial<ProjectTelemetryRow>;
        Relationships: [];
      };
      project_integration_audit_log: {
        Row: ProjectIntegrationAuditLogRow;
        Insert: Partial<ProjectIntegrationAuditLogRow> &
          Pick<
            ProjectIntegrationAuditLogRow,
            "project_id" | "action" | "actor_name"
          >;
        Update: Partial<ProjectIntegrationAuditLogRow>;
        Relationships: [];
      };
      service_intake_requests: {
        Row: ServiceIntakeRequestRow;
        Insert: Partial<ServiceIntakeRequestRow> &
          Pick<
            ServiceIntakeRequestRow,
            | "reference_number"
            | "contact_email"
            | "contact_full_name"
            | "service_type_hint"
            | "priority"
            | "description"
          >;
        Update: Partial<ServiceIntakeRequestRow>;
        Relationships: [];
      };
      service_intake_attachments: {
        Row: ServiceIntakeAttachmentRow;
        Insert: Partial<ServiceIntakeAttachmentRow> &
          Pick<ServiceIntakeAttachmentRow, "intake_id" | "kind" | "url">;
        Update: Partial<ServiceIntakeAttachmentRow>;
        Relationships: [];
      };
      service_intake_comments: {
        Row: ServiceIntakeCommentRow;
        Insert: Partial<ServiceIntakeCommentRow> &
          Pick<ServiceIntakeCommentRow, "intake_id" | "author_name" | "author_side" | "body">;
        Update: Partial<ServiceIntakeCommentRow>;
        Relationships: [];
      };
      project_agreement_versions: {
        Row: ProjectAgreementVersionRow;
        Insert: Partial<ProjectAgreementVersionRow> &
          Pick<
            ProjectAgreementVersionRow,
            "agreement_id" | "version_number" | "title" | "published_by_name"
          >;
        Update: Partial<ProjectAgreementVersionRow>;
        Relationships: [];
      };
      project_agreement_approvals: {
        Row: ProjectAgreementApprovalRow;
        Insert: Partial<ProjectAgreementApprovalRow> &
          Pick<ProjectAgreementApprovalRow, "version_id" | "role_id">;
        Update: Partial<ProjectAgreementApprovalRow>;
        Relationships: [];
      };
      project_dashboard_content: {
        Row: ProjectDashboardContentRow;
        Insert: ProjectDashboardContentInsert;
        Update: ProjectDashboardContentUpdate;
        Relationships: [];
      };
      specification_catalog_items: {
        Row: SpecificationCatalogItemRow;
        Insert: Partial<SpecificationCatalogItemRow> & Pick<SpecificationCatalogItemRow, "name">;
        Update: Partial<SpecificationCatalogItemRow>;
        Relationships: [];
      };
      resource_dictionary_items: {
        Row: ResourceDictionaryItemRow;
        Insert: ResourceDictionaryItemInsert;
        Update: ResourceDictionaryItemUpdate;
        Relationships: [];
      };
      resource_plan_items: {
        Row: ResourcePlanItemRow;
        Insert: ResourcePlanItemInsert;
        Update: ResourcePlanItemUpdate;
        Relationships: [];
      };
      resource_plan_item_participants: {
        Row: ResourcePlanItemParticipantRow;
        Insert: ResourcePlanItemParticipantInsert;
        Update: Partial<ResourcePlanItemParticipantInsert>;
        Relationships: [];
      };
      user_operational_roles: {
        Row: UserOperationalRoleRow;
        Insert: UserOperationalRoleInsert;
        Update: Partial<UserOperationalRoleInsert>;
        Relationships: [];
      };
      user_competencies: {
        Row: UserCompetencyRow;
        Insert: UserCompetencyInsert;
        Update: UserCompetencyUpdate;
        Relationships: [];
      };
      user_teams: {
        Row: UserTeamRow;
        Insert: UserTeamInsert;
        Update: Partial<UserTeamInsert>;
        Relationships: [];
      };
      user_certificates: {
        Row: UserCertificateRow;
        Insert: UserCertificateInsert;
        Update: UserCertificateUpdate;
        Relationships: [];
      };
      user_absences: {
        Row: UserAbsenceRow;
        Insert: UserAbsenceInsert;
        Update: UserAbsenceUpdate;
        Relationships: [];
      };
      project_specification_items: {
        Row: ProjectSpecificationItemRow;
        Insert: Partial<ProjectSpecificationItemRow> &
          Pick<ProjectSpecificationItemRow, "project_id" | "title">;
        Update: Partial<ProjectSpecificationItemRow>;
        Relationships: [];
      };
      project_trades: {
        Row: ProjectTradeRow;
        Insert: Partial<ProjectTradeRow> & Pick<ProjectTradeRow, "project_id" | "name">;
        Update: Partial<ProjectTradeRow>;
        Relationships: [];
      };
      project_meeting_notes: {
        Row: ProjectMeetingNoteRow;
        Insert: Partial<ProjectMeetingNoteRow> & Pick<ProjectMeetingNoteRow, "project_id">;
        Update: Partial<ProjectMeetingNoteRow>;
        Relationships: [];
      };
      project_invoices: {
        Row: ProjectInvoiceRow;
        Insert: Partial<ProjectInvoiceRow> & Pick<ProjectInvoiceRow, "title">;
        Update: Partial<ProjectInvoiceRow>;
        Relationships: [];
      };
      project_documents: {
        Row: ProjectDocumentRow;
        Insert: Partial<ProjectDocumentRow> & Pick<ProjectDocumentRow, "title">;
        Update: Partial<ProjectDocumentRow>;
        Relationships: [];
      };
      requisitions: {
        Row: RequisitionRow;
        Insert: Partial<RequisitionRow> & Pick<RequisitionRow, "title">;
        Update: Partial<RequisitionRow>;
        Relationships: [];
      };
      sms_messages: {
        Row: {
          id: string;
          recipient_phone: string;
          message: string;
          provider: string;
          provider_message_id: string | null;
          status: string;
          error_message: string | null;
          metadata: Record<string, unknown>;
          sent_at: string | null;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_phone: string;
          message: string;
          provider?: string;
          provider_message_id?: string | null;
          status?: string;
          error_message?: string | null;
          metadata?: Record<string, unknown>;
          sent_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          recipient_phone: string;
          message: string;
          provider: string;
          provider_message_id: string | null;
          status: string;
          error_message: string | null;
          metadata: Record<string, unknown>;
          sent_at: string | null;
          delivered_at: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      project_agreement_fulfillments: {
        Row: ProjectAgreementFulfillmentRow;
        Insert: Partial<ProjectAgreementFulfillmentRow> &
          Pick<ProjectAgreementFulfillmentRow, "project_id" | "agreement_id">;
        Update: Partial<ProjectAgreementFulfillmentRow>;
        Relationships: [];
      };
      project_specification_fulfillments: {
        Row: ProjectSpecificationFulfillmentRow;
        Insert: Partial<ProjectSpecificationFulfillmentRow> &
          Pick<ProjectSpecificationFulfillmentRow, "project_id" | "specification_item_id">;
        Update: Partial<ProjectSpecificationFulfillmentRow>;
        Relationships: [];
      };
      project_stage_satisfactions: {
        Row: ProjectStageSatisfactionRow;
        Insert: Partial<ProjectStageSatisfactionRow> &
          Pick<ProjectStageSatisfactionRow, "project_id" | "stage_id">;
        Update: Partial<ProjectStageSatisfactionRow>;
        Relationships: [];
      };
      project_satisfaction_overviews: {
        Row: ProjectSatisfactionOverviewRow;
        Insert: Partial<ProjectSatisfactionOverviewRow> & Pick<ProjectSatisfactionOverviewRow, "project_id">;
        Update: Partial<ProjectSatisfactionOverviewRow>;
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
      leave_requests: {
        Row: LeaveRequestRow;
        Insert: LeaveRequestInsert;
        Update: LeaveRequestUpdate;
        Relationships: [];
      };
      user_nav_favorites: {
        Row: UserNavFavoriteRow;
        Insert: UserNavFavoriteInsert;
        Update: Partial<UserNavFavoriteInsert>;
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
      process_stage_role_requirements: {
        Row: ProcessStageRoleRequirementRow;
        Insert: Partial<ProcessStageRoleRequirementRow> &
          Pick<ProcessStageRoleRequirementRow, "stage_id" | "role_item_id">;
        Update: Partial<ProcessStageRoleRequirementRow>;
        Relationships: [];
      };
      process_stage_competency_requirements: {
        Row: ProcessStageCompetencyRequirementRow;
        Insert: Partial<ProcessStageCompetencyRequirementRow> &
          Pick<ProcessStageCompetencyRequirementRow, "stage_id" | "competency_item_id">;
        Update: Partial<ProcessStageCompetencyRequirementRow>;
        Relationships: [];
      };
      process_stage_dependencies: {
        Row: ProcessStageDependencyRow;
        Insert: Partial<ProcessStageDependencyRow> &
          Pick<ProcessStageDependencyRow, "stage_id" | "depends_on_stage_id">;
        Update: Partial<ProcessStageDependencyRow>;
        Relationships: [];
      };
      process_elements: {
        Row: ProcessElementRow;
        Insert: Partial<ProcessElementRow> & Pick<ProcessElementRow, "kind" | "title">;
        Update: Partial<ProcessElementRow>;
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
      project_process_items: {
        Row: ProjectProcessItemRow;
        Insert: Partial<ProjectProcessItemRow> &
          Pick<ProjectProcessItemRow, "project_id" | "template_item_id" | "kind">;
        Update: Partial<ProjectProcessItemRow>;
        Relationships: [];
      };
      process_internal_acceptance_configs: {
        Row: ProcessInternalAcceptanceConfigRow;
        Insert: Partial<ProcessInternalAcceptanceConfigRow> &
          Pick<ProcessInternalAcceptanceConfigRow, "process_item_id" | "template_id" | "config">;
        Update: Partial<ProcessInternalAcceptanceConfigRow>;
        Relationships: [];
      };
      process_element_kind_meta: {
        Row: ProcessElementKindMetaRow;
        Insert: Partial<ProcessElementKindMetaRow> & Pick<ProcessElementKindMetaRow, "kind" | "label">;
        Update: Partial<ProcessElementKindMetaRow>;
        Relationships: [];
      };
      project_process_item_public_access: {
        Row: ProjectProcessItemPublicAccessRow;
        Insert: Partial<ProjectProcessItemPublicAccessRow> &
          Pick<ProjectProcessItemPublicAccessRow, "project_process_item_id">;
        Update: Partial<ProjectProcessItemPublicAccessRow>;
        Relationships: [];
      };
      process_kanban_boards: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      process_kanban_columns: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      process_kanban_tasks: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      process_kanban_comments: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      process_kanban_task_events: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      process_kanban_task_attachments: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      user_notifications: {
        Row: {
          id: string;
          profile_id: string;
          kind: string;
          title: string;
          body: string;
          link_url: string | null;
          source_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          kind: string;
          title: string;
          body?: string;
          link_url?: string | null;
          source_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          kind?: string;
          title?: string;
          body?: string;
          link_url?: string | null;
          source_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      process_kanban_task_reactions: {
        Row: {
          id: string;
          task_id: string;
          emoji: string;
          author_name: string;
          author_side: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          emoji: string;
          author_name: string;
          author_side: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          emoji?: string;
          author_name?: string;
          author_side?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      inspection_protocol_templates: {
        Row: InspectionProtocolTemplateRow;
        Insert: Partial<InspectionProtocolTemplateRow> &
          Pick<InspectionProtocolTemplateRow, "system_code" | "name">;
        Update: Partial<InspectionProtocolTemplateRow>;
        Relationships: [];
      };
      inspection_client_plans: {
        Row: InspectionClientPlanRow;
        Insert: Partial<InspectionClientPlanRow> &
          Pick<InspectionClientPlanRow, "client_id" | "system_code" | "frequency" | "schedule_months">;
        Update: Partial<InspectionClientPlanRow>;
        Relationships: [];
      };
      inspections: {
        Row: InspectionRow;
        Insert: Partial<InspectionRow> &
          Pick<InspectionRow, "client_id" | "system_code" | "system_label" | "status" | "title">;
        Update: Partial<InspectionRow>;
        Relationships: [];
      };
      inspection_comments: {
        Row: InspectionCommentRow;
        Insert: Partial<InspectionCommentRow> &
          Pick<InspectionCommentRow, "inspection_id" | "author_name" | "body">;
        Update: Partial<InspectionCommentRow>;
        Relationships: [];
      };
      inspection_reactions: {
        Row: InspectionReactionRow;
        Insert: Partial<InspectionReactionRow> &
          Pick<InspectionReactionRow, "inspection_id" | "emoji" | "author_name">;
        Update: Partial<InspectionReactionRow>;
        Relationships: [];
      };
      goal_board_kinds: {
        Row: GoalBoardKindRow;
        Insert: Partial<GoalBoardKindRow> & Pick<GoalBoardKindRow, "code" | "label">;
        Update: Partial<GoalBoardKindRow>;
        Relationships: [];
      };
      goal_boards: {
        Row: GoalBoardRow;
        Insert: Partial<GoalBoardRow> & Pick<GoalBoardRow, "kind" | "name">;
        Update: Partial<GoalBoardRow>;
        Relationships: [];
      };
      goal_methodologies: {
        Row: GoalMethodologyRow;
        Insert: Partial<GoalMethodologyRow> & Pick<GoalMethodologyRow, "code" | "name">;
        Update: Partial<GoalMethodologyRow>;
        Relationships: [];
      };
      goals: {
        Row: GoalRow;
        Insert: Partial<GoalRow> &
          Pick<GoalRow, "board_id" | "level" | "name" | "period_type" | "period_start" | "period_end">;
        Update: Partial<GoalRow>;
        Relationships: [];
      };
      goal_participants: {
        Row: GoalParticipantRow;
        Insert: Partial<GoalParticipantRow> & Pick<GoalParticipantRow, "goal_id" | "profile_id">;
        Update: Partial<GoalParticipantRow>;
        Relationships: [];
      };
      goal_kpis: {
        Row: GoalKpiRow;
        Insert: Partial<GoalKpiRow> & Pick<GoalKpiRow, "goal_id" | "name">;
        Update: Partial<GoalKpiRow>;
        Relationships: [];
      };
      goal_updates: {
        Row: GoalUpdateRow;
        Insert: Partial<GoalUpdateRow> & Pick<GoalUpdateRow, "goal_id">;
        Update: Partial<GoalUpdateRow>;
        Relationships: [];
      };
      goal_comments: {
        Row: GoalCommentRow;
        Insert: Partial<GoalCommentRow> & Pick<GoalCommentRow, "goal_id" | "author_name" | "body">;
        Update: Partial<GoalCommentRow>;
        Relationships: [];
      };
      goal_reviews: {
        Row: GoalReviewRow;
        Insert: Partial<GoalReviewRow> & Pick<GoalReviewRow, "goal_id" | "scheduled_at">;
        Update: Partial<GoalReviewRow>;
        Relationships: [];
      };
      goal_initiatives: {
        Row: GoalInitiativeRow;
        Insert: Partial<GoalInitiativeRow> & Pick<GoalInitiativeRow, "goal_id" | "kind" | "title">;
        Update: Partial<GoalInitiativeRow>;
        Relationships: [];
      };
      goal_links: {
        Row: GoalLinkRow;
        Insert: Partial<GoalLinkRow> & Pick<GoalLinkRow, "goal_id" | "linked_type" | "linked_id">;
        Update: Partial<GoalLinkRow>;
        Relationships: [];
      };
      goal_ai_suggestions: {
        Row: GoalAiSuggestionRow;
        Insert: Partial<GoalAiSuggestionRow> & Pick<GoalAiSuggestionRow, "input_description">;
        Update: Partial<GoalAiSuggestionRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
