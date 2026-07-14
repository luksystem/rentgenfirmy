export const INTEGRATION_VARIABLE_VALUE_KINDS = ["numeric", "boolean", "text"] as const;
export type IntegrationVariableValueKind = (typeof INTEGRATION_VARIABLE_VALUE_KINDS)[number];

export type IntegrationVariable = {
  id: string;
  integrationId: string;
  projectId: string;
  name: string;
  sourceKey: string;
  locationLabel: string | null;
  valueKind: IntegrationVariableValueKind;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationVariableInput = {
  name: string;
  sourceKey: string;
  locationLabel?: string | null;
  valueKind?: IntegrationVariableValueKind;
  sortOrder?: number;
  isActive?: boolean;
};

export type IntegrationVariableTelemetry = {
  variableId: string;
  integrationId: string;
  projectId: string;
  numericValue: number | null;
  textValue: string | null;
  onlineStatus: boolean;
  measuredAt: string;
  sourceName: string | null;
};
