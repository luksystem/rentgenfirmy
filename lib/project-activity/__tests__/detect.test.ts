import { describe, expect, it } from "vitest";
import { computeDesiredIsActive } from "@/lib/project-activity/detect";

const settings = { activateWithinDays: 30, deactivateAfterDays: 45 };
const now = new Date("2026-07-17T12:00:00.000Z");

function daysAgo(days: number) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

describe("computeDesiredIsActive", () => {
  it("activates when recent activity and currently inactive", () => {
    expect(
      computeDesiredIsActive({
        currentlyActive: false,
        isClosed: false,
        lastActivityAt: daysAgo(10),
        settings,
        now,
      }),
    ).toBe(true);
  });

  it("keeps active when already active with recent activity", () => {
    expect(
      computeDesiredIsActive({
        currentlyActive: true,
        isClosed: false,
        lastActivityAt: daysAgo(10),
        settings,
        now,
      }),
    ).toBeNull();
  });

  it("does not flip in hysteresis band", () => {
    expect(
      computeDesiredIsActive({
        currentlyActive: true,
        isClosed: false,
        lastActivityAt: daysAgo(37),
        settings,
        now,
      }),
    ).toBeNull();
    expect(
      computeDesiredIsActive({
        currentlyActive: false,
        isClosed: false,
        lastActivityAt: daysAgo(37),
        settings,
        now,
      }),
    ).toBeNull();
  });

  it("deactivates after deactivate threshold", () => {
    expect(
      computeDesiredIsActive({
        currentlyActive: true,
        isClosed: false,
        lastActivityAt: daysAgo(50),
        settings,
        now,
      }),
    ).toBe(false);
  });

  it("forces inactive for closed projects", () => {
    expect(
      computeDesiredIsActive({
        currentlyActive: true,
        isClosed: true,
        lastActivityAt: daysAgo(1),
        settings,
        now,
      }),
    ).toBe(false);
  });

  it("deactivates when no activity recorded", () => {
    expect(
      computeDesiredIsActive({
        currentlyActive: true,
        isClosed: false,
        lastActivityAt: null,
        settings,
        now,
      }),
    ).toBe(false);
  });
});
