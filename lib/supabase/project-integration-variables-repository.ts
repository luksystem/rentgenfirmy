import type {
  IntegrationVariable,
  IntegrationVariableInput,
  IntegrationVariableTelemetry,
  IntegrationVariableValueKind,
} from "@/lib/integrations/integration-variable-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProjectIntegrationVariableRow } from "@/lib/supabase/database.types";

type VariableRow = {
  id: string;
  integration_id: string;
  project_id: string;
  name: string;
  source_key: string;
  location_label: string | null;
  value_kind: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function rowToVariable(row: VariableRow): IntegrationVariable {
  return {
    id: row.id,
    integrationId: row.integration_id,
    projectId: row.project_id,
    name: row.name,
    sourceKey: row.source_key,
    locationLabel: row.location_label,
    valueKind: row.value_kind as IntegrationVariableValueKind,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listIntegrationVariables(
  integrationId: string,
): Promise<IntegrationVariable[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integration_variables")
    .select("*")
    .eq("integration_id", integrationId)
    .order("sort_order")
    .order("name");

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToVariable(row as VariableRow));
}

export async function listIntegrationVariablesForIntegrations(integrationIds: string[]) {
  if (!integrationIds.length) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integration_variables")
    .select("*")
    .in("integration_id", integrationIds)
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToVariable(row as VariableRow));
}

export async function listActiveIntegrationVariablesForProject(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integration_variables")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToVariable(row as VariableRow));
}

export async function createIntegrationVariable(
  integrationId: string,
  projectId: string,
  input: IntegrationVariableInput,
): Promise<IntegrationVariable> {
  const supabase = getSupabaseAdmin();
  const sourceKey = input.sourceKey.trim();
  const name = input.name.trim();

  if (!sourceKey || !name) {
    throw new Error("Nazwa i identyfikator punktu (source_key) są wymagane.");
  }

  const { data, error } = await supabase
    .from("project_integration_variables")
    .insert({
      integration_id: integrationId,
      project_id: projectId,
      name,
      source_key: sourceKey,
      location_label: input.locationLabel?.trim() || null,
      value_kind: input.valueKind ?? "numeric",
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToVariable(data as VariableRow);
}

export async function updateIntegrationVariable(
  variableId: string,
  input: Partial<IntegrationVariableInput>,
): Promise<IntegrationVariable> {
  const supabase = getSupabaseAdmin();
  const payload: Partial<ProjectIntegrationVariableRow> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.sourceKey !== undefined) payload.source_key = input.sourceKey.trim();
  if (input.locationLabel !== undefined) payload.location_label = input.locationLabel?.trim() || null;
  if (input.valueKind !== undefined) payload.value_kind = input.valueKind;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const { data, error } = await supabase
    .from("project_integration_variables")
    .update(payload)
    .eq("id", variableId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToVariable(data as VariableRow);
}

export async function deleteIntegrationVariable(variableId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("project_integration_variables")
    .delete()
    .eq("id", variableId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureLegacyLoxoneVariable(
  integrationId: string,
  projectId: string,
  config: { virtualInputName?: string | null; locationLabel?: string | null; integrationName?: string },
) {
  const sourceKey = config.virtualInputName?.trim();
  if (!sourceKey) {
    return null;
  }

  const existing = await listIntegrationVariables(integrationId);
  const match = existing.find((v) => v.sourceKey === sourceKey);
  if (match) {
    return match;
  }

  return createIntegrationVariable(integrationId, projectId, {
    name: config.locationLabel?.trim() || config.integrationName || sourceKey,
    sourceKey,
    locationLabel: config.locationLabel?.trim() || null,
    valueKind: "numeric",
    sortOrder: existing.length,
  });
}

export async function listLatestTelemetryForVariables(
  variableIds: string[],
): Promise<IntegrationVariableTelemetry[]> {
  if (!variableIds.length) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_telemetry")
    .select(
      "integration_variable_id, integration_id, project_id, numeric_value, text_value, temperature, online_status, measured_at, source_name",
    )
    .in("integration_variable_id", variableIds)
    .order("measured_at", { ascending: false })
    .limit(Math.max(variableIds.length * 5, 50));

  if (error) {
    throw new Error(error.message);
  }

  const latestByVariable = new Map<string, IntegrationVariableTelemetry>();
  for (const row of data ?? []) {
    const variableId = row.integration_variable_id as string | null;
    if (!variableId || latestByVariable.has(variableId)) {
      continue;
    }

    const numeric =
      row.numeric_value != null
        ? Number(row.numeric_value)
        : row.temperature != null
          ? Number(row.temperature)
          : null;

    latestByVariable.set(variableId, {
      variableId,
      integrationId: row.integration_id as string,
      projectId: row.project_id as string,
      numericValue: numeric,
      textValue: (row.text_value as string | null) ?? null,
      onlineStatus: Boolean(row.online_status),
      measuredAt: row.measured_at as string,
      sourceName: (row.source_name as string | null) ?? null,
    });
  }

  return Array.from(latestByVariable.values());
}
