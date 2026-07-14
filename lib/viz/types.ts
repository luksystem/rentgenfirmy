export const VIZ_DASHBOARD_STATUSES = ["draft", "active", "archived"] as const;
export type VizDashboardStatus = (typeof VIZ_DASHBOARD_STATUSES)[number];

export const VIZ_DASHBOARD_STATUS_LABELS: Record<VizDashboardStatus, string> = {
  draft: "Szkic",
  active: "Aktywny",
  archived: "Zarchiwizowany",
};

export const VIZ_SYSTEM_INTEGRATION_STATUSES = [
  "integrated",
  "partially_integrated",
  "planned",
  "possible",
  "none",
  "not_applicable",
] as const;
export type VizSystemIntegrationStatus = (typeof VIZ_SYSTEM_INTEGRATION_STATUSES)[number];

export const VIZ_SYSTEM_INTEGRATION_STATUS_LABELS: Record<VizSystemIntegrationStatus, string> = {
  integrated: "Zintegrowany",
  partially_integrated: "Częściowo zintegrowany",
  planned: "Planowany",
  possible: "Możliwy do integracji",
  none: "Brak",
  not_applicable: "Nie dotyczy",
};

export const VIZ_SERVICE_CONTRACT_STATUSES = [
  "none",
  "on_demand",
  "monthly_hours",
  "sla",
  "mixed",
] as const;
export type VizServiceContractStatus = (typeof VIZ_SERVICE_CONTRACT_STATUSES)[number];

export const VIZ_SERVICE_CONTRACT_STATUS_LABELS: Record<VizServiceContractStatus, string> = {
  none: "Brak umowy",
  on_demand: "Serwis na żądanie",
  monthly_hours: "Pakiet godzin miesięcznie",
  sla: "SLA",
  mixed: "Model mieszany",
};

export const VIZ_ACCESS_ROLES = [
  "admin",
  "operator",
  "service",
  "client_admin",
  "client_readonly",
] as const;
export type VizAccessRole = (typeof VIZ_ACCESS_ROLES)[number];

export const VIZ_ACCESS_ROLE_LABELS: Record<VizAccessRole, string> = {
  admin: "Administrator dashboardu",
  operator: "Operator Luksystem",
  service: "Serwis Luksystem",
  client_admin: "Administrator klienta",
  client_readonly: "Użytkownik klienta (odczyt)",
};

export const VIZ_DATA_QUALITIES = [
  "valid",
  "stale",
  "no_communication",
  "read_error",
  "unconfigured",
] as const;
export type VizDataQuality = (typeof VIZ_DATA_QUALITIES)[number];

export const VIZ_DATA_QUALITY_LABELS: Record<VizDataQuality, string> = {
  valid: "Poprawne",
  stale: "Nieaktualne",
  no_communication: "Brak komunikacji",
  read_error: "Błąd odczytu",
  unconfigured: "Nieskonfigurowane",
};

/** Granularne uprawnienia dashboardu BMS */
export type VizDashboardPermissions = {
  viewDashboard?: boolean;
  configure?: boolean;
  viewAlarms?: boolean;
  acknowledgeAlarms?: boolean;
  viewEnergy?: boolean;
  uploadInvoices?: boolean;
  analyzeInvoices?: boolean;
  viewContract?: boolean;
  viewClientRates?: boolean;
  controlSetpoint?: boolean;
  calculateTravel?: boolean;
};

export const DEFAULT_VIZ_PERMISSIONS_BY_ROLE: Record<VizAccessRole, VizDashboardPermissions> = {
  admin: {
    viewDashboard: true,
    configure: true,
    viewAlarms: true,
    acknowledgeAlarms: true,
    viewEnergy: true,
    uploadInvoices: true,
    analyzeInvoices: true,
    viewContract: true,
    viewClientRates: true,
    controlSetpoint: true,
    calculateTravel: true,
  },
  operator: {
    viewDashboard: true,
    configure: true,
    viewAlarms: true,
    acknowledgeAlarms: true,
    viewEnergy: true,
    uploadInvoices: true,
    analyzeInvoices: true,
    viewContract: true,
    viewClientRates: false,
    controlSetpoint: true,
    calculateTravel: true,
  },
  service: {
    viewDashboard: true,
    configure: false,
    viewAlarms: true,
    acknowledgeAlarms: true,
    viewEnergy: true,
    uploadInvoices: false,
    analyzeInvoices: false,
    viewContract: true,
    viewClientRates: false,
    controlSetpoint: false,
    calculateTravel: true,
  },
  client_admin: {
    viewDashboard: true,
    configure: false,
    viewAlarms: true,
    acknowledgeAlarms: false,
    viewEnergy: true,
    uploadInvoices: true,
    analyzeInvoices: false,
    viewContract: true,
    viewClientRates: false,
    controlSetpoint: false,
    calculateTravel: false,
  },
  client_readonly: {
    viewDashboard: true,
    configure: false,
    viewAlarms: true,
    acknowledgeAlarms: false,
    viewEnergy: true,
    uploadInvoices: false,
    analyzeInvoices: false,
    viewContract: false,
    viewClientRates: false,
    controlSetpoint: false,
    calculateTravel: false,
  },
};

