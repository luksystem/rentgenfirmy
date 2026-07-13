import {
  WORK_ITEM_ACCEPTANCE_ACTION_LABELS,
  WORK_ITEM_COMPLETE_OUTCOME_LABELS,
  WORK_ITEM_STATUS_LABELS,
  type WorkItemAcceptanceAction,
  type WorkItemCompleteOutcome,
  type WorkItemStatus,
} from "@/lib/my-work/types";

export function workItemProjectLabel(projectName: string | null | undefined) {
  const trimmed = projectName?.trim();
  return trimmed || "Bez projektu";
}

export const WORK_ITEM_LOG_ACTION_LABELS: Record<string, string> = {
  created: "Utworzono zadanie",
  created_and_sent: "Utworzono i wysłano do pracownika",
  updated: "Zaktualizowano zadanie",
  cancelled: "Anulowano zadanie",
  sent: "Wysłano do pracownika",
  verified: "Zweryfikowano wykonanie",
  comment_added: "Dodano komentarz",
  takeover_requested: "Wysłano prośbę o przejęcie",
};

function isWorkItemAcceptanceAction(value: string): value is WorkItemAcceptanceAction {
  return value in WORK_ITEM_ACCEPTANCE_ACTION_LABELS;
}

function isWorkItemCompleteOutcome(value: string): value is WorkItemCompleteOutcome {
  return value in WORK_ITEM_COMPLETE_OUTCOME_LABELS;
}

function isWorkItemStatus(value: string): value is WorkItemStatus {
  return value in WORK_ITEM_STATUS_LABELS;
}

export function workItemLogActionLabel(action: string) {
  const normalized = action.trim().replace(/-/g, "_");
  const direct = WORK_ITEM_LOG_ACTION_LABELS[normalized];
  if (direct) {
    return direct;
  }

  const [prefix, value] = normalized.split(":", 2);
  if (!value) {
    return normalized.replace(/_/g, " ");
  }

  if (prefix === "acceptance" && isWorkItemAcceptanceAction(value)) {
    return `Przyjęcie: ${WORK_ITEM_ACCEPTANCE_ACTION_LABELS[value]}`;
  }
  if (prefix === "complete" && isWorkItemCompleteOutcome(value)) {
    return `Podsumowanie: ${WORK_ITEM_COMPLETE_OUTCOME_LABELS[value]}`;
  }
  if (prefix === "status" && isWorkItemStatus(value)) {
    return `Zmiana statusu: ${WORK_ITEM_STATUS_LABELS[value]}`;
  }

  return normalized.replace(/_/g, " ");
}
