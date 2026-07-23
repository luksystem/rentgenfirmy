import { isChannelEnabled, isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { buildEmailShell } from "@/lib/email/layout";
import { sendTransactionalEmail } from "@/lib/email/send";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";
import { sendPushToUser } from "@/lib/push/send-push";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";

const ACTION_ID = "goal_review_due" as const;
const REVIEW_DUE_WINDOW_DAYS = 2;

type ReviewDueCandidate = {
  ownerId: string;
  goalName: string;
  reviewStatusLabel: string;
  reviewDetail: string;
  linkUrl: string;
  sourceId: string;
};

function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return (to - from) / (1000 * 60 * 60 * 24);
}

function isBoardReviewDueToday(input: {
  frequency: string;
  weekday: number | null;
  todayWeekday: number;
  todayDayOfMonth: number;
}) {
  switch (input.frequency) {
    case "daily":
      return true;
    case "weekly":
      return input.weekday == null || input.weekday === input.todayWeekday;
    case "monthly":
      return input.todayDayOfMonth === 1;
    case "quarterly": {
      const month = new Date().getMonth();
      return input.todayDayOfMonth === 1 && month % 3 === 0;
    }
    case "annual":
      return input.todayDayOfMonth === 1 && new Date().getMonth() === 0;
    default:
      return false;
  }
}

/**
 * Serwerowy port fragmentu ensureGoalActivityNotifications ograniczony do `goal_review_due`
 * (jedyny typ z tej rodziny obecny w tabeli ustawień powiadomień) — dodaje realny push/e-mail
 * obok dzwonka, którego oryginalny (kliencki) plik nadal tworzy przy każdym wejściu w moduł.
 */
