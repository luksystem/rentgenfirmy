import type {
  VizAccessRole,
  VizDashboard,
  VizDashboardAccess,
  VizDashboardProject,
  VizDashboardStatus,
  VizDashboardTemplate,
  VizDataQuality,
  VizIntegratedSystem,
  VizProjectSystemStatus,
  VizServiceContractStatus,
  VizSystemIntegrationStatus,
  VizVariableMapping,
  VizVariableRole,
  VizDashboardPermissions,
} from "@/lib/viz/types";

type VizDashboardRow = {
  id: string;
  name: string;
  description: string | null;
  template_slug: string | null;
  client_id: string | null;
  status: string;
  layout_json: unknown;
  settings_json: unknown;
  created_by_name: string;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type VizDashboardProjectRow = {
  id: string;
  dashboard_id: string;
  project_id: string;
  display_name: string | null;
  bms_commissioned_at: string | null;
  is_active_in_dashboard: boolean;
  sort_order: number;
  lat_override: number | null;
  lng_override: number | null;
  service_contract_status: string;
  metadata_json: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asPermissions(value: unknown): VizDashboardPermissions {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as VizDashboardPermissions;
  }
  return {};
}

function asTextMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string") {
      result[key] = val;
    }
  }
  return result;
}

export function rowToVizDashboardTemplate(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  default_layout_json: unknown;
  is_system: boolean;
}): VizDashboardTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    defaultLayoutJson: asRecord(row.default_layout_json),
    isSystem: row.is_system,
  };
}

export function rowToVizDashboard(
  row: VizDashboardRow,
  meta?: {
    templateName?: string | null;
    clientName?: string | null;
    projectCount?: number;
  },
): VizDashboard {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    templateSlug: row.template_slug,
    templateName: meta?.templateName ?? null,
    clientId: row.client_id,
    clientName: meta?.clientName ?? null,
    status: row.status as VizDashboardStatus,
    layoutJson: asRecord(row.layout_json),
    settingsJson: asRecord(row.settings_json),
    projectCount: meta?.projectCount ?? 0,
    createdByName: row.created_by_name,
    updatedByName: row.updated_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToVizDashboardProject(
  row: VizDashboardProjectRow,
  meta?: {
    projectName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    clientAddress?: string | null;
  },
): VizDashboardProject {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    projectId: row.project_id,
    projectName: meta?.projectName ?? null,
    clientId: meta?.clientId ?? null,
    clientName: meta?.clientName ?? null,
    clientAddress: meta?.clientAddress ?? null,
    displayName: row.display_name,
    bmsCommissionedAt: row.bms_commissioned_at,
    isActiveInDashboard: row.is_active_in_dashboard,
    sortOrder: row.sort_order,
    latOverride: row.lat_override !== null ? Number(row.lat_override) : null,
    lngOverride: row.lng_override !== null ? Number(row.lng_override) : null,
    serviceContractStatus: row.service_contract_status as VizServiceContractStatus,
    metadataJson: asRecord(row.metadata_json),
  };
}

export function rowToVizIntegratedSystem(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}): VizIntegratedSystem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function rowToVizVariableRole(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  default_unit: string | null;
  sort_order: number;
  is_active: boolean;
}): VizVariableRole {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    defaultUnit: row.default_unit,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function rowToVizVariableMapping(
  row: {
    id: string;
    dashboard_id: string;
    project_id: string;
    integration_id: string | null;
    integration_variable_id: string | null;
    source_key: string | null;
    role_code: string;
    display_name: string | null;
    unit: string | null;
    display_format: string | null;
    decimal_places: number;
    multiplier: number;
    offset_value: number;
    text_value_map: unknown;
    inverted: boolean;
    writable: boolean;
    min_value: number | null;
    max_value: number | null;
    data_quality: string;
    collection_interval_seconds: number | null;
  },
  meta?: {
    roleName?: string | null;
    integrationName?: string | null;
    variableName?: string | null;
    variableSourceKey?: string | null;
  },
): VizVariableMapping {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    projectId: row.project_id,
    integrationId: row.integration_id,
    integrationVariableId: row.integration_variable_id,
    integrationName: meta?.integrationName ?? null,
    variableName: meta?.variableName ?? null,
    variableSourceKey: meta?.variableSourceKey ?? null,
    sourceKey: row.source_key,
    roleCode: row.role_code,
    roleName: meta?.roleName ?? null,
    displayName: row.display_name,
    unit: row.unit,
    displayFormat: row.display_format,
    decimalPlaces: row.decimal_places,
    multiplier: Number(row.multiplier),
    offsetValue: Number(row.offset_value),
    textValueMap: asTextMap(row.text_value_map),
    inverted: row.inverted,
    writable: row.writable,
    minValue: row.min_value !== null ? Number(row.min_value) : null,
    maxValue: row.max_value !== null ? Number(row.max_value) : null,
    dataQuality: row.data_quality as VizDataQuality,
    collectionIntervalSeconds: row.collection_interval_seconds,
  };
}

export function rowToVizProjectSystemStatus(
  row: {
    id: string;
    dashboard_id: string;
    project_id: string;
    system_id: string;
    status: string;
    integration_scope: string | null;
    notes: string | null;
    updated_at: string;
  },
  meta?: { systemCode?: string; systemName?: string },
): VizProjectSystemStatus {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    projectId: row.project_id,
    systemId: row.system_id,
    systemCode: meta?.systemCode ?? "",
    systemName: meta?.systemName ?? "",
    status: row.status as VizSystemIntegrationStatus,
    integrationScope: row.integration_scope,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export function rowToVizDashboardAccess(
  row: {
    id: string;
    dashboard_id: string;
    profile_id: string;
    access_role: string;
    permissions_json: unknown;
  },
  meta?: { profileName?: string | null },
): VizDashboardAccess {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    profileId: row.profile_id,
    profileName: meta?.profileName ?? null,
    accessRole: row.access_role as VizAccessRole,
    permissionsJson: asPermissions(row.permissions_json),
  };
}
