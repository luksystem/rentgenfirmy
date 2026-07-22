import { hasFullAppAccess, isAdministratorRole, type UserRole } from "@/lib/auth/types";

/** Dowolny manager/administrator może ocenić dowolnego pracownika (jak akceptacja timesheetów/zadań). */
export function canRateEmployee(role: UserRole): boolean {
  return hasFullAppAccess(role);
}

/** Raport AI, wgląd w kolejkę zespołu i decyzja kompensacyjna — wyłącznie administrator. */
export function canDecideCompensation(role: UserRole): boolean {
  return isAdministratorRole(role);
}