export async function runGoalReviewDuePushServer() {
  const supabase = getSupabaseAdmin();
  const settings = await fetchEmailSettingsServer();

  const pushEnabled = isChannelEnabled(settings.routing, ACTION_ID, "push");
  const emailEnabled = isEmailAudienceEnabled(settings.routing, ACTION_ID, "user");

  if (!pushEnabled && !emailEnabled) {
    return { candidates: 0, notified: 0 };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const candidates: ReviewDueCandidate[] = [];

  const { data: goalRows, error: goalError } = await supabase
    .from("goals")
    .select("id, board_id, name, owner_id, status, period_start, period_end, progress_percent")
    .not("status", "in", '("settled","cancelled")')
    .not("owner_id", "is", null);

  if (goalError && !goalError.message.toLowerCase().includes("does not exist")) {
    throw new Error(goalError.message);
  }

  const goals = goalRows ?? [];
  if (goals.length) {
    const goalIds = goals.map((goal) => goal.id);
    const { data: reviewRows, error: reviewError } = await supabase
      .from("goal_reviews")
      .select("id, goal_id, scheduled_at")
      .in("goal_id", goalIds)
      .is("completed_at", null);

    if (reviewError && !reviewError.message.toLowerCase().includes("does not exist")) {
      throw new Error(reviewError.message);
    }

    for (const review of reviewRows ?? []) {
      const daysUntil = daysBetween(nowIso, review.scheduled_at);
      if (daysUntil > REVIEW_DUE_WINDOW_DAYS) {
        continue;
      }
      const goal = goals.find((entry) => entry.id === review.goal_id);
      if (!goal?.owner_id) {
        continue;
      }
      candidates.push({
        ownerId: goal.owner_id,
        goalName: goal.name,
        reviewStatusLabel: daysUntil < 0 ? "Przegląd przeterminowany" : "Przegląd zbliża się",
        reviewDetail:
          daysUntil < 0
            ? `Zaplanowany przegląd (${review.scheduled_at.slice(0, 10)}) wymaga zamknięcia.`
            : `Zaplanowany przegląd: ${review.scheduled_at.slice(0, 10)}. Przygotuj podsumowanie postępu.`,
        linkUrl: `/tablice-celow/${goal.board_id}/${goal.id}`,
        sourceId: `goal_review_due:${review.id}`,
      });
    }
  }

  try {
    const { data: boardRows } = await supabase
      .from("goal_boards")
      .select("id, name, review_frequency, review_weekday, review_responsible_id, review_notify")
      .eq("review_notify", true)
      .not("review_frequency", "is", null)
      .not("review_responsible_id", "is", null);

    const todayKey = now.toISOString().slice(0, 10);
    const weekday = now.getDay();

    for (const board of boardRows ?? []) {
      if (!board.review_responsible_id || !board.review_frequency) continue;
      const dueToday = isBoardReviewDueToday({
        frequency: board.review_frequency,
        weekday: board.review_weekday,
        todayWeekday: weekday,
        todayDayOfMonth: now.getDate(),
      });
      if (!dueToday) continue;

      candidates.push({
        ownerId: board.review_responsible_id,
        goalName: board.name,
        reviewStatusLabel: "Dziś przegląd tablicy",
        reviewDetail: "Zaplanowany przegląd celów na tej tablicy — uruchom Przegląd celów.",
        linkUrl: `/tablice-celow/przeglad?boardId=${board.id}`,
        sourceId: `goal_board_review_due:${board.id}:${todayKey}`,
      });
    }
  } catch {
    // Kolumny harmonogramu mogą jeszcze nie istnieć przed migracją 145 — pomiń
  }

  if (!candidates.length) {
    return { candidates: 0, notified: 0 };
  }

  const { data: existingRows } = await supabase
    .from("user_notifications")
    .select("source_id")
    .in(
      "source_id",
      candidates.map((c) => c.sourceId),
    );
  const existingSourceIds = new Set((existingRows ?? []).map((row) => row.source_id as string));
  const pending = candidates.filter((c) => !existingSourceIds.has(c.sourceId));

  if (!pending.length) {
    return { candidates: candidates.length, notified: 0 };
  }

  const now2 = new Date().toISOString();
  const rowsToInsert = pending.map((c) => ({
    id: crypto.randomUUID(),
    profile_id: c.ownerId,
    kind: "goal_review_due" as const,
    title: `Przegląd celu «${c.goalName}»`,
    body: c.reviewDetail,
    link_url: c.linkUrl,
    source_id: c.sourceId,
    created_at: now2,
  }));

  const { error: insertError } = await supabase.from("user_notifications").insert(rowsToInsert);
  if (insertError && !insertError.message.toLowerCase().includes("user_notifications_kind_check")) {
    console.warn("[goal-review-due] user_notifications insert:", insertError.message);
  }

  const template = settings.templates[ACTION_ID];
  const company = emailEnabled ? await resolveCompanyProfileDocumentServer().catch(() => null) : null;

  for (const candidate of pending) {
    const variables: Record<string, string> = {
      goal_name: candidate.goalName,
      review_status_label: candidate.reviewStatusLabel,
      review_detail: candidate.reviewDetail,
    };

    if (pushEnabled) {
      try {
        await sendPushToUser(candidate.ownerId, {
          title: renderEmailSubject(template.pushTitle, variables) || template.label,
          body: template.pushBody.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "").trim(),
          url: candidate.linkUrl,
          tag: candidate.sourceId,
        });
      } catch {
        // Brak VAPID / subskrypcji — pomijamy.
      }
    }

    if (emailEnabled) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", candidate.ownerId)
        .maybeSingle();
      const email = (profileRow?.email as string | undefined)?.trim();
      if (email) {
        try {
          await sendTransactionalEmail({
            to: email,
            subject: renderEmailSubject(template.subject, variables),
            html: buildEmailShell({
              content: renderEmailTemplateString(template.body, variables),
              eyebrow: template.eyebrow,
              disclaimer: template.disclaimer,
              brand: settings.brand,
              company,
            }),
          });
        } catch (emailError) {
          console.warn("[goal-review-due] email failed:", emailError);
        }
      }
    }
  }

  return { candidates: candidates.length, notified: pending.length };
}
