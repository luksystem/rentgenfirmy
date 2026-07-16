import {
  GOAL_DEFERRAL_REASON_LABELS,
  GOAL_STATUS_LABELS,
  type Goal,
  type GoalComment,
  type GoalDeferral,
  type GoalInitiative,
  type GoalUpdateEntry,
} from "@/lib/goals/types";

export const PROJECT_HEALTH_BANDS = ["green", "yellow", "red"] as const;
export type ProjectHealthBand = (typeof PROJECT_HEALTH_BANDS)[number];

export const PROJECT_HEALTH_SENTIMENTS = ["positive", "mixed", "negative"] as const;
export type ProjectHealthSentiment = (typeof PROJECT_HEALTH_SENTIMENTS)[number];

export type ProjectHealthThreadItem = {
  id: string;
  at: string;
  kind: "comment" | "update" | "deferral" | "task" | "revisit" | "status";
  goalId: string;
  goalName: string;
  title: string;
  body: string;
  tone: "neutral" | "positive" | "warning" | "critical";
};

export type ProjectHealthSignals = {
  goalsTotal: number;
  goalsActive: number;
  goalsAtRisk: number;
  goalsOnHold: number;
  goalsSettled: number;
  overdueCount: number;
  revisitCount: number;
  deferralCount: number;
  undeliveredCount: number;
  tasksTotal: number;
  tasksDone: number;
  openTasks: number;
  commentsSample: number;
  avgProgress: number;
};

