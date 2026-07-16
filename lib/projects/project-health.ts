import {
  GOAL_DEFERRAL_REASON_LABELS,
  GOAL_STATUS_LABELS,
  type Goal,
  type GoalComment,
  type GoalDeferral,
  type GoalInitiative,
  type GoalUpdateEntry,
} from "@/lib/goals/types";
import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";
import type { ProjectMeetingNote } from "@/lib/dashboard/meeting-note-types";

export const PROJECT_HEALTH_BANDS = ["green", "yellow", "red"] as const;
export type ProjectHealthBand = (typeof PROJECT_HEALTH_BANDS)[number];

export const PROJECT_HEALTH_SENTIMENTS = ["positive", "mixed", "negative"] as const;
export type ProjectHealthSentiment = (typeof PROJECT_HEALTH_SENTIMENTS)[number];

export type ProjectHealthThreadKind =
  | "comment"
  | "update"
  | "deferral"
  | "task"
  | "revisit"
  | "status"
  | "note"
  | "change"
  | "kanban"
  | "kanban_comment";

export type ProjectHealthThreadItem = {
  id: string;
  at: string;
  kind: ProjectHealthThreadKind;
  /** Źródło wpisu (cel, notatka, zmiana, tablica…). */
  goalName: string;
  goalId?: string;
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
  meetingNotesTotal: number;
  meetingNotesPublished: number;
  changesTotal: number;
  changesAccepted: number;
  changesPending: number;
  changesRejected: number;
  kanbanTasksTotal: number;
  kanbanTasksOpen: number;
  kanbanTasksClosed: number;
  kanbanCommentsTotal: number;
  kanbanClientComments: number;
};

export type ProjectHealthKanbanTask = {
  id: string;
  title: string;
  closedAt: string | null;
  createdAt: string;
  boardLabel: string;
  columnTitle: string;
};

export type ProjectHealthKanbanComment = {
  id: string;
  taskId: string;
  taskTitle: string;
  authorName: string;
  authorSide: "team" | "client";
  body: string;
  createdAt: string;
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
  goals: Array<
    Pick<
      Goal,
      | "id"
      | "name"
      | "status"
      | "progressPercent"
      | "periodEnd"
      | "needsRevisit"
      | "deferralCount"
      | "lastDeferralReason"
    >
  >;
  latestSnapshot: ProjectHealthSnapshot | null;
};

export type ProjectHealthOverviewItem = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  score: number;
  band: ProjectHealthBand;
  sentiment: ProjectHealthSentiment;
  signals: ProjectHealthSignals;
  summaryMd: string | null;
  snapshotAt: string | null;
};

export function emptyProjectHealthSignals(): ProjectHealthSignals {
  return {
    goalsTotal: 0,
    goalsActive: 0,
    goalsAtRisk: 0,
    goalsOnHold: 0,
    goalsSettled: 0,
    overdueCount: 0,
    revisitCount: 0,
    deferralCount: 0,
    undeliveredCount: 0,
    tasksTotal: 0,
    tasksDone: 0,
    openTasks: 0,
    commentsSample: 0,
    avgProgress: 50,
    meetingNotesTotal: 0,
    meetingNotesPublished: 0,
    changesTotal: 0,
    changesAccepted: 0,
    changesPending: 0,
    changesRejected: 0,
    kanbanTasksTotal: 0,
    kanbanTasksOpen: 0,
    kanbanTasksClosed: 0,
    kanbanCommentsTotal: 0,
    kanbanClientComments: 0,
  };
}

export function normalizeProjectHealthSignals(raw: unknown): ProjectHealthSignals {
  const base = emptyProjectHealthSignals();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as Array<keyof ProjectHealthSignals>) {
    const value = src[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      base[key] = value;
    }
  }
  return base;
}

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

const NEG_WORDS = [
  "blok",
  "opóźn",
  "ryzyk",
  "problem",
  "kryzys",
  "brak",
  "nie da",
  "niedowiez",
  "zagroż",
  "reklamac",
  "niezadowol",
];
const POS_WORDS = [
  "ok",
  "dobrze",
  "postęp",
  "gotowe",
  "zrobione",
  "sukces",
  "na torze",
  "zamknię",
  "zaakcept",
  "dzięki",
];

function countWordHits(text: string, words: string[]) {
  let count = 0;
  for (const word of words) {
    if (text.includes(word)) count += 1;
  }
  return count;
}

