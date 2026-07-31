// D19 §6 / faza 12 (Tryb serwisowy) — powiadomienie "przegląd po 3/12 miesiącach".
//
// Świadomie NIE przez sendNotificationChannels/email-settings — wstawia wprost do
// user_notifications, tym samym wzorcem co powiadomienia D44 (employee_report_*). Push idzie przez
// istniejący przekaźnik cykliczny (push-relay-server.ts), nie przez pełny routing e-mail/push.
//
// Odbiorca: opiekun_projektu (slot na projekcie), z łańcuchem role_fallback — jeśli slot pusty,
// powiadomienie idzie do roli zastępczej zamiast przepaść w ciszy.
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRoleFallbackForProject } from "@/lib/process/role-fallback";
import { formatDate } from "@/lib/utils";

const MILESTONE_LABELS: Record<string, string> = {
  "3mc": "3 miesiące",
  "12mc": "12 miesięcy",
};

type WarrantyReviewDueRow = {
  project_id: string;
  project_name: string;
  client_id: string | null;
  milestone: string;
  due_date: string;
  is_overdue: boolean;
  inspection_exists: boolean;
};

export async function runWarrantyReviewDueNotificationsServer() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("report_warranty_review_due");
  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as WarrantyReviewDueRow[]).filter((row) => !row.inspection_exists);
  if (!rows.length) {
    return { due: 0, notified: 0 };
  }

  let notified = 0;

  for (const row of rows) {
    const sourceId = `warranty_review_due:${row.project_id}:${row.milestone}`;

    const { data: existing } = await supabase
      .from("user_notifications")
      .select("id")
      .eq("source_id", sourceId)
      .limit(1);
    if ((existing ?? []).length > 0) {
      continue;
    }

    const coverage = await resolveRoleFallbackForProject(supabase, row.project_id, "opiekun_projektu");
    if (!coverage) {
      // Brak obsady (nawet po łańcuchu zastępstw) — nie ma komu wysłać. Zgłoszenie zostaje
      // widoczne w report_warranty_review_due() dla każdego, kto tam zajrzy, ale nikogo nie budzi.
      continue;
    }

    const milestoneLabel = MILESTONE_LABELS[row.milestone] ?? row.milestone;
    const linkUrl = row.client_id ? `/przeglady?clientId=${row.client_id}` : "/przeglady";

    const { error: insertError } = await supabase.from("user_notifications").insert({
      id: crypto.randomUUID(),
      profile_id: coverage.userId,
      kind: "warranty_review_due",
      title: `Przegląd ${milestoneLabel} — ${row.project_name}`,
      body: `Minął termin ${formatDate(row.due_date)}. Utwórz przegląd ręcznie w module Przeglądy, tak jak zwykle.`,
      link_url: linkUrl,
      source_id: sourceId,
      created_at: new Date().toISOString(),
    });

    if (!insertError) {
      notified += 1;
    }
  }

  return { due: rows.length, notified };
}
