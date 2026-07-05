export const INSPECTION_STATUSES = [
  "preliminary",
  "planned",
  "completed",
  "billing",
  "settled",
] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const INSPECTION_KANBAN_COLUMNS: InspectionStatus[] = [
  "preliminary",
  "planned",
  "completed",
  "billing",
  "settled",
];

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  preliminary: "Wstępnie zaplanowane",
  planned: "Zaplanowane",
  completed: "Zrealizowane",
  billing: "Do rozliczenia",
  settled: "Rozliczone",
};

export const INSPECTION_FREQUENCIES = ["monthly", "quarterly", "semi_annual", "annual"] as const;
export type InspectionFrequency = (typeof INSPECTION_FREQUENCIES)[number];

export const INSPECTION_FREQUENCY_LABELS: Record<InspectionFrequency, string> = {
  monthly: "Co miesiąc",
  quarterly: "Co kwartał",
  semi_annual: "Co pół roku",
  annual: "Co rok",
};

export const INSPECTION_REACTION_EMOJIS = ["👍", "❤️", "✅"] as const;
export type InspectionReactionEmoji = (typeof INSPECTION_REACTION_EMOJIS)[number];

export type InspectionProtocolData = {
  notes?: string;
  additionalWork?: string;
  recommendations?: string;
};

export function parseInspectionProtocolData(
  data: Record<string, unknown> | null | undefined,
): InspectionProtocolData {
  if (!data || typeof data !== "object") {
    return {};
  }
  return {
    notes: typeof data.notes === "string" ? data.notes : "",
    additionalWork: typeof data.additionalWork === "string" ? data.additionalWork : "",
    recommendations: typeof data.recommendations === "string" ? data.recommendations : "",
  };
}

export function buildInspectionProtocolData(
  base: Record<string, unknown> | null | undefined,
  fields: InspectionProtocolData,
): Record<string, unknown> {
  return {
    ...(base && typeof base === "object" ? base : {}),
    notes: fields.notes ?? "",
    additionalWork: fields.additionalWork ?? "",
    recommendations: fields.recommendations ?? "",
  };
}

export type InspectionSystemDefinition = {
  code: string;
  label: string;
  active: boolean;
};

export type InspectionGlobalSettings = {
  systems: InspectionSystemDefinition[];
  billingResponsibleProfileId: string | null;
  billingResponsibleName: string | null;
};

export type InspectionProtocolTemplate = {
  id: string;
  clientId: string | null;
  systemCode: string;
  name: string;
  filePath: string | null;
  fileUrl: string | null;
  fieldsSchema: unknown[];
  createdAt: string;
  updatedAt: string;
};

export type InspectionClientPlan = {
  id: string;
  clientId: string;
  projectId: string | null;
  systemCode: string;
  frequency: InspectionFrequency;
  scheduleMonths: number[];
  protocolTemplateId: string | null;
  workScope: string;
  responsibleProfileId: string | null;
  responsibleName: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InspectionComment = {
  id: string;
  inspectionId: string;
  authorProfileId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
};

export type InspectionReaction = {
  id: string;
  inspectionId: string;
  emoji: InspectionReactionEmoji;
  authorProfileId: string | null;
  authorName: string;
  createdAt: string;
};

export type InspectionRecord = {
  id: string;
  clientId: string;
  projectId: string | null;
  planId: string | null;
  systemCode: string;
  systemLabel: string;
  status: InspectionStatus;
  title: string;
  workScope: string;
  preliminaryDate: string | null;
  confirmedDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  protocolTemplateId: string | null;
  protocolData: Record<string, unknown>;
  protocolCompanySignedAt: string | null;
  protocolClientSignedAt: string | null;
  protocolCompanySigner: string | null;
  protocolClientSigner: string | null;
  planningReminderSentAt: string | null;
  completedAt: string | null;
  billingSettledAt: string | null;
  billingNotificationSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string | null;
  projectName?: string | null;
  comments?: InspectionComment[];
  reactions?: InspectionReaction[];
};

export type InspectionPlanInput = {
  clientId: string;
  projectId?: string | null;
  responsibleProfileId?: string | null;
  responsibleName?: string | null;
  systems: Array<{
    systemCode: string;
    frequency: InspectionFrequency;
    scheduleMonths: number[];
    protocolTemplateId?: string | null;
    workScope: string;
  }>;
  horizonMonths?: number;
};
