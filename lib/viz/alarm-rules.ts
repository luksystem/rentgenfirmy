import type { VizAlarmCondition, VizAlarmEvaluation, VizAlarmSeverity } from "@/lib/viz/project-contact-types";

export function evaluateAlarmCondition(
  value: number,
  threshold: number,
  condition: VizAlarmCondition,
): boolean {
  switch (condition) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    case "eq":
      return value === threshold;
    case "neq":
      return value !== threshold;
    default:
      return false;
  }
}

export function severityRank(severity: VizAlarmSeverity) {
  return severity === "alarm" ? 2 : 1;
}

export function pickWorstAlarmEvaluations(evaluations: VizAlarmEvaluation[]) {
  if (!evaluations.length) {
    return [];
  }

  const maxRank = Math.max(...evaluations.map((item) => severityRank(item.severity)));
  return evaluations.filter((item) => severityRank(item.severity) === maxRank);
}

export function hasActiveAlarm(evaluations: VizAlarmEvaluation[]) {
  return evaluations.some((item) => item.severity === "alarm");
}

export function hasActiveWarning(evaluations: VizAlarmEvaluation[]) {
  return evaluations.some((item) => item.severity === "warning");
}