export type VizDashboardTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  defaultLayoutJson: Record<string, unknown>;
  isSystem: boolean;
};

export type VizDashboard = {
  id: string;
  name: string;
  description: string | null;
  templateSlug: string | null;
  templateName: string | null;
  clientId: string | null;
  clientName: string | null;
  status: VizDashboardStatus;
  layoutJson: Record<string, unknown>;
  settingsJson: Record<string, unknown>;
  projectCount: number;
  createdByName: string;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VizDashboardProject = {
  id: string;
  dashboardId: string;
  projectId: string;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  clientAddress: string | null;
  displayName: string | null;
  bmsCommissionedAt: string | null;
  isActiveInDashboard: boolean;
  sortOrder: number;
  latOverride: number | null;
  lngOverride: number | null;
  serviceContractStatus: VizServiceContractStatus;
  metadataJson: Record<string, unknown>;
};

export type VizIntegratedSystem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type VizProjectSystemStatus = {
  id: string;
  dashboardId: string;
  projectId: string;
  systemId: string;
  systemCode: string;
  systemName: string;
  status: VizSystemIntegrationStatus;
  integrationScope: string | null;
  notes: string | null;
  updatedAt: string;
};

export type VizVariableRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  defaultUnit: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type VizVariableMapping = {
  id: string;
  dashboardId: string;
  projectId: string;
  integrationId: string | null;
  integrationVariableId: string | null;
  integrationName: string | null;
  variableName: string | null;
  variableSourceKey: string | null;
  sourceKey: string | null;
  roleCode: string;
  roleName: string | null;
  displayName: string | null;
  unit: string | null;
  displayFormat: string | null;
  decimalPlaces: number;
  multiplier: number;
  offsetValue: number;
  textValueMap: Record<string, string>;
  inverted: boolean;
  writable: boolean;
  minValue: number | null;
  maxValue: number | null;
  dataQuality: VizDataQuality;
  collectionIntervalSeconds: number | null;
};

export type VizDashboardAccess = {
  id: string;
  dashboardId: string;
  profileId: string;
  profileName: string | null;
  accessRole: VizAccessRole;
  permissionsJson: VizDashboardPermissions;
};

export type VizDashboardInput = {
  name: string;
  description?: string | null;
  templateSlug?: string | null;
  clientId?: string | null;
  status?: VizDashboardStatus;
  layoutJson?: Record<string, unknown>;
  settingsJson?: Record<string, unknown>;
};

export type VizDashboardProjectInput = {
  projectId: string;
  displayName?: string | null;
  bmsCommissionedAt?: string | null;
  isActiveInDashboard?: boolean;
  sortOrder?: number;
  latOverride?: number | null;
  lngOverride?: number | null;
  serviceContractStatus?: VizServiceContractStatus;
  metadataJson?: Record<string, unknown>;
};

export type VizVariableMappingInput = {
  projectId: string;
  integrationId?: string | null;
  integrationVariableId?: string | null;
  sourceKey?: string | null;
  roleCode: string;
  displayName?: string | null;
  unit?: string | null;
  displayFormat?: string | null;
  decimalPlaces?: number;
  multiplier?: number;
  offsetValue?: number;
  textValueMap?: Record<string, string>;
  inverted?: boolean;
  writable?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  collectionIntervalSeconds?: number | null;
};

export type VizProjectSystemStatusInput = {
  projectId: string;
  systemId: string;
  status: VizSystemIntegrationStatus;
  integrationScope?: string | null;
  notes?: string | null;
};

export type VizDashboardAccessInput = {
  profileId: string;
  accessRole: VizAccessRole;
  permissionsJson?: VizDashboardPermissions;
};
