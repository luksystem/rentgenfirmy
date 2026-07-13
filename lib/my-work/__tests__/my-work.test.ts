import { describe, expect, it } from "vitest";
import {
  canTransitionWorkItemStatus,
  defaultStatusForKanbanColumn,
  kanbanColumnForStatus,
  statusesForKanbanColumn,
} from "@/lib/my-work/state-machine";
import { workItemLogActionLabel } from "@/lib/my-work/display-labels";
import { resolveAgreementSourceLink } from "@/lib/my-work/link-resolver";
import { computeDayPlanSyncChanges } from "@/lib/my-work/plan-sync";
import { itemIsOverdue, itemMatchesListSection, filterWorkItems, groupItemsByListSection } from "@/lib/my-work/section-filters";
import {
  mapAgreementStatus,
  mapFunctionalityTaskPriority,
  mapFunctionalityTaskStatus,
  mapInspectionStatus,
  mapProcessItemStatus,
  mapResourcePlanStatusName,
  mapServiceIntakePriority,
  mapServiceIntakeStatus,
} from "@/lib/my-work/source-adapters/status-mappers";
import { mapWorkItemStatusToPlanStatusName } from "@/lib/my-work/source-adapters/resource-plan-status-sync";
import { findOrphanedWorkItemIds } from "@/lib/my-work/orphan-work-items";
import {
  mapWorkItemStatusToProcessItemStatus,
  shouldMarkProcessItemCompleted,
} from "@/lib/my-work/source-adapters/process-status-sync";
import { resolveEffectiveProcessItemStatus, resolveProcessItemTitle } from "@/lib/supabase/process-work-item-sync-server";
import { normalizeChecklistPayload } from "@/lib/process/item-payload";
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

  it("matches cancelled section only for cancelled items", () => {
    const cancelled = mockItem({ status: "cancelled" });
    const active = mockItem({ status: "in_progress" });
    expect(itemMatchesListSection(cancelled, "cancelled", today)).toBe(true);
    expect(itemMatchesListSection(cancelled, "today", today)).toBe(false);
    expect(itemMatchesListSection(active, "cancelled", today)).toBe(false);
  });

  it("filters items by assigned user", () => {
    const items = [
      mockItem({ id: "a", assignedUserId: "user-1" }),
      mockItem({ id: "b", assignedUserId: "user-2" }),
    ];
    const filtered = filterWorkItems(items, { assignedUserId: "user-2" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("b");
  });

  it("assigns each item to only one list section", () => {
    const monday = new Date("2026-07-13T12:00:00Z");
    const items = [
      mockItem({ id: "week", dueDate: "2026-07-18", status: "in_progress" }),
      mockItem({ id: "overdue", dueDate: "2026-07-11", status: "in_progress" }),
    ];
    const grouped = groupItemsByListSection(items, monday);
    const sectionCounts = [...grouped.values()].flat();
    expect(sectionCounts).toHaveLength(2);
    expect(grouped.get("this_week")?.map((item) => item.id)).toEqual(["week"]);
    expect(grouped.get("overdue")?.map((item) => item.id)).toEqual(["overdue"]);
    expect(grouped.get("in_progress")).toEqual([]);
  });
});

describe("plan sync", () => {
  it("detects removed and added week plan items for a day", () => {
    const changes = computeDayPlanSyncChanges(
      [
        { workItemId: "a", plannedDate: "2026-07-13" },
        { workItemId: "b", plannedDate: "2026-07-13" },
      ],
      [{ workItemId: "a", plannedDate: "2026-07-13" }],
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]?.date).toBe("2026-07-13");
    expect(changes[0]?.removedWorkItemIds).toEqual(["b"]);
    expect(changes[0]?.reconcileToNewIds).toEqual(["a"]);
  });

  it("reconciles day plan when week plan is first sent for today", () => {
    const changes = computeDayPlanSyncChanges(
      [],
      [
        { workItemId: "a", plannedDate: "2026-07-13" },
        { workItemId: "b", plannedDate: "2026-07-13" },
      ],
    );
    expect(changes[0]?.reconcileToNewIds).toEqual(["a", "b"]);
  });
});

describe("display labels", () => {
  it("translates work item log actions to Polish", () => {
    expect(workItemLogActionLabel("comment_added")).toBe("Dodano komentarz");
    expect(workItemLogActionLabel("comment-added")).toBe("Dodano komentarz");
    expect(workItemLogActionLabel("acceptance:accept")).toBe("Przyjęcie: Przyjmuję");
    expect(workItemLogActionLabel("complete:done")).toBe("Podsumowanie: Wykonane");
    expect(workItemLogActionLabel("status:in_progress")).toBe("Zmiana statusu: W realizacji");
  });
});

