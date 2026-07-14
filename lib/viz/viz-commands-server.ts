import type { ConnectionMethod, LoxoneIntegrationConfig } from "@/lib/integrations/types";
import { writeLoxonePointValue, type LoxoneFetchParams } from "@/lib/integrations/loxone-client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getProjectIntegrationMeta,
  revealIntegrationPassword,
} from "@/lib/supabase/project-integrations-repository";
import type { VizControlCommandRow } from "@/lib/supabase/database.types";

export type VizControlCommand = {
  id: string;
  dashboardId: string;
  projectId: string;
  mappingId: string | null;
  roleCode: string | null;
  commandType: "setpoint" | "generic";
  requestedValue: number;
  previousValue: number | null;
  status: "pending" | "processing" | "success" | "failed";
  errorMessage: string | null;
  requestedByUserId: string | null;
  requestedByName: string;
  processedAt: string | null;
  createdAt: string;
};

function rowToCommand(row: VizControlCommandRow): VizControlCommand {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    projectId: row.project_id,
    mappingId: row.mapping_id,
    roleCode: row.role_code,
    commandType: row.command_type === "generic" ? "generic" : "setpoint",
    requestedValue: Number(row.requested_value),
    previousValue: row.previous_value != null ? Number(row.previous_value) : null,
    status: row.status as VizControlCommand["status"],
    errorMessage: row.error_message,
    requestedByUserId: row.requested_by_user_id,
    requestedByName: row.requested_by_name,
    processedAt: row.processed_at,
    createdAt: row.created_at,
  };
}

async function buildLoxoneParams(integrationId: string): Promise<LoxoneFetchParams> {
  const meta = await getProjectIntegrationMeta(integrationId);
  if (!meta || meta.integrationType !== "loxone") {
    throw new Error("Integracja Loxone nie istnieje.");
  }
  if (!meta.isActive) {
    throw new Error("Integracja Loxone jest nieaktywna.");
  }

  const password = await revealIntegrationPassword(integrationId);
  const config = meta.configJson as LoxoneIntegrationConfig;

  return {
    apiUrl: meta.apiUrl,
    port: meta.port,
    connectionMethod: meta.connectionMethod as ConnectionMethod,
    config,
    loginUsername: meta.loginUsername,
    password,
  };
}

export async function listVizControlCommands(input: {
  dashboardId: string;
  projectId?: string;
  limit?: number;
}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("viz_control_commands")
    .select("*")
    .eq("dashboard_id", input.dashboardId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 50);

  if (input.projectId) {
    query = query.eq("project_id", input.projectId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToCommand(row as VizControlCommandRow));
}

export async function createVizSetpointCommand(input: {
  dashboardId: string;
  projectId: string;
  value: number;
  requestedByUserId: string;
  requestedByName: string;
}) {
  const supabase = getSupabaseAdmin();

  const { data: mapping, error: mappingError } = await supabase
    .from("viz_variable_mappings")
    .select("*")
    .eq("dashboard_id", input.dashboardId)
    .eq("project_id", input.projectId)
    .eq("role_code", "store_setpoint")
    .maybeSingle();

  if (mappingError) {
    throw new Error(mappingError.message);
  }
  if (!mapping) {
    throw new Error("Brak mapowania roli store_setpoint dla tego sklepu.");
  }
  if (!mapping.writable) {
    throw new Error("Setpoint nie jest oznaczony jako zapisywalny w mapowaniu zmiennych.");
  }
  if (mapping.min_value != null && input.value < Number(mapping.min_value)) {
    throw new Error(`Wartość poniżej minimum (${mapping.min_value}).`);
  }
  if (mapping.max_value != null && input.value > Number(mapping.max_value)) {
    throw new Error(`Wartość powyżej maksimum (${mapping.max_value}).`);
  }

  let sourceKey = mapping.source_key?.trim() || null;
  let integrationId = mapping.integration_id;

  if (mapping.integration_variable_id) {
    const { data: variable, error: variableError } = await supabase
      .from("project_integration_variables")
      .select("source_key, integration_id")
      .eq("id", mapping.integration_variable_id)
      .maybeSingle();

    if (variableError) {
      throw new Error(variableError.message);
    }
    if (!variable) {
      throw new Error("Powiązana zmienna integracji nie istnieje.");
    }
    sourceKey = variable.source_key;
    integrationId = variable.integration_id;
  }

  if (!integrationId || !sourceKey) {
    throw new Error("Mapowanie setpointu nie ma przypisanej integracji ani source_key.");
  }

  const { data: currentValue } = await supabase
    .from("viz_variable_current_values")
    .select("numeric_value")
    .eq("dashboard_id", input.dashboardId)
    .eq("project_id", input.projectId)
    .eq("role_code", "store_setpoint")
    .maybeSingle();

  const commandId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: insertError } = await supabase
    .from("viz_control_commands")
    .insert({
      id: commandId,
      dashboard_id: input.dashboardId,
      project_id: input.projectId,
      mapping_id: mapping.id,
      role_code: "store_setpoint",
      command_type: "setpoint",
      requested_value: input.value,
      previous_value: currentValue?.numeric_value != null ? Number(currentValue.numeric_value) : null,
      status: "processing",
      requested_by_user_id: input.requestedByUserId,
      requested_by_name: input.requestedByName,
      created_at: now,
    })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  try {
    const params = await buildLoxoneParams(integrationId);
    await writeLoxonePointValue(params, sourceKey, input.value);

    const { data: updated, error: updateError } = await supabase
      .from("viz_control_commands")
      .update({
        status: "success",
        processed_at: new Date().toISOString(),
      })
      .eq("id", commandId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return rowToCommand(updated as VizControlCommandRow);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd wysyłki komendy.";
    await supabase
      .from("viz_control_commands")
      .update({
        status: "failed",
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", commandId);

    throw new Error(message);
  }
}
