import { describe, expect, it } from "vitest";
import {
  buildVizServiceSlaItem,
  contractSlaDueAt,
  resolveEffectiveSlaDueAt,
  resolveVizSlaStatus,
  sortVizServiceSlaItems,
} from "@/lib/viz/service-sla";

const NOW = new Date("2026-07-14T12:00:00.000Z").getTime();

describe("service-sla", () => {
  it("computes contract SLA deadline from createdAt", () => {
    const due = contractSlaDueAt("2026-07-14T08:00:00.000Z", 4);
    expect(due).toBe("2026-07-14T12:00:00.000Z");
  });

  it("picks earlier deadline between intake and contract SLA", () => {
    const effective = resolveEffectiveSlaDueAt({
      createdAt: "2026-07-14T08:00:00.000Z",
      dueAt: "2026-07-14T11:00:00.000Z",
      priority: "a",
      contractSlaHours: 8,
    });
    expect(effective).toBe("2026-07-14T11:00:00.000Z");
  });

  it("marks overdue when past effective deadline", () => {
    const status = resolveVizSlaStatus({
      createdAt: "2026-07-13T08:00:00.000Z",
      dueAt: "2026-07-14T10:00:00.000Z",
      priority: "c",
      status: "new",
      contractSlaHours: null,
      now: NOW,
    });
    expect(status).toBe("overdue");
  });

  it("marks approaching when less than 25% window remains", () => {
    const status = resolveVizSlaStatus({
      createdAt: "2026-07-14T08:00:00.000Z",
      dueAt: "2026-07-14T12:30:00.000Z",
      priority: "c",
      status: "in_review",
      contractSlaHours: null,
      now: NOW,
    });
    expect(status).toBe("approaching");
  });

  it("sorts overdue items first", () => {
    const items = sortVizServiceSlaItems([
      buildVizServiceSlaItem(
        {
          id: "1",
          referenceNumber: "A",
          status: "new",
          priority: "f",
          projectId: "p1",
          description: "ok",
          createdAt: "2026-07-14T10:00:00.000Z",
          dueAt: "2026-07-20T10:00:00.000Z",
        },
        { projectLabel: "DOM", contract: { contractSlaHours: null, contractName: null }, now: NOW },
      ),
      buildVizServiceSlaItem(
        {
          id: "2",
          referenceNumber: "B",
          status: "new",
          priority: "c",
          projectId: "p2",
          description: "late",
          createdAt: "2026-07-13T08:00:00.000Z",
          dueAt: "2026-07-14T10:00:00.000Z",
        },
        { projectLabel: "Kingi", contract: { contractSlaHours: null, contractName: null }, now: NOW },
      ),
    ]);

    expect(items[0]?.referenceNumber).toBe("B");
    expect(items[0]?.slaStatus).toBe("overdue");
  });
});
