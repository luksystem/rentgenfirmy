import type { WorkItemPriority, WorkItemStatus } from "@/lib/my-work/types";

export function mapProcessItemStatus(status: string): WorkItemStatus {
  switch (status) {
    case "open":
      return "pending_ack";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "verified";
    default:
      return "pending_ack";
  }
}

export function mapServiceIntakeStatus(status: string): WorkItemStatus {
  switch (status) {
    case "new":
      return "pending_ack";
    case "in_review":
      return "in_progress";
    case "converted":
      return "verified";
    default:
      return "pending_ack";
  }
}

export function mapServiceIntakePriority(priority: string | null): WorkItemPriority {
  switch (priority) {
    case "c":
      return "urgent";
    case "a":
      return "high";
    case "f":
      return "low";
    case "e":
      return "normal";
    default:
      return "normal";
  }
}

export function mapAgreementStatus(status: string): WorkItemStatus {
  switch (status) {
    case "pending_client":
      return "pending_ack";
    case "accepted":
      return "verified";
    case "rejected":
    case "cancelled":
      return "not_done";
    default:
      return "draft";
  }
}

export function mapInspectionStatus(status: string): WorkItemStatus {
  switch (status) {
    case "preliminary":
      return "planned";
    case "planned":
      return "in_progress";
    case "completed":
      return "pending_verification";
    default:
      return "planned";
  }
}

export function mapResourcePlanStatusName(name: string | null | undefined): WorkItemStatus {
  switch (name) {
    case "Zakończone":
      return "verified";
    case "Wstrzymane":
      return "blocked";
    case "Zagrożone":
      return "risk_reported";
    case "W realizacji":
      return "in_progress";
    default:
      return "planned";
  }
}

export function mapFunctionalityTaskStatus(status: string): WorkItemStatus {
  switch (status) {
    case "todo":
      return "pending_ack";
    case "in_progress":
      return "in_progress";
    case "done":
      return "verified";
    default:
      return "pending_ack";
  }
}

export function mapFunctionalityTaskPriority(priority: string): WorkItemPriority {
  switch (priority) {
    case "must":
      return "urgent";
    case "optional":
      return "low";
    default:
      return "normal";
  }
}
