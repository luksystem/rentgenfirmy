import type { ServiceIntakeStatus } from "@/lib/service-intake/types";
import { isServiceIntakeInactive } from "@/lib/service-intake/sla";

const CONFIRM_MESSAGES: Partial<Record<ServiceIntakeStatus, string>> = {
  in_review: "Czy na pewno przyjąć to zgłoszenie do obsługi?",
  closed: "Czy na pewno zamknąć to zgłoszenie?",
  rejected: "Czy na pewno odrzucić to zgłoszenie?",
};

const REOPEN_MESSAGE =
  "Problem wrócił — otworzyć ponownie to zgłoszenie (ten sam numer i wątek)?";

const TAKEOVER_MESSAGE = (assigneeName: string | null | undefined) =>
  `To zgłoszenie obsługuje ${assigneeName?.trim() || "inna osoba"}. Przejąć odpowiedzialność?`;

export function confirmServiceIntakeStatusChange(
  status: ServiceIntakeStatus,
  fromStatus?: ServiceIntakeStatus,
): boolean {
  if (fromStatus && isServiceIntakeInactive(fromStatus) && !isServiceIntakeInactive(status)) {
    return window.confirm(REOPEN_MESSAGE);
  }
  // Rozlicz / Utknięte — osobne formularze (bramki).
  if (status === "converted" || status === "stuck") {
    return true;
  }
  const message = CONFIRM_MESSAGES[status];
  if (!message) {
    return true;
  }
  return window.confirm(message);
}

/** Potwierdzenie przejęcia, gdy Przyjmij/Wznów robi ktoś inny niż obecny assignee. */
export function confirmServiceIntakeTakeover(input: {
  currentUserId: string | null | undefined;
  assigneeId: string | null | undefined;
  assigneeName: string | null | undefined;
}): boolean {
  const assigneeId = input.assigneeId?.trim();
  const currentUserId = input.currentUserId?.trim();
  if (!assigneeId || !currentUserId || assigneeId === currentUserId) {
    return true;
  }
  return window.confirm(TAKEOVER_MESSAGE(input.assigneeName));
}