describe("status mappers", () => {
  it("maps process item statuses", () => {
    expect(mapProcessItemStatus("open")).toBe("pending_ack");
    expect(mapProcessItemStatus("in_progress")).toBe("in_progress");
    expect(mapProcessItemStatus("completed")).toBe("verified");
  });

  it("maps service intake statuses and priorities", () => {
    expect(mapServiceIntakeStatus("new")).toBe("pending_ack");
    expect(mapServiceIntakeStatus("converted")).toBe("verified");
    expect(mapServiceIntakePriority("c")).toBe("urgent");
    expect(mapServiceIntakePriority(null)).toBe("normal");
  });

  it("maps agreement and inspection statuses", () => {
    expect(mapAgreementStatus("accepted")).toBe("verified");
    expect(mapAgreementStatus("rejected")).toBe("not_done");
    expect(mapInspectionStatus("completed")).toBe("pending_verification");
  });

  it("maps resource plan and functionality task statuses", () => {
    expect(mapResourcePlanStatusName("W realizacji")).toBe("in_progress");
    expect(mapResourcePlanStatusName("Planowane")).toBe("pending_ack");
    expect(mapResourcePlanStatusName("Zagrożone")).toBe("risk_reported");
    expect(mapFunctionalityTaskStatus("done")).toBe("verified");
    expect(mapFunctionalityTaskPriority("must")).toBe("urgent");
    expect(mapWorkItemStatusToPlanStatusName("in_progress")).toBe("W realizacji");
    expect(mapWorkItemStatusToPlanStatusName("verified")).toBe("Zakończone");
    expect(mapWorkItemStatusToPlanStatusName("blocked")).toBe("Wstrzymane");
  });
});

describe("dashboard metrics", () => {
  it("aggregates overdue and reaction queues", async () => {
    const { computeMyWorkDashboardMetrics } = await import("@/lib/my-work/dashboard-metrics");
    const metrics = computeMyWorkDashboardMetrics({
      items: [
        mockItem({ id: "1", status: "pending_ack", assignedUserId: "user-1" }),
        mockItem({
          id: "2",
          status: "in_progress",
          dueDate: "2020-01-01",
          assignedUserId: "user-2",
        }),
      ],
      obstacles: [],
      weekPlans: [],
      profilesById: {},
    });
    expect(metrics.totalOpen).toBe(2);
    expect(metrics.overdueCount).toBe(1);
    expect(metrics.pendingAckCount).toBe(1);
  });
});

describe("agreement source links", () => {
  it("builds client dashboard deep link when client and project are known", () => {
    const href = resolveAgreementSourceLink("agr-1", {
      clientId: "client-1",
      projectId: "proj-1",
    });
    expect(href).toBe(
      "/przestrzenie/klient/client-1?project=proj-1&tab=agreements&agreement=agr-1",
    );
  });

  it("falls back to agreements hub without client context", () => {
    expect(resolveAgreementSourceLink("agr-1")).toBe("/tablice-wdrozen/ustalenia");
  });
});

describe("sortWorkItemsStable", () => {
  it("orders by due date then title", async () => {
    const { sortWorkItemsStable } = await import("@/lib/my-work/sort-work-items");
    const sorted = sortWorkItemsStable([
      mockItem({ id: "b", title: "Beta", dueDate: "2026-07-15" }),
      mockItem({ id: "a", title: "Alfa", dueDate: "2026-07-15" }),
      mockItem({ id: "c", title: "Gamma", dueDate: null }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});

describe("orphan work items", () => {
  it("marks work items whose source row was deleted", () => {
    const existing = new Map<string, Set<string>>([
      ["process_item", new Set(["proc-1"])],
    ]);
    const orphanIds = findOrphanedWorkItemIds(
      [
        {
          id: "wi-1",
          sourceType: "process_item",
          sourceId: "proc-1",
          status: "pending_ack",
        },
        {
          id: "wi-2",
          sourceType: "process_item",
          sourceId: "proc-deleted",
          status: "planned",
        },
        {
          id: "wi-3",
          sourceType: "process_item",
          sourceId: "proc-done",
          status: "verified",
        },
      ],
      existing,
    );
    expect(orphanIds).toEqual(["wi-2"]);
  });
});

describe("process ↔ work item sync", () => {
  it("derives completed status from checklist progress", () => {
    const payload = normalizeChecklistPayload({
      sections: [
        {
          id: "s1",
          name: "Sekcja",
          position: 0,
          lines: [{ id: "l1", text: "Krok", checked: true, status: "PASSED" }],
        },
      ],
    });
    const status = resolveEffectiveProcessItemStatus({
      id: "ppi-1",
      project_id: "p1",
      template_item_id: "t1",
      kind: "checklist",
      status: "open",
      assignee_id: "u1",
      payload,
      signed_at: null,
    });
    expect(status).toBe("completed");
  });

  it("maps work item completion back to process completed", () => {
    expect(mapWorkItemStatusToProcessItemStatus("verified")).toBe("completed");
    expect(mapWorkItemStatusToProcessItemStatus("in_progress")).toBe("in_progress");
    expect(shouldMarkProcessItemCompleted("pending_verification")).toBe(true);
  });

  it("uses process element title for work item mirror", () => {
    const titleByTemplate = new Map([["t1", "Lista materiałów"]]);
    expect(resolveProcessItemTitle("t1", titleByTemplate, "checklist")).toBe("Lista materiałów");
    expect(resolveProcessItemTitle("missing", titleByTemplate, "checklist")).toBe(
      "Element procesu (checklist)",
    );
  });
});
