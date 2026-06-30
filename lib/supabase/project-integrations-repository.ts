import type { IntegrationAuditAction, IntegrationAuditEntry, IntegrationInput, IntegrationMeta, IntegrationType, IntegrationUpdateInput, LoxoneIntegrationConfig } from "@/lib/integrations/types";
import {
  decryptCredentialSecret,
  encryptCredentialSecret,
} from "@/lib/security/credentials-crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProjectIntegrationRow } from "@/lib/supabase/database.types";

type IntegrationRow = {
  id: string;
  project_id: string;
  integration_type: IntegrationType;
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
  project_integration_secrets?: Array<{ password_ciphertext: string }> | null;
};

const META_SELECT =
  "id, project_id, integration_type, name, connection_method, api_url, port, login_username, is_active, technical_notes, config_json, last_sync_at, last_error, last_error_at, created_by_user_id, created_by_name, updated_by_user_id, updated_by_name, created_at, updated_at, project_integration_secrets(password_ciphertext)";

function rowToMeta(row: IntegrationRow): IntegrationMeta {
  const secrets = row.project_integration_secrets;
  const hasCredentials = Array.isArray(secrets)
    ? secrets.some((entry) => Boolean(entry.password_ciphertext))
    : false;

  return {
    id: row.id,
    projectId: row.project_id,
    integrationType: row.integration_type,
    name: row.name,
    connectionMethod: row.connection_method as IntegrationMeta["connectionMethod"],
    apiUrl: row.api_url,
    port: row.port,
    loginUsername: row.login_username,
    isActive: row.is_active,
    technicalNotes: row.technical_notes,
    configJson: (row.config_json ?? {}) as LoxoneIntegrationConfig,
    hasCredentials,
    lastSyncAt: row.last_sync_at,
    lastError: row.last_error,
    lastErrorAt: row.last_error_at,
    createdByName: row.created_by_name,
    updatedByName: row.updated_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateLoxoneConfig(config: Record<string, unknown>) {
  const virtualInputName =
    typeof config.virtualInputName === "string" ? config.virtualInputName.trim() : "";
  const locationLabel =
    typeof config.locationLabel === "string" ? config.locationLabel.trim() : "";

  if (!virtualInputName) {
    throw new Error("Podaj nazwę Virtual Input (punkt temperatury).");
  }
  if (!locationLabel) {
    throw new Error("Podaj lokalizację w budynku.");
  }
}

export async function appendIntegrationAuditLog(input: {
  integrationId?: string | null;
  projectId: string;
  action: IntegrationAuditEntry["action"];
  actorUserId?: string | null;
  actorName: string;
  changesJson?: Record<string, unknown>;
  metadataJson?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("project_integration_audit_log").insert({
    id: crypto.randomUUID(),
    integration_id: input.integrationId ?? null,
    project_id: input.projectId,
    action: input.action,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName.trim() || "System",
    changes_json: input.changesJson ?? {},
    metadata_json: input.metadataJson ?? {},
    created_at: new Date().toISOString(),
  });

  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}

export async function listProjectIntegrations(projectId: string): Promise<IntegrationMeta[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integrations")
    .select(META_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToMeta(row as IntegrationRow));
}

export async function getProjectIntegrationMeta(integrationId: string): Promise<IntegrationMeta | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integrations")
    .select(META_SELECT)
    .eq("id", integrationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return rowToMeta(data as IntegrationRow);
}

export async function listActiveIntegrations(): Promise<IntegrationMeta[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integrations")
    .select(META_SELECT)
    .eq("is_active", true)
    .order("last_sync_at", { ascending: true, nullsFirst: true });

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToMeta(row as IntegrationRow));
}

export async function revealIntegrationPassword(integrationId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integration_secrets")
    .select("password_ciphertext, password_iv, password_tag")
    .eq("integration_id", integrationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Brak zapisanych danych dostępowych.");
  }

  return decryptCredentialSecret(
    data.password_ciphertext,
    data.password_iv,
    data.password_tag,
  );
}

export async function createProjectIntegration(
  projectId: string,
  input: IntegrationInput,
  actor: { userId: string; name: string },
) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Podaj nazwę integracji.");
  }

  const password = input.password.trim();
  if (!password) {
    throw new Error("Hasło jest wymagane przy tworzeniu integracji.");
  }

  const configJson = (input.configJson ?? {}) as Record<string, unknown>;
  if (input.integrationType === "loxone") {
    validateLoxoneConfig(configJson);
  }

  const supabase = getSupabaseAdmin();
  const integrationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const encrypted = encryptCredentialSecret(password);

  const { data, error } = await supabase
    .from("project_integrations")
    .insert({
      id: integrationId,
      project_id: projectId,
      integration_type: input.integrationType,
      name,
      connection_method: input.connectionMethod,
      api_url: input.apiUrl?.trim() || null,
      port: typeof input.port === "number" ? input.port : null,
      login_username: input.loginUsername?.trim() || null,
      is_active: input.isActive ?? true,
      technical_notes: input.technicalNotes?.trim() || null,
      config_json: configJson,
      created_by_user_id: actor.userId,
      created_by_name: actor.name,
      updated_by_user_id: actor.userId,
      updated_by_name: actor.name,
      created_at: now,
      updated_at: now,
    })
    .select(META_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: secretError } = await supabase.from("project_integration_secrets").insert({
    integration_id: integrationId,
    password_ciphertext: encrypted.ciphertext,
    password_iv: encrypted.iv,
    password_tag: encrypted.tag,
    updated_at: now,
  });

  if (secretError) {
    await supabase.from("project_integrations").delete().eq("id", integrationId);
    throw new Error(secretError.message);
  }

  await appendIntegrationAuditLog({
    integrationId,
    projectId,
    action: "created",
    actorUserId: actor.userId,
    actorName: actor.name,
    changesJson: {
      name,
      integrationType: input.integrationType,
      connectionMethod: input.connectionMethod,
    },
  });

  return rowToMeta(data as IntegrationRow);
}

