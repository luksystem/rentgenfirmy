import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/send-push";

/**
 * Krok B B8.1/B8.2 (docs/08 D28) — dwa ostrzeżenia dobowe czytane z report_commitment_warnings():
 * okno do terminu krótsze niż effort_days, odpowiedzialny niedostępny w oknie wykonania
 * (zaplanowany blok). Powiadomienie realne (push + user_notifications), nie tylko raport —
 * świadomie poza skonfigurowanym systemem routingu e-mail/push (jak warranty_expiring) — dwa nowe
 * rodzaje, nie ma jeszcze potrzeby konfigurowalności kanału per firma.
 */
export async function runCommitmentWarningsServer() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("report_commitment_warnings");
  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  let notified = 0;

  for (const row of rows) {
    const responsibleUserId = row.responsible_user_id as string | null;
    if (!responsibleUserId) {
      continue;
    }

    const kind =
      row.warning_type === "niedostepny" ? "commitment_unavailable_warning" : "commitment_window_warning";
    const sourceId = `${kind}:${row.item_id}`;
    const projectName = (row.project_name as string) ?? "Projekt";
    const title = (row.title as string) ?? "Element procesu";
    const detail = (row.detail as string) ?? "";
    const linkUrl = `/przestrzenie/klient?project=${row.project_id}`;

    const { data: existing } = await supabase
      .from("user_notifications")
      .select("id")
      .eq("source_id", sourceId)
      .limit(1);

    if ((existing ?? []).length > 0) {
      continue;
    }

    const heading =
      kind === "commitment_unavailable_warning"
        ? `Kolizja terminu: ${projectName}`
        : `Mało czasu: ${projectName}`;

    const { error: insertError } = await supabase.from("user_notifications").insert({
      id: crypto.randomUUID(),
      profile_id: responsibleUserId,
      kind,
      title: heading,
      body: `${title} — ${detail}`,
      link_url: linkUrl,
      source_id: sourceId,
      created_at: new Date().toISOString(),
    });
    if (insertError) {
      console.warn("[commitment-warnings] user_notifications insert:", insertError.message);
    }

    try {
      await sendPushToUser(responsibleUserId, {
        title: heading,
        body: `${title} — ${detail}`,
        url: linkUrl,
        tag: sourceId,
      });
    } catch {
      // Brak VAPID / subskrypcji — pomijamy, tak jak w innych crontach powiadomień.
    }

    notified += 1;
  }

  return { scanned: rows.length, notified };
}
