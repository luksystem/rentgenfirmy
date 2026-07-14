import { describe, expect, it } from "vitest";
import {
  evaluateAlarmCondition,
  hasActiveAlarm,
  pickWorstAlarmEvaluations,
} from "@/lib/viz/alarm-rules";

describe("evaluateAlarmCondition", () => {
  it("evaluates gt correctly", () => {
    expect(evaluateAlarmCondition(25, 24, "gt")).toBe(true);
    expect(evaluateAlarmCondition(24, 24, "gt")).toBe(false);
  });

  it("evaluates lte correctly", () => {
    expect(evaluateAlarmCondition(18, 19, "lte")).toBe(true);
  });
});

describe("pickWorstAlarmEvaluations", () => {
  it("prefers alarm severity over warning", () => {
    const picked = pickWorstAlarmEvaluations([
      {
        ruleId: "1",
        ruleName: "Warn",
        severity: "warning",
        roleCode: "store_temperature",
        numericValue: 25,
        thresholdNumeric: 24,
        condition: "gt",
      },
      {
        ruleId: "2",
        ruleName: "Alarm",
        severity: "alarm",
        roleCode: "store_temperature",
        numericValue: 30,
        thresholdNumeric: 28,
        condition: "gt",
      },
    ]);

    expect(picked).toHaveLength(1);
    expect(picked[0]?.severity).toBe("alarm");
    expect(hasActiveAlarm(picked)).toBe(true);
  });
});