export async function updateProjectIntegration(
  integrationId: string,
  input: IntegrationUpdateInput,
  actor: { userId: string; name: string },
) {
  const existing = await getProjectIntegrationMeta(integrationId);
  if (!existing) {
    throw new Error("Nie znaleziono integracji.");
  }

  const integrationType = input.integrationType ?? existing.integrationType;
  const configJson = (input.configJson ?? existing.configJson) as Record<string, unknown>;
  if (integrationType === "loxone") {
    validateLoxoneConfig(configJson);
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const payload: Partial<ProjectIntegrationRow> = {
    updated_at: now,
    updated_by_user_id: actor.userId,
    updated_by_name: actor.name,
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Podaj nazwę integracji.");
    }
    payload.name = name;
  }
  if (input.integrationType !== undefined) {
    payload.integration_type = input.integrationType;
  }
  if (input.connectionMethod !== undefined) {
    payload.connection_method = input.connectionMethod;
  }
  if (input.apiUrl !== undefined) {
    payload.api_url = input.apiUrl?.trim() || null;
  }
  if (input.port !== undefined) {
    payload.port = typeof input.port === "number" ? input.port : null;
  }
  if (input.loginUsername !== undefined) {
    payload.login_username = input.loginUsername?.trim() || null;
  }
  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }
  if (input.technicalNotes !== undefined) {
    payload.technical_notes = input.technicalNotes?.trim() || null;
  }
  if (input.configJson !== undefined) {
    payload.config_json = configJson;
  }

  const { data, error } = await supabase
    .from("project_integrations")
    .update(payload)
    .eq("id", integrationId)
    .select(META_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (input.password?.trim()) {
    const encrypted = encryptCredentialSecret(input.password.trim());
    const { error: secretError } = await supabase.from("project_integration_secrets").upsert({
      integration_id: integrationId,
      password_ciphertext: encrypted.ciphertext,
      password_iv: encrypted.iv,
      password_tag: encrypted.tag,
      updated_at: now,
    });

    if (secretError) {
      throw new Error(secretError.message);
    }
  }

  await appendIntegrationAuditLog({
    integrationId,
    projectId: existing.projectId,
    action: "updated",
    actorUserId: actor.userId,
    actorName: actor.name,
    changesJson: {
      ...payload,
      passwordChanged: Boolean(input.password?.trim()),
    },
  });

  return rowToMeta(data as IntegrationRow);
}

export async function deleteProjectIntegration(
  integrationId: string,
  actor: { userId: string; name: string },
) {
  const existing = await getProjectIntegrationMeta(integrationId);
  if (!existing) {
    throw new Error("Nie znaleziono integracji.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("project_integrations").delete().eq("id", integrationId);

  if (error) {
    throw new Error(error.message);
  }

  await appendIntegrationAuditLog({
    integrationId: null,
    projectId: existing.projectId,
    action: "deleted",
    actorUserId: actor.userId,
    actorName: actor.name,
    changesJson: { name: existing.name, integrationType: existing.integrationType },
  });
}

export async function markIntegrationSyncResult(
  integrationId: string,
  result: { ok: boolean; error?: string | null },
) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (result.ok) {
    await supabase
      .from("project_integrations")
      .update({
        last_sync_at: now,
        last_error: null,
        last_error_at: null,
        updated_at: now,
      })
      .eq("id", integrationId);
    return;
  }

  await supabase
    .from("project_integrations")
    .update({
      last_error: result.error?.slice(0, 2000) ?? "Nieznany błąd synchronizacji.",
      last_error_at: now,
      updated_at: now,
    })
    .eq("id", integrationId);
}

export async function listIntegrationAuditLog(
  projectId: string,
  limit = 30,
): Promise<IntegrationAuditEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integration_audit_log")
    .select(
      "id, integration_id, project_id, action, actor_name, changes_json, metadata_json, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    integrationId: (row.integration_id as string | null) ?? null,
    projectId: row.project_id as string,
    action: row.action as IntegrationAuditAction,
    actorName: row.actor_name as string,
    changesJson: (row.changes_json as Record<string, unknown>) ?? {},
    metadataJson: (row.metadata_json as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }));
}
