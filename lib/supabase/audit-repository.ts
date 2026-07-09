// Repozytorium stanu audytu (MVP). Tabele audit_* nie są jeszcze w database.types.ts,
// więc używamy dedykowanego, nietypowanego klienta service-role (schema=any).
// Własność sesji egzekwowana w warstwie API; RLS chroni dostęp anon/user.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditSession,
  AuditStatus,
  AuditEvidence,
  BuildingType,
  ClimateZone,
} from "@/lib/audit/types";

export const AUDIT_EVIDENCE_BUCKET = "audit-evidence";

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Brak konfiguracji Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

type SessionRow = {
  id: string;
  owner_id: string;
  name: string;
  status: AuditStatus;
  methodology_version_id: string | null;
  building_type: BuildingType | null;
  climate_zone: ClimateZone | null;
  created_at: string;
  updated_at: string;
};

function mapSession(row: SessionRow): AuditSession {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    status: row.status,
    methodologyVersionId: row.methodology_version_id,
    buildingType: row.building_type,
    climateZone: row.climate_zone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createSession(ownerId: string, name: string): Promise<AuditSession> {
  const { data, error } = await db()
    .from("audit_sessions")
    .insert({ owner_id: ownerId, name, status: "draft" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapSession(data as SessionRow);
}

export async function listSessions(ownerId: string): Promise<AuditSession[]> {
  const { data, error } = await db()
    .from("audit_sessions")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as SessionRow[]).map(mapSession);
}

export async function getSession(id: string): Promise<AuditSession | null> {
  const { data, error } = await db().from("audit_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSession(data as SessionRow) : null;
}

export async function updateMethodology(
  id: string,
  input: { methodologyVersionId: string; buildingType: BuildingType; climateZone: ClimateZone },
): Promise<AuditSession> {
  const { data, error } = await db()
    .from("audit_sessions")
    .update({
      methodology_version_id: input.methodologyVersionId,
      building_type: input.buildingType,
      climate_zone: input.climateZone,
      status: "methodology_selected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapSession(data as SessionRow);
}

export async function setStatus(id: string, status: AuditStatus): Promise<void> {
  const { error } = await db()
    .from("audit_sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getAnswers(sessionId: string): Promise<Record<string, number>> {
  const { data, error } = await db()
    .from("audit_answers")
    .select("question_code, value_int")
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  const out: Record<string, number> = {};
  for (const r of data as Array<{ question_code: string; value_int: number | null }>) {
    if (r.value_int !== null) out[r.question_code] = r.value_int;
  }
  return out;
}

export async function upsertAnswers(
  sessionId: string,
  answers: Record<string, number>,
): Promise<void> {
  const rows = Object.entries(answers).map(([question_code, value_int]) => ({
    session_id: sessionId,
    question_code,
    value_int,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  const { error } = await db()
    .from("audit_answers")
    .upsert(rows, { onConflict: "session_id,question_code" });
  if (error) throw new Error(error.message);
}

export async function addEvidence(
  sessionId: string,
  input: { questionCode: string | null; caption: string | null; storagePath: string; contentType: string | null },
): Promise<AuditEvidence> {
  const { data, error } = await db()
    .from("audit_evidence")
    .insert({
      session_id: sessionId,
      question_code: input.questionCode,
      caption: input.caption,
      storage_path: input.storagePath,
      content_type: input.contentType,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const row = data as {
    id: string;
    question_code: string | null;
    caption: string | null;
    storage_path: string;
    content_type: string | null;
    created_at: string;
  };
  return {
    id: row.id,
    questionCode: row.question_code,
    caption: row.caption,
    storagePath: row.storage_path,
    contentType: row.content_type,
    createdAt: row.created_at,
  };
}

export async function listEvidence(sessionId: string): Promise<AuditEvidence[]> {
  const { data, error } = await db()
    .from("audit_evidence")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (
    data as Array<{
      id: string;
      question_code: string | null;
      caption: string | null;
      storage_path: string;
      content_type: string | null;
      created_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    questionCode: row.question_code,
    caption: row.caption,
    storagePath: row.storage_path,
    contentType: row.content_type,
    createdAt: row.created_at,
  }));
}

export async function uploadEvidenceFile(
  sessionId: string,
  questionCode: string | null,
  fileName: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const safeCode = (questionCode || "general").replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${sessionId}/${safeCode}/${crypto.randomUUID()}-${fileName}`;
  const { error } = await db()
    .storage.from(AUDIT_EVIDENCE_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return storagePath;
}

type ResultKind = "calculation" | "recommendation" | "optimization" | "roadmap";

export async function upsertResult(
  sessionId: string,
  kind: ResultKind,
  payload: unknown,
  engineVersion: string,
): Promise<void> {
  const { error } = await db()
    .from("audit_results")
    .upsert(
      {
        session_id: sessionId,
        kind,
        payload,
        engine_version: engineVersion,
        created_at: new Date().toISOString(),
      },
      { onConflict: "session_id,kind" },
    );
  if (error) throw new Error(error.message);
}

export async function getResults(
  sessionId: string,
): Promise<Partial<Record<ResultKind, unknown>>> {
  const { data, error } = await db()
    .from("audit_results")
    .select("kind, payload")
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  const out: Partial<Record<ResultKind, unknown>> = {};
  for (const r of data as Array<{ kind: ResultKind; payload: unknown }>) {
    out[r.kind] = r.payload;
  }
  return out;
}
