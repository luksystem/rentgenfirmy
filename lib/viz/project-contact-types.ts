export const PROJECT_CONTACT_ROLES = [
  "store_manager",
  "facility_manager",
  "technical_contact",
  "security",
  "service_coordinator",
  "other",
] as const;

export type ProjectContactRole = (typeof PROJECT_CONTACT_ROLES)[number];

export const PROJECT_CONTACT_ROLE_LABELS: Record<ProjectContactRole, string> = {
  store_manager: "Kierownik sklepu",
  facility_manager: "Facility manager",
  technical_contact: "Kontakt techniczny BMS",
  security: "Ochrona / recepcja",
  service_coordinator: "Koordynator serwisu",
  other: "Inny",
};

export type ProjectContact = {
  id: string;
  projectId: string;
  contactId: string | null;
  roleCode: ProjectContactRole;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type ProjectContactInput = {
  contactId?: string | null;
  roleCode: ProjectContactRole;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
};

export const VIZ_ALARM_CONDITIONS = ["gt", "gte", "lt", "lte", "eq", "neq"] as const;
export type VizAlarmCondition = (typeof VIZ_ALARM_CONDITIONS)[number];

export const VIZ_ALARM_SEVERITIES = ["warning", "alarm"] as const;
export type VizAlarmSeverity = (typeof VIZ_ALARM_SEVERITIES)[number];

export const VIZ_ALARM_CONDITION_LABELS: Record<VizAlarmCondition, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  neq: "≠",
};

export type VizAlarmRule = {
  id: string;
  dashboardId: string;
  projectId: string | null;
  roleCode: string;
  condition: VizAlarmCondition;
  thresholdNumeric: number;
  severity: VizAlarmSeverity;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type VizAlarmRuleInput = {
  projectId?: string | null;
  roleCode: string;
  condition?: VizAlarmCondition;
  thresholdNumeric: number;
  severity?: VizAlarmSeverity;
  name: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type VizAlarmAcknowledgement = {
  id: string;
  dashboardId: string;
  projectId: string;
  ruleId: string;
  acknowledgedBy: string;
  acknowledgedAt: string;
  note: string | null;
};

export type VizAlarmEvaluation = {
  ruleId: string;
  ruleName: string;
  severity: VizAlarmSeverity;
  roleCode: string;
  numericValue: number;
  thresholdNumeric: number;
  condition: VizAlarmCondition;
  acknowledgement?: VizAlarmAcknowledgement | null;
};
