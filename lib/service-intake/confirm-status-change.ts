import type { ServiceIntakeStatus } from "@/lib/service-intake/types";
import { isServiceIntakeInactive } from "@/lib/service-intake/sla";

const CONFIRM_MESSAGES: Partial<Record<ServiceIntakeStatus, string>> = {
  in_review: "Czy na pewno przyjąć to zgłoszenie do obsługi?",
  closed: "Czy na pewno zamknąć to zgłoszenie?",
  rejected: "Czy na pewno odrzucić to zgłoszenie?",
};

const REOPEN_MESSAGE =
  "Problem wrócił — otworzyć ponownie to zgłoszenie (ten sam numer i wątek)?";

export function confirmServiceIntakeStatusChange(
  status: ServiceIntakeStatus,
  fromStatus?: ServiceIntakeStatus,
): boolean {
  if (fromStatus && isServiceIntakeInactive(fromStatus) && !isServiceIntakeInactive(status)) {
    return window.confirm(REOPEN_MESSAGE);
  }
  const message = CONFIRM_MESSAGES[status];
  if (!message) {
    return true;
  }
  return window.confirm(message);
}
