import "server-only";

import type { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/send-push";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

/**
 * Krok B B9 kierunek 2 (docs/08 D28) — przy zatwierdzeniu urlopu, realne powiadomienie (nie tylko
 * pasywny feed do user_absences) obejmujące ZARÓWNO zaplanowane bloki, JAK I niezaplanowane
 * zobowiązania — te drugie były dotąd dla tego mechanizmu całkowicie niewidoczne, a to one
 * zaskakują (przypadek: wdrożeniowiec dowiaduje się tydzień przed urlopem o dwóch programach
 * testowych, zamiast sześć tygodni wcześniej).
 *
 * Powiadamiany jest ZATWIERDZAJĄCY (decydent) — to on może przeplanować pracę, nie osoba idąca
 * na urlop (ona i tak już wie, że jedzie).
 */
export async function notifyLeaveCommitmentImpact(
  admin: AdminClient,
  input: {
    leaveRequestId: string;
    profileId: string;
    profileName: string;
    startDate: string;
    endDate: string;
    approverUserId: string;
  },
): Promise<{ affected: number }> {
  const { data, error } = await admin.rpc("report_leave_commitment_impact", {
    p_profile_id: input.profileId,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
  });
  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return { affected: 0 };
  }

  const lines = rows.map((row) => `${row.project_name} — ${row.title} (${row.window_start}–${row.window_end})`);
  const title = `Urlop ${input.profileName} wpływa na ${rows.length} zobowiązań`;
  const body = lines.slice(0, 5).join("; ") + (lines.length > 5 ? ` i ${lines.length - 5} więcej…` : "");
  const sourceId = `leave_commitment_impact:${input.leaveRequestId}`;
  const linkUrl = "/plan-zasobow";

  const { error: insertError } = await admin.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: input.approverUserId,
    kind: "leave_commitment_impact",
    title,
    body,
    link_url: linkUrl,
    source_id: sourceId,
    created_at: new Date().toISOString(),
  });
  if (insertError) {
    console.warn("[leave-commitment-impact] user_notifications insert:", insertError.message);
  }

  try {
    await sendPushToUser(input.approverUserId, { title, body, url: linkUrl, tag: sourceId });
  } catch {
    // Brak VAPID / subskrypcji — pomijamy.
  }

  return { affected: rows.length };
}
