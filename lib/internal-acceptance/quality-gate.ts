import type {
  InternalAcceptanceItemState,
  InternalAcceptanceQualitySummary,
} from "@/lib/internal-acceptance/types";

export function computeInternalAcceptanceSummary(
  items: InternalAcceptanceItemState[],
): InternalAcceptanceQualitySummary {
  const total = items.length;
  const passed = items.filter((item) => item.status === "PASSED").length;
  const failed = items.filter((item) => item.status === "FAILED").length;
  const inProgress = items.filter((item) => item.status === "IN_PROGRESS").length;
  const notStarted = items.filter((item) => item.status === "NOT_STARTED").length;
  const notApplicable = items.filter((item) => item.status === "NOT_APPLICABLE").length;

  const mandatoryItems = items.filter((item) => item.mandatory);
  const mandatoryTotal = mandatoryItems.length;
  const mandatoryPassed = mandatoryItems.filter((item) => item.status === "PASSED").length;
  const criticalFailed = items.filter(
    (item) => item.priority === "critical" && item.status === "FAILED",
  ).length;
  const optionalSkipped = items.filter(
    (item) => !item.mandatory && item.status === "NOT_APPLICABLE",
  ).length;

  const actionableMandatory = mandatoryItems.filter((item) => item.status !== "NOT_APPLICABLE");
  const percentComplete =
    actionableMandatory.length > 0
      ? Math.round((mandatoryPassed / actionableMandatory.length) * 100)
      : total > 0
        ? Math.round((passed / total) * 100)
        : 0;

  const blockers: string[] = [];

  if (criticalFailed > 0) {
    blockers.push(`${criticalFailed} błędów krytycznych`);
  }

  const openMandatory = mandatoryItems.filter(
    (item) => item.status !== "PASSED" && item.status !== "NOT_APPLICABLE",
  );
  if (openMandatory.length > 0) {
    blockers.push(`${openMandatory.length} obowiązkowych punktów nieukończonych`);
  }

  const failedWithoutFix = items.filter(
    (item) =>
      item.status === "FAILED" &&
      (!item.failureReason?.trim() || !item.fixDeadline || !item.fixAssignee?.trim()),
  );
  if (failedWithoutFix.length > 0) {
    blockers.push(`${failedWithoutFix.length} błędów bez opisu / terminu / osoby`);
  }

  const hasBackup = items.some(
    (item) => item.id === "doc-backup" && item.status === "PASSED",
  );
  const hasDocComplete = items.some(
    (item) => item.id === "doc-complete" && item.status === "PASSED",
  );
  const hasUserTest = items.some(
    (item) => item.id === "app-user-test" && item.status === "PASSED",
  );

  if (!hasBackup) blockers.push("Brak potwierdzonego backupu");
  if (!hasDocComplete) blockers.push("Dokumentacja niekompletna");
  if (!hasUserTest) blockers.push("Test użytkownika niezakończony");

  const readyForClientHandover =
    blockers.length === 0 &&
    mandatoryPassed === actionableMandatory.length &&
    criticalFailed === 0;

  return {
    total,
    passed,
    failed,
    inProgress,
    notStarted,
    notApplicable,
    mandatoryTotal,
    mandatoryPassed,
    criticalFailed,
    optionalSkipped,
    percentComplete,
    readyForClientHandover,
    blockers,
  };
}
