import { HttpError } from "@/lib/auth/http-error";
import {
  hasFullAppAccess,
  isAdministratorRole,
  type UserRole,
} from "@/lib/auth/types";
import type { ServiceIntakeStatus } from "@/lib/service-intake/types";

/** Dozwolone przejścia etapu dla instalatora / ról bez pełnego dostępu (dedykowane CTA). */
const WORKER_STATUS_TRANSITIONS: Partial<
  Record<ServiceIntakeStatus, readonly ServiceIntakeStatus[]>
> = {
  new: ["in_review"],
  in_review: ["converted"],
  converted: ["closed"],
};

export function canManageServiceIntakeBoard(role: UserRole | null | undefined) {
  return role ? hasFullAppAccess(role) : false;
}

/** Trwałe usuwanie zgłoszenia — tylko administrator, na każdym etapie. */
export function canDeleteServiceIntake(role: UserRole | null | undefined) {
  return role ? isAdministratorRole(role) : false;
}

export function isServiceIntakeWorkerTransitionAllowed(
  from: ServiceIntakeStatus,
  to: ServiceIntakeStatus,
) {
  return WORKER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertServiceIntakeStatusChangeAllowed(input: {
  role: UserRole;
  from: ServiceIntakeStatus;
  to: ServiceIntakeStatus;
}) {
  if (canManageServiceIntakeBoard(input.role)) {
    return;
  }
  if (!isServiceIntakeWorkerTransitionAllowed(input.from, input.to)) {
    throw new HttpError(
      403,
      "Brak uprawnień do tej zmiany etapu. Użyj przycisku Przyjmij / Rozlicz / Zamknij.",
    );
  }
}

export function serviceIntakePrimaryAction(
  status: ServiceIntakeStatus,
): { nextStatus: ServiceIntakeStatus; label: string; hint: string } | null {
  if (status === "new") {
    return {
      nextStatus: "in_review",
      label: "Przyjmij",
      hint: "Przejmij obsługę — dopiero potem zgłoszenie jest w realizacji",
    };
  }
  if (status === "in_review") {
    return {
      nextStatus: "converted",
      label: "Rozlicz",
      hint: "Przenieś do rozliczania po wykonaniu prac",
    };
  }
  if (status === "converted") {
    return {
      nextStatus: "closed",
      label: "Zamknij",
      hint: "Zakończ zgłoszenie po rozliczeniu",
    };
  }
  return null;
}
