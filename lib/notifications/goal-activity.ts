import { getSupabase } from "@/lib/supabase/client";
import type { UserNotificationKind } from "@/lib/notifications/types";

const REVIEW_DUE_WINDOW_DAYS = 2;
const PERIOD_ENDING_WINDOW_DAYS = 3;
const LOW_PROGRESS_GAP_THRESHOLD = 25;

type NotificationInsertRow = {
  id: string;
  profile_id: string;
  kind: UserNotificationKind;
  title: string;
  body: string;
  link_url: string;
  source_id: string;
  created_at: string;
};

function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return (to - from) / (1000 * 60 * 60 * 24);
}

/**
 * Sprawdza aktywne cele i tworzy powiadomienia dla właścicieli (D8, Faza 6):
 * zbliżający się przegląd, koniec okresu, zagrożenie/niski progres. Idempotentne —
 * dedupe przez `source_id`, bezpieczne do wywoływania wielokrotnie (np. przy każdym
 * wejściu do modułu Tablic celów, wzorem `ensureWarrantyExpiringNotifications`).
 */
export async function ensureGoalActivityNotifications(): Promise<void> {
  const supabase = getSupabase();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: goalRows, error: goalError } = await supabase
    .from("goals")
    .select(
      "id, board_id, name, owner_id, status, period_start, period_end, progress_percent",
    )
    .not("status", "in", '("settled","cancelled")')
    .not("owner_id", "is", null);

  if (goalError) {
    if (goalError.message.toLowerCase().includes("does not exist")) return;
    throw new Error(goalError.message);
  }

  const goals = goalRows ?? [];
  if (goals.length === 0) {
    return;
  }

  const goalIds = goals.map((goal) => goal.id);

  const { data: reviewRows, error: reviewError } = await supabase
    .from("goal_reviews")
    .select("id, goal_id, scheduled_at")
    .in("goal_id", goalIds)
    .is("completed_at", null);

  if (reviewError && !reviewError.message.toLowerCase().includes("does not exist")) {
    throw new Error(reviewError.message);
  }

  const candidateSourceIds: string[] = [];
  const pendingRows: Omit<NotificationInsertRow, "id" | "created_at">[] = [];

  for (const review of reviewRows ?? []) {
    const daysUntil = daysBetween(nowIso, review.scheduled_at);
    if (daysUntil > REVIEW_DUE_WINDOW_DAYS) {
      continue;
    }
    const goal = goals.find((entry) => entry.id === review.goal_id);
    if (!goal?.owner_id) {
      continue;
    }
    const sourceId = `goal_review_due:${review.id}`;
    candidateSourceIds.push(sourceId);
    pendingRows.push({
      profile_id: goal.owner_id,
      kind: "goal_review_due",
      title: `Przegląd celu «${goal.name}» ${daysUntil < 0 ? "jest przeterminowany" : "zbliża się"}`,
      body:
        daysUntil < 0
          ? `Zaplanowany przegląd (${review.scheduled_at.slice(0, 10)}) wymaga zamknięcia.`
          : `Zaplanowany przegląd: ${review.scheduled_at.slice(0, 10)}. Przygotuj podsumowanie postępu.`,
      link_url: `/tablice-celow/${goal.board_id}/${goal.id}`,
      source_id: sourceId,
    });
  }

  for (const goal of goals) {
    if (!goal.owner_id) continue;

    const daysUntilEnd = daysBetween(nowIso, goal.period_end);
    if (daysUntilEnd <= PERIOD_ENDING_WINDOW_DAYS && daysUntilEnd >= -PERIOD_ENDING_WINDOW_DAYS) {
      const sourceId = `goal_period_ending:${goal.id}:${goal.period_end}`;
      candidateSourceIds.push(sourceId);
      pendingRows.push({
        profile_id: goal.owner_id,
        kind: "goal_period_ending",
        title: `Okres celu «${goal.name}» ${daysUntilEnd < 0 ? "się zakończył" : "kończy się wkrótce"}`,
        body:
          daysUntilEnd < 0
            ? `Termin (${goal.period_end}) minął — rozlicz cel, jeśli jeszcze nie jest rozliczony.`
            : `Termin: ${goal.period_end}. Sprawdź postęp i przygotuj rozliczenie.`,
        link_url: `/tablice-celow/${goal.board_id}/${goal.id}`,
        source_id: sourceId,
      });
    }

    const isAtRiskStatus = goal.status === "at_risk";
    const totalDays = Math.max(1, daysBetween(goal.period_start, goal.period_end));
    const elapsedDays = Math.max(0, daysBetween(goal.period_start, nowIso));
    const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100);
    const isLowProgress =
      goal.status === "in_progress" &&
      elapsedDays > 1 &&
      expectedProgress - goal.progress_percent >= LOW_PROGRESS_GAP_THRESHOLD;

    if (isAtRiskStatus || isLowProgress) {
      const sourceId = `goal_at_risk:${goal.id}:${goal.status}`;
      candidateSourceIds.push(sourceId);
      pendingRows.push({
        profile_id: goal.owner_id,
        kind: "goal_at_risk",
        title: `Cel «${goal.name}» wymaga uwagi`,
        body: isAtRiskStatus
          ? "Cel oznaczony jako zagrożony — sprawdź plan działania."
          : `Realizacja (${goal.progress_percent}%) znacząco odstaje od tempa oczekiwanego dla upływu czasu okresu (~${Math.round(expectedProgress)}%).`,
        link_url: `/tablice-celow/${goal.board_id}/${goal.id}`,
        source_id: sourceId,
      });
    }
  }

  if (pendingRows.length === 0) {
    return;
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("user_notifications")
    .select("source_id")
    .in("source_id", candidateSourceIds);

  if (existingError) {
    if (existingError.message.toLowerCase().includes("does not exist")) return;
    throw new Error(existingError.message);
  }

  const existingSourceIds = new Set((existingRows ?? []).map((row) => row.source_id));
  const rowsToInsert: NotificationInsertRow[] = pendingRows
    .filter((row) => !existingSourceIds.has(row.source_id))
    .map((row) => ({ ...row, id: crypto.randomUUID(), created_at: nowIso }));

  if (rowsToInsert.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("user_notifications").insert(rowsToInsert);
  if (insertError) {
    if (insertError.message.toLowerCase().includes("does not exist")) return;
    if (insertError.message.toLowerCase().includes("user_notifications_kind_check")) return;
    throw new Error(insertError.message);
  }
}
