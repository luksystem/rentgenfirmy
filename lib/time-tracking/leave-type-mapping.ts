export type LeaveTimeEntryTypeCode = "leave" | "sick";

/** Typy wyjazdów służbowych nie generują wpisów nieobecności w ewidencji. */
export function resolveLeaveEntryTypeCode(leaveTypeName: string): LeaveTimeEntryTypeCode | null {
  const normalized = leaveTypeName.toLowerCase();

  if (normalized.includes("delegac") || normalized.includes("wyjazd s")) {
    return null;
  }
  if (
    normalized.includes("zwolnienie") ||
    normalized.includes("lekarsk") ||
    normalized.includes("l4") ||
    normalized.includes("chorob")
  ) {
    return "sick";
  }
  return "leave";
}

export function shouldSyncLeaveToTimeEntries(leaveTypeName: string): boolean {
  return resolveLeaveEntryTypeCode(leaveTypeName) !== null;
}
