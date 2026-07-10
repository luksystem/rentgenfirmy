// Repozytorium publicznych linków do raportu (service-role, nietypowany klient).
// Własność sesji egzekwowana w warstwie API; RLS chroni dostęp anon/user.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ReportShare, SectionVisibility, ShareAccessLogEntry } from "@/lib/audit/types";
import { normalizeVisibility } from "@/lib/audit/report-visibility";

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

type ShareRow = {
  id: string;
  session_id: string;
  token: string;
  password_hash: string;
  is_active: boolean;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  failed_attempts: number;
  locked_until: string | null;
  visible_sections: unknown;
  created_at: string;
  updated_at: string;
};

function mapShare(row: ShareRow): ReportShare {
  return {
    id: row.id,
    sessionId: row.session_id,
    token: row.token,
    hasPassword: Boolean(row.password_hash),
    isActive: row.is_active,
    expiresAt: row.expires_at,
    maxViews: row.max_views,
    viewCount: row.view_count,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
    visibleSections: normalizeVisibility(row.visible_sections),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Wewnętrzny odczyt z hashem hasła (tylko serwer, weryfikacja).
export async function getShareRowByToken(token: string): Promise<ShareRow | null> {
  const { data, error } = await db()
    .from("audit_report_shares")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ShareRow) ?? null;
}

export async function getShareBySession(sessionId: string): Promise<ReportShare | null> {
  const { data, error } = await db()
    .from("audit_report_shares")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapShare(data as ShareRow) : null;
}

export async function upsertShare(
  sessionId: string,
  input: {
    token: string;
    passwordHash?: string;
    isActive?: boolean;
    expiresAt?: string | null;
    maxViews?: number | null;
    visibleSections?: SectionVisibility;
  },
): Promise<ReportShare> {
  const existing = await getShareBySession(sessionId);
  const now = new Date().toISOString();

  if (!existing) {
    const { data, error } = await db()
      .from("audit_report_shares")
      .insert({
        session_id: sessionId,
        token: input.token,
        password_hash: input.passwordHash ?? "",
        is_active: input.isActive ?? true,
        expires_at: input.expiresAt ?? null,
        max_views: input.maxViews ?? null,
        visible_sections: input.visibleSections ?? undefined,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapShare(data as ShareRow);
  }

  const patch: Record<string, unknown> = { updated_at: now };
  if (input.passwordHash !== undefined) patch.password_hash = input.passwordHash;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt;
  if (input.maxViews !== undefined) patch.max_views = input.maxViews;
  if (input.visibleSections !== undefined) patch.visible_sections = input.visibleSections;

  const { data, error } = await db()
    .from("audit_report_shares")
    .update(patch)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapShare(data as ShareRow);
}

export async function regenerateToken(sessionId: string, token: string): Promise<ReportShare> {
  const { data, error } = await db()
    .from("audit_report_shares")
    .update({ token, failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapShare(data as ShareRow);
}

export async function deleteShare(sessionId: string): Promise<void> {
  const { error } = await db().from("audit_report_shares").delete().eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function incrementViewCount(shareId: string, current: number): Promise<void> {
  await db()
    .from("audit_report_shares")
    .update({ view_count: current + 1 })
    .eq("id", shareId);
}

export async function registerFailedAttempt(
  shareId: string,
  current: number,
  lockUntil: string | null,
): Promise<void> {
  await db()
    .from("audit_report_shares")
    .update({ failed_attempts: current + 1, locked_until: lockUntil })
    .eq("id", shareId);
}

export async function resetFailedAttempts(shareId: string): Promise<void> {
  await db()
    .from("audit_report_shares")
    .update({ failed_attempts: 0, locked_until: null })
    .eq("id", shareId);
}

export async function logShareAccess(
  shareId: string,
  entry: { event: "view" | "password_ok" | "password_fail"; ipHash: string | null; userAgent: string | null; passwordOk: boolean | null },
): Promise<void> {
  await db().from("audit_report_share_access_log").insert({
    share_id: shareId,
    event: entry.event,
    ip_hash: entry.ipHash,
    user_agent: entry.userAgent,
    password_ok: entry.passwordOk,
  });
}

export async function listShareAccessLog(shareId: string, limit = 50): Promise<ShareAccessLogEntry[]> {
  const { data, error } = await db()
    .from("audit_report_share_access_log")
    .select("*")
    .eq("share_id", shareId)
    .order("accessed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (
    data as Array<{
      id: string;
      event: "view" | "password_ok" | "password_fail";
      ip_hash: string | null;
      user_agent: string | null;
      password_ok: boolean | null;
      accessed_at: string;
    }>
  ).map((r) => ({
    id: r.id,
    event: r.event,
    ipHash: r.ip_hash,
    userAgent: r.user_agent,
    passwordOk: r.password_ok,
    accessedAt: r.accessed_at,
  }));
}
