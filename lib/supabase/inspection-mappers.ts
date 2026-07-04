import type {
  InspectionClientPlan,
  InspectionComment,
  InspectionProtocolTemplate,
  InspectionReaction,
  InspectionRecord,
  InspectionReactionEmoji,
  InspectionFrequency,
  InspectionStatus,
} from "@/lib/inspections/types";

type InspectionRow = {
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

export function rowToInspection(
  row: InspectionRow,
  meta?: { clientName?: string | null; projectName?: string | null },
): InspectionRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    projectId: row.project_id,
    planId: row.plan_id,
    systemCode: row.system_code,
    systemLabel: row.system_label,
    status: row.status as InspectionStatus,
    title: row.title,
    workScope: row.work_scope,
    preliminaryDate: row.preliminary_date,
    confirmedDate: row.confirmed_date,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    responsibleId: row.responsible_id,
    responsibleName: row.responsible_name,
    protocolTemplateId: row.protocol_template_id,
    protocolData:
      row.protocol_data && typeof row.protocol_data === "object" && !Array.isArray(row.protocol_data)
        ? (row.protocol_data as Record<string, unknown>)
        : {},
    protocolCompanySignedAt: row.protocol_company_signed_at,
    protocolClientSignedAt: row.protocol_client_signed_at,
    protocolCompanySigner: row.protocol_company_signer,
    protocolClientSigner: row.protocol_client_signer,
    planningReminderSentAt: row.planning_reminder_sent_at,
    completedAt: row.completed_at,
    billingSettledAt: row.billing_settled_at,
    billingNotificationSentAt: row.billing_notification_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientName: meta?.clientName ?? null,
    projectName: meta?.projectName ?? null,
  };
}

export function rowToInspectionComment(row: {
  id: string;
  inspection_id: string;
  author_profile_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
}): InspectionComment {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    authorProfileId: row.author_profile_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function rowToInspectionReaction(row: {
  id: string;
  inspection_id: string;
  emoji: string;
  author_profile_id: string | null;
  author_name: string;
  created_at: string;
}): InspectionReaction {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    emoji: row.emoji as InspectionReactionEmoji,
    authorProfileId: row.author_profile_id,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

export function rowToInspectionProtocolTemplate(row: {
  id: string;
  client_id: string | null;
  system_code: string;
  name: string;
  file_path: string | null;
  file_url: string | null;
  fields_schema: unknown;
  created_at: string;
  updated_at: string;
}): InspectionProtocolTemplate {
  return {
    id: row.id,
    clientId: row.client_id,
    systemCode: row.system_code,
    name: row.name,
    filePath: row.file_path,
    fileUrl: row.file_url,
    fieldsSchema: Array.isArray(row.fields_schema) ? row.fields_schema : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToInspectionClientPlan(row: {
  id: string;
  client_id: string;
  project_id: string | null;
  system_code: string;
  frequency: string;
  schedule_months: number[] | null;
  protocol_template_id: string | null;
  work_scope: string;
  responsible_profile_id: string | null;
  responsible_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}): InspectionClientPlan {
  return {
    id: row.id,
    clientId: row.client_id,
    projectId: row.project_id,
    systemCode: row.system_code,
    frequency: row.frequency as InspectionFrequency,
    scheduleMonths: row.schedule_months ?? [],
    protocolTemplateId: row.protocol_template_id,
    workScope: row.work_scope,
    responsibleProfileId: row.responsible_profile_id,
    responsibleName: row.responsible_name,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