/** Prosty wynik 0–100: cele, notatki u klienta, zmiany, wdrożenie (kanban) i komunikacja. */
export function computeProjectHealthScore(input: {
  goals: Goal[];
  initiatives: GoalInitiative[];
  deferrals: GoalDeferral[];
  comments: GoalComment[];
  updates: GoalUpdateEntry[];
  meetingNotes?: ProjectMeetingNote[];
  changeRequests?: ProjectChangeRequest[];
  kanbanTasks?: ProjectHealthKanbanTask[];
  kanbanComments?: ProjectHealthKanbanComment[];
}): {
  score: number;
  band: ProjectHealthBand;
  sentiment: ProjectHealthSentiment;
  signals: ProjectHealthSignals;
} {
  const goals = input.goals;
  const meetingNotes = input.meetingNotes ?? [];
  const changeRequests = input.changeRequests ?? [];
  const kanbanTasks = input.kanbanTasks ?? [];
  const kanbanComments = input.kanbanComments ?? [];

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

  const publishedNotes = meetingNotes.filter((n) => n.status === "published").length;
  const changesAccepted = changeRequests.filter((c) => c.status === "accepted").length;
  const changesPending = changeRequests.filter((c) => c.status === "pending_client").length;
  const changesRejected = changeRequests.filter((c) => c.status === "rejected").length;
  const kanbanOpen = kanbanTasks.filter((t) => !t.closedAt).length;
  const kanbanClosed = kanbanTasks.length - kanbanOpen;
  const kanbanClientComments = kanbanComments.filter((c) => c.authorSide === "client").length;

  let score = 72;
  score -= atRisk * 12;
  score -= onHold * 8;
  score -= overdue * 10;
  score -= revisit * 6;
  score -= Math.min(24, undelivered * 8);
  score -= Math.min(15, Math.floor(openTasks / 2) * 3);
  score -= Math.min(18, changesPending * 6);
  score -= Math.min(12, changesRejected * 4);
  // Duża liczba zaakceptowanych zmian = churn zakresu
  score -= Math.min(10, Math.max(0, changesAccepted - 2) * 2);
  score -= Math.min(18, Math.floor(kanbanOpen / 3) * 3);
  if (active.length > 0) {
    score += Math.round((avgProgress - 50) / 5);
  }
  if (publishedNotes > 0) score += Math.min(6, publishedNotes);
  else if (goals.length > 0 || kanbanTasks.length > 0) score -= 4;
  if (kanbanClientComments > 0) score += Math.min(5, kanbanClientComments);
  if (settled > 0 && active.length === 0) score = Math.max(score, 85);
  score = Math.max(0, Math.min(100, score));

  const textHints = [
    ...input.comments.map((c) => c.body),
    ...input.updates.map((u) => u.note ?? ""),
    ...meetingNotes.map((n) => `${n.title} ${n.body}`),
    ...changeRequests.map((c) => `${c.title} ${c.body} ${c.clientResponseNote ?? ""}`),
    ...kanbanComments.map((c) => c.body),
  ]
    .join(" ")
    .toLowerCase();

  let neg = countWordHits(textHints, NEG_WORDS);
  let pos = countWordHits(textHints, POS_WORDS);
  neg += atRisk + overdue + undelivered + changesPending + changesRejected;
  pos += Math.floor(tasksDone / 2) + settled + Math.floor(kanbanClosed / 3) + publishedNotes;

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
      meetingNotesTotal: meetingNotes.length,
      meetingNotesPublished: publishedNotes,
      changesTotal: changeRequests.length,
      changesAccepted,
      changesPending,
      changesRejected,
      kanbanTasksTotal: kanbanTasks.length,
      kanbanTasksOpen: kanbanOpen,
      kanbanTasksClosed: kanbanClosed,
      kanbanCommentsTotal: kanbanComments.length,
      kanbanClientComments,
    },
  };
}

export function buildProjectHealthThread(input: {
  goals: Goal[];
  comments: GoalComment[];
  updates: GoalUpdateEntry[];
  deferrals: GoalDeferral[];
  initiatives: GoalInitiative[];
  meetingNotes?: ProjectMeetingNote[];
  changeRequests?: ProjectChangeRequest[];
  kanbanTasks?: ProjectHealthKanbanTask[];
  kanbanComments?: ProjectHealthKanbanComment[];
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

  for (const note of input.meetingNotes ?? []) {
    items.push({
      id: `note:${note.id}`,
      at: note.meetingAt ?? note.updatedAt ?? note.createdAt,
      kind: "note",
      goalName: "Notatka u klienta",
      title: note.status === "published" ? note.title : `${note.title} (szkic)`,
      body: note.body.slice(0, 400),
      tone: note.status === "published" ? "neutral" : "warning",
    });
  }

  for (const change of input.changeRequests ?? []) {
    const tone =
      change.status === "accepted"
        ? "positive"
        : change.status === "rejected" || change.status === "pending_client"
          ? change.status === "rejected"
            ? "critical"
            : "warning"
          : "neutral";
    items.push({
      id: `change:${change.id}`,
      at: change.clientRespondedAt ?? change.submittedAt ?? change.updatedAt,
      kind: "change",
      goalName: "Zmiana projektu",
      title: `${change.title} · ${change.status === "accepted" ? "zaakceptowana" : change.status === "pending_client" ? "czeka na klienta" : change.status === "rejected" ? "odrzucona" : change.status}`,
      body: [change.body, change.clientResponseNote].filter(Boolean).join("\n").slice(0, 400),
      tone,
    });
  }

  for (const task of input.kanbanTasks ?? []) {
    if (task.closedAt) continue;
    items.push({
      id: `kanban:${task.id}`,
      at: task.createdAt,
      kind: "kanban",
      goalName: task.boardLabel,
      title: `Otwarte · ${task.columnTitle}`,
      body: task.title,
      tone: "warning",
    });
  }

  for (const comment of input.kanbanComments ?? []) {
    items.push({
      id: `kanban_comment:${comment.id}`,
      at: comment.createdAt,
      kind: "kanban_comment",
      goalName: comment.taskTitle || "Zadanie wdrożeniowe",
      title: `Komentarz wdrożenia · ${comment.authorName}${comment.authorSide === "client" ? " (klient)" : ""}`,
      body: comment.body,
      tone: comment.authorSide === "client" ? "neutral" : "neutral",
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 100);
}
