import { describe, expect, it } from "vitest";
import { computeSuggestedReviewDate } from "@/lib/rot/review-date";

const thresholds = {
  rotReviewBufferDays: 3,
  rotReviewWaitingClientDays: 7,
  rotReviewDefaultIntervalDays: 14,
};

describe("computeSuggestedReviewDate", () => {
  it("uses termin minus buffer when a real deadline exists", () => {
    expect(
      computeSuggestedReviewDate(
        { rotStatus: "CZEKA_NA_ZEWNETRZNE", termin: "2026-08-10", openedAt: "2026-07-01T00:00:00Z" },
        thresholds,
      ),
    ).toBe("2026-08-07");
  });

  it("prefers termin over rotStatus even when W_TOKU", () => {
    expect(
      computeSuggestedReviewDate(
        { rotStatus: "W_TOKU", termin: "2026-08-10", openedAt: "2026-07-01T00:00:00Z" },
        thresholds,
      ),
    ).toBe("2026-08-07");
  });

  it("uses opened_at + waiting-client interval when CZEKA_NA_ZEWNETRZNE without termin", () => {
    expect(
      computeSuggestedReviewDate(
        { rotStatus: "CZEKA_NA_ZEWNETRZNE", termin: null, openedAt: "2026-07-01T00:00:00Z" },
        thresholds,
      ),
    ).toBe("2026-07-08");
  });

  it("uses opened_at + default interval for W_TOKU without termin", () => {
    expect(
      computeSuggestedReviewDate(
        { rotStatus: "W_TOKU", termin: null, openedAt: "2026-07-01T00:00:00Z" },
        thresholds,
      ),
    ).toBe("2026-07-15");
  });

  it("never lands exactly on termin, even with a large buffer", () => {
    const result = computeSuggestedReviewDate(
      { rotStatus: "CZEKA_NA_ZEWNETRZNE", termin: "2026-08-10", openedAt: "2026-07-01T00:00:00Z" },
      { ...thresholds, rotReviewBufferDays: 1 },
    );
    expect(result).not.toBe("2026-08-10");
    expect(result < "2026-08-10").toBe(true);
  });

  it("produces an overdue suggestion when termin already passed, without clamping", () => {
    expect(
      computeSuggestedReviewDate(
        { rotStatus: "CZEKA_NA_ZEWNETRZNE", termin: "2026-01-01", openedAt: "2025-12-01T00:00:00Z" },
        thresholds,
      ),
    ).toBe("2025-12-29");
  });
});