export type ProjectHealthSnapshot = {
  id: string;
  projectId: string;
  score: number;
  band: ProjectHealthBand;
  sentiment: ProjectHealthSentiment;
  summaryMd: string;
  signals: ProjectHealthSignals;
  stageTitle: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type ProjectHealthBundle = {
  projectId: string;
  projectName: string;
  stageTitle: string | null;
  processProgressPercent: number | null;
  score: number;
  band: ProjectHealthBand;
  sentiment: ProjectHealthSentiment;
  signals: ProjectHealthSignals;
  thread: ProjectHealthThreadItem[];
  goals: Array<Pick<Goal, "id" | "name" | "status" | "progressPercent" | "periodEnd" | "needsRevisit" | "deferralCount" | "lastDeferralReason">>;
  latestSnapshot: ProjectHealthSnapshot | null;
};

export function bandFromScore(score: number): ProjectHealthBand {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

export const PROJECT_HEALTH_BAND_LABELS: Record<ProjectHealthBand, string> = {
  green: "Stabilny",
  yellow: "Wymaga uwagi",
  red: "Zagrożony",
};

export const PROJECT_HEALTH_SENTIMENT_LABELS: Record<ProjectHealthSentiment, string> = {
  positive: "Nastrój pozytywny",
  mixed: "Nastrój mieszany",
  negative: "Nastrój negatywny",
};

/** Prosty wynik 0–100 na podstawie celów / zadań / przełożeń (bez AI). */
export function computeProjectHealthScore(input: {
  goals: Goal[];
  initiatives: GoalInitiative[];
  deferrals: GoalDeferral[];
  comments: GoalComment[];
  updates: GoalUpdateEntry[];
}): { score: number; band: ProjectHealthBand; sentiment: ProjectHealthSentiment; signals: ProjectHealthSignals } {
  const goals = input.goals;
  const active = goals.filter((g) => !["settled", "cancelled"].includes(g.status));
  const atRisk = active.filter((g) => g.status === "at_risk").length;
  const onHold = active.filter((g) => g.status === "on_hold").length;
  const settled = goals.filter((g) => g.status === "settled").length;
  const overdue = active.filter((g) => new Date(g.periodEnd).getTime() < Date.now()).length;
  const revisit = active.filter((g) => g.needsRevisit).length;
  const deferralTotal = goals.reduce((sum, g) => sum + (g.deferralCount ?? 0), 0);
  const undelivered = input.deferrals.filter((d) => d.markedUndelivered || d.reason === "internal").length;
  const tasks = input.initiatives.filter((i) => i.kind === "task");
  const tasksDone = tasks.filter((t) => t.completedAt).length;
  const openTasks = tasks.length - tasksDone;
  const avgProgress =
    active.length === 0
      ? settled > 0
        ? 100
        : 50
      : Math.round(active.reduce((sum, g) => sum + g.progressPercent, 0) / active.length);

  let score = 72;
  score -= atRisk * 12;
  score -= onHold * 8;
  score -= overdue * 10;
  score -= revisit * 6;
  score -= Math.min(24, undelivered * 8);
  score -= Math.min(15, Math.floor(openTasks / 2) * 3);
  if (active.length > 0) {
    score += Math.round((avgProgress - 50) / 5);
  }
  if (settled > 0 && active.length === 0) score = Math.max(score, 85);
  score = Math.max(0, Math.min(100, score));

  const negativeHints = [
    ...input.comments.map((c) => c.body),
    ...input.updates.map((u) => u.note ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  const negWords = ["blok", "opóźn", "ryzyk", "problem", "kryzys", "brak", "nie da", "niedowiez", "zagroż"];
  const posWords = ["ok", "dobrze", "postęp", "gotowe", "zrobione", "sukces", "na torze", "zamknię"];
  let neg = 0;
  let pos = 0;
  for (const w of negWords) if (negativeHints.includes(w)) neg += 1;
  for (const w of posWords) if (negativeHints.includes(w)) pos += 1;
  neg += atRisk + overdue + undelivered;
  pos += Math.floor(tasksDone / 2) + settled;

  let sentiment: ProjectHealthSentiment = "mixed";
  if (neg >= pos + 2) sentiment = "negative";
  else if (pos >= neg + 2) sentiment = "positive";

  return {
    score,
    band: bandFromScore(score),
    sentiment,
    signals: {
      goalsTotal: goals.length,
      goalsActive: active.length,
      goalsAtRisk: atRisk,
      goalsOnHold: onHold,
      goalsSettled: settled,
      overdueCount: overdue,
      revisitCount: revisit,
      deferralCount: deferralTotal,
      undeliveredCount: undelivered,
      tasksTotal: tasks.length,
      tasksDone,
      openTasks,
      commentsSample: input.comments.length,
      avgProgress,
    },
  };
}

export function buildProjectHealthThread(input: {
  goals: Goal[];
  comments: GoalComment[];
  updates: GoalUpdateEntry[];
  deferrals: GoalDeferral[];
  initiatives: GoalInitiative[];
}): ProjectHealthThreadItem[] {
  const goalName = new Map(input.goals.map((g) => [g.id, g.name] as const));
  const items: ProjectHealthThreadItem[] = [];

  for (const comment of input.comments) {
    items.push({
      id: `comment:${comment.id}`,
      at: comment.createdAt,
      kind: "comment",
      goalId: comment.goalId,
      goalName: goalName.get(comment.goalId) ?? "Cel",
      title: `Komentarz · ${comment.authorName}`,
      body: comment.body,
      tone: "neutral",
    });
  }

  for (const update of input.updates) {
    if (!update.note?.trim() && update.previousStatus === update.newStatus) continue;
    const statusBit =
      update.previousStatus && update.newStatus && update.previousStatus !== update.newStatus
        ? `${GOAL_STATUS_LABELS[update.previousStatus]} → ${GOAL_STATUS_LABELS[update.newStatus]}`
        : null;
    items.push({
      id: `update:${update.id}`,
      at: update.createdAt,
      kind: update.note?.toLowerCase().includes("przełoż") ? "deferral" : "update",
      goalId: update.goalId,
      goalName: goalName.get(update.goalId) ?? "Cel",
      title: statusBit ?? "Wniosek / zmiana",
      body: update.note?.trim() || statusBit || "Aktualizacja celu",
      tone: update.note?.toLowerCase().includes("niedowiez")
        ? "critical"
        : update.note?.toLowerCase().includes("wrócić")
          ? "warning"
          : "neutral",
    });
  }

  for (const deferral of input.deferrals) {
    items.push({
      id: `deferral:${deferral.id}`,
      at: deferral.createdAt,
      kind: "deferral",
      goalId: deferral.goalId,
      goalName: goalName.get(deferral.goalId) ?? "Cel",
      title: GOAL_DEFERRAL_REASON_LABELS[deferral.reason],
      body: [
        `Okres ${deferral.previousPeriodStart}–${deferral.previousPeriodEnd} → ${deferral.newPeriodStart}–${deferral.newPeriodEnd}`,
        deferral.note,
      ]
        .filter(Boolean)
        .join(". "),
      tone: deferral.markedUndelivered || deferral.reason === "internal" ? "critical" : "warning",
    });
  }

  for (const task of input.initiatives.filter((i) => i.kind === "task")) {
    items.push({
      id: `task:${task.id}`,
      at: task.completedAt ?? task.createdAt,
      kind: "task",
      goalId: task.goalId,
      goalName: goalName.get(task.goalId) ?? "Cel",
      title: task.completedAt ? "Zadanie zrobione" : "Zadanie otwarte",
      body: task.title,
      tone: task.completedAt ? "positive" : "warning",
    });
  }

  for (const goal of input.goals) {
    if (!goal.needsRevisit) continue;
    items.push({
      id: `revisit:${goal.id}`,
      at: goal.updatedAt,
      kind: "revisit",
      goalId: goal.id,
      goalName: goal.name,
      title: "Trzeba wrócić",
      body: goal.revisitAt ? `Data powrotu: ${goal.revisitAt}` : "Bez daty powrotu",
      tone: "warning",
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 80);
}
