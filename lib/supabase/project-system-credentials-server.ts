import type {
  SystemCredentialInput,
  SystemCredentialMeta,
  SystemCredentialUpdateInput,
} from "@/lib/dashboard/system-credentials-types";
import {
  decryptCredentialSecret,
  encryptCredentialSecret,
} from "@/lib/security/credentials-crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProjectSystemCredentialRow } from "@/lib/supabase/database.types";

type CredentialRow = {
  id: string;
  project_id: string;
  label: string;
  system_url: string | null;
  login_username: string | null;
  password_ciphertext: string;
  password_iv: string;
  password_tag: string;
  notes: string | null;
  visible_to_client: boolean;
  position: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

function rowToMeta(row: CredentialRow): SystemCredentialMeta {
  return {
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    systemUrl: row.system_url,
    loginUsername: row.login_username,
    notes: row.notes,
    visibleToClient: row.visible_to_client,
    hasPassword: Boolean(row.password_ciphertext),
    position: row.position,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function systemCredentialsTableExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("project_system_credentials").select("id").limit(1);
  return !error;
}

export async function listProjectSystemCredentials(
  projectId: string,
  options?: { clientVisibleOnly?: boolean },
): Promise<SystemCredentialMeta[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("project_system_credentials")
    .select(
      "id, project_id, label, system_url, login_username, password_ciphertext, notes, visible_to_client, position, created_by_name, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (options?.clientVisibleOnly) {
    query = query.eq("visible_to_client", true);
  }

  const { data, error } = await query;
  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToMeta(row as CredentialRow));
}

export async function getProjectSystemCredentialMeta(
  credentialId: string,
): Promise<SystemCredentialMeta | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_system_credentials")
    .select(
      "id, project_id, label, system_url, login_username, password_ciphertext, notes, visible_to_client, position, created_by_name, created_at, updated_at",
    )
    .eq("id", credentialId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return rowToMeta(data as CredentialRow);
}

export async function createProjectSystemCredential(
  projectId: string,
  input: SystemCredentialInput,
  createdByName: string,
) {
  const password = input.password.trim();
  if (!input.label.trim()) {
    throw new Error("Podaj nazwę systemu.");
  }
  if (!password) {
    throw new Error("Hasło jest wymagane.");
  }

  const supabase = getSupabaseAdmin();
  const { data: lastRow } = await supabase
    .from("project_system_credentials")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const encrypted = encryptCredentialSecret(password);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("project_system_credentials")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      label: input.label.trim(),
      system_url: input.systemUrl?.trim() || null,
      login_username: input.loginUsername?.trim() || null,
      password_ciphertext: encrypted.ciphertext,
      password_iv: encrypted.iv,
      password_tag: encrypted.tag,
      notes: input.notes?.trim() || null,
      visible_to_client: input.visibleToClient ?? true,
      position: (typeof lastRow?.position === "number" ? lastRow.position : -1) + 1,
      created_by_name: createdByName.trim() || "Zespół",
      created_at: now,
      updated_at: now,
    })
    .select(
      "id, project_id, label, system_url, login_username, password_ciphertext, notes, visible_to_client, position, created_by_name, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToMeta(data as CredentialRow);
}

export async function updateProjectSystemCredential(
  credentialId: string,
  input: SystemCredentialUpdateInput,
) {
  const supabase = getSupabaseAdmin();
  const existing = await getProjectSystemCredentialMeta(credentialId);
  if (!existing) {
    throw new Error("Nie znaleziono wpisu.");
  }

  const payload: Partial<ProjectSystemCredentialRow> = {
    updated_at: new Date().toISOString(),
  };

  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) {
      throw new Error("Podaj nazwę systemu.");
    }
    payload.label = label;
  }
  if (input.systemUrl !== undefined) {
    payload.system_url = input.systemUrl?.trim() || null;
  }
  if (input.loginUsername !== undefined) {
    payload.login_username = input.loginUsername?.trim() || null;
  }
  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() || null;
  }
  if (input.visibleToClient !== undefined) {
    payload.visible_to_client = input.visibleToClient;
  }
  if (input.password != null) {
    const password = input.password.trim();
    if (!password) {
      throw new Error("Hasło nie może być puste.");
    }
    const encrypted = encryptCredentialSecret(password);
    payload.password_ciphertext = encrypted.ciphertext;
    payload.password_iv = encrypted.iv;
    payload.password_tag = encrypted.tag;
  }

  const { data, error } = await supabase
    .from("project_system_credentials")
    .update(payload)
    .eq("id", credentialId)
    .select(
      "id, project_id, label, system_url, login_username, password_ciphertext, notes, visible_to_client, position, created_by_name, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToMeta(data as CredentialRow);
}

export async function deleteProjectSystemCredential(credentialId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("project_system_credentials")
    .delete()
    .eq("id", credentialId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function revealProjectSystemCredentialPassword(credentialId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_system_credentials")
    .select("password_ciphertext, password_iv, password_tag")
    .eq("id", credentialId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Nie znaleziono wpisu.");
  }

  const row = data as Pick<CredentialRow, "password_ciphertext" | "password_iv" | "password_tag">;
  return decryptCredentialSecret(row.password_ciphertext, row.password_iv, row.password_tag);
}
