import { describe, expect, it } from "vitest";
import {
  canTransitionWorkItemStatus,
  defaultStatusForKanbanColumn,
  kanbanColumnForStatus,
  statusesForKanbanColumn,
} from "@/lib/my-work/state-machine";
import { itemIsOverdue, itemMatchesListSection } from "@/lib/my-work/section-filters";
import type { WorkItemView } from "@/lib/my-work/types";

function mockItem(overrides: Partial<WorkItemView>): WorkItemView {
  return {
    id: "test-id",
    sourceType: "manual",
    sourceId: null,
    projectId: null,
    clientId: null,
    processStageId: null,
    assignedUserId: "user-1",
    createdById: null,
    managerId: null,
    parentWorkItemId: null,
    title: "Test",
    description: "",
    expectedResult: "",
    completionCriteria: "",
    requiredMaterials: "",
    requiredInfo: "",
    dependencies: [],
    plannedStart: null,
    plannedEnd: null,
    dueDate: null,
    estimatedMinutes: null,
    priority: "normal",
    status: "in_progress",
    blockedReason: "",
    sentAt: null,
    lastAcceptanceAt: null,
    acceptedWithoutReservations: false,
    completedAt: null,
    verifiedAt: null,
    verifiedById: null,
    aiGenerated: false,
    aiSuggestionReason: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    supportingUserIds: [],
    sourceTypeMeta: null,
    projectName: null,
    clientName: null,
    stageTitle: null,
    managerName: null,
    assignedUserName: null,
    commentCount: 0,
    unreadCommentCount: 0,
    sourceLinkUrl: null,
    myWorkLinkUrl: "/moja-praca/zadania?item=test-id",
    isSupporting: false,
    ...overrides,
  };
}

describe("state-machine", () => {
  it("allows draft to pending_ack", () => {
    expect(canTransitionWorkItemStatus("draft", "pending_ack")).toBe(true);
  });

  it("blocks verified to in_progress", () => {
    expect(canTransitionWorkItemStatus("verified", "in_progress")).toBe(false);
  });

  it("maps pending_ack status to kanban column", () => {
    expect(kanbanColumnForStatus("pending_ack")).toBe("pending_ack");
    expect(kanbanColumnForStatus("in_progress")).toBe("in_progress");
  });

  it("returns default status for kanban column", () => {
    expect(defaultStatusForKanbanColumn("accepted")).toBe("accepted");
    expect(statusesForKanbanColumn("blocked")).toEqual(["blocked"]);
  });
});

describe("section-filters", () => {
  const today = new Date("2026-07-12T12:00:00Z");

  it("matches today section", () => {
    const item = mockItem({ dueDate: "2026-07-12", status: "in_progress" });
    expect(itemMatchesListSection(item, "today", today)).toBe(true);
  });

  it("detects overdue items", () => {
    const item = mockItem({ dueDate: "2026-07-01", status: "in_progress" });
    expect(itemIsOverdue(item, today)).toBe(true);
  });

  it("matches pending_ack section", () => {
    const item = mockItem({ status: "pending_ack" });
    expect(itemMatchesListSection(item, "pending_ack", today)).toBe(true);
  });

  it("matches in_progress section without due date", () => {
    const item = mockItem({ status: "in_progress", dueDate: null });
    expect(itemMatchesListSection(item, "in_progress", today)).toBe(true);
    expect(itemMatchesListSection(item, "today", today)).toBe(false);
  });

  it("matches accepted status in in_progress section", () => {
    const item = mockItem({ status: "accepted", dueDate: "2026-12-01" });
    expect(itemMatchesListSection(item, "in_progress", today)).toBe(true);
  });

  it("matches pending_verification section for managers only", () => {
    const item = mockItem({ status: "pending_verification" });
    expect(itemMatchesListSection(item, "pending_verification", today)).toBe(false);
    expect(
      itemMatchesListSection(item, "pending_verification", today, { showVerificationSection: true }),
    ).toBe(true);
    expect(itemMatchesListSection(item, "in_progress", today)).toBe(false);
  });
});
