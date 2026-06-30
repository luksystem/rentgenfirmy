export const INTEGRATION_TYPES = ["loxone", "modbus_gateway", "bms_api", "other"] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const CONNECTION_METHODS = [
  "vpn",
  "local_gateway",
  "remote_connect",
  "cloud",
  "api",
] as const;
export type ConnectionMethod = (typeof CONNECTION_METHODS)[number];

export const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  loxone: "Loxone Miniserver",
  modbus_gateway: "Modbus Gateway",
  bms_api: "BMS API",
  other: "Inne",
};

export const CONNECTION_METHOD_LABELS: Record<ConnectionMethod, string> = {
  vpn: "VPN",
  local_gateway: "Bramka lokalna",
  remote_connect: "Remote Connect",
  cloud: "Cloud / CloudDNS",
  api: "API (bezpośrednie)",
};

export type LoxoneIntegrationConfig = {
  serialNumber?: string | null;
  useTls?: boolean;
  tlsInsecure?: boolean;
  virtualInputName: string;
  locationLabel: string;
};

export type IntegrationMeta = {
  id: string;
  projectId: string;
  integrationType: IntegrationType;
  name: string;
  connectionMethod: ConnectionMethod;
  apiUrl: string | null;
  port: number | null;
  loginUsername: string | null;
  isActive: boolean;
  technicalNotes: string | null;
  configJson: LoxoneIntegrationConfig | Record<string, unknown>;
  hasCredentials: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  createdByName: string;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationInput = {
  integrationType: IntegrationType;
  name: string;
  connectionMethod: ConnectionMethod;
  apiUrl?: string | null;
  port?: number | null;
  loginUsername?: string | null;
  password: string;
  isActive?: boolean;
  technicalNotes?: string | null;
  configJson?: LoxoneIntegrationConfig | Record<string, unknown>;
};

export type IntegrationUpdateInput = {
  integrationType?: IntegrationType;
  name?: string;
  connectionMethod?: ConnectionMethod;
  apiUrl?: string | null;
  port?: number | null;
  loginUsername?: string | null;
  password?: string;
  isActive?: boolean;
  technicalNotes?: string | null;
  configJson?: LoxoneIntegrationConfig | Record<string, unknown>;
};

export type ProjectTelemetrySnapshot = {
  id: string;
  projectId: string;
  integrationId: string;
  integrationName: string;
  temperature: number | null;
  humidity: number | null;
  setpoint: number | null;
  alarmStatus: string | null;
  onlineStatus: boolean;
  sourceName: string | null;
  measuredAt: string;
};

export type IntegrationTestResult = {
  ok: boolean;
  latencyMs: number;
  online: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export type IntegrationAuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "test_connection"
  | "sync_success"
  | "sync_failure";

export type IntegrationAuditEntry = {
  id: string;
  integrationId: string | null;
  projectId: string;
  action: IntegrationAuditAction;
  actorName: string;
  changesJson: Record<string, unknown>;
  metadataJson: Record<string, unknown>;
  createdAt: string;
};
