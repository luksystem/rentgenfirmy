import type {
  CreateTimeEntryInput,
  TimeCategory,
  TimeEntryCreatedFrom,
  TimeEntryType,
} from "@/lib/time-tracking/types";
import { TIME_ENTRY_WORK_CAUSES_BY_NATURE } from "@/lib/time-tracking/types";

/**
 * createdFrom domyślnie "manual" — wpisy tworzone automatycznie (plan/timer/misja/urlop/import)
 * nie przechodzą przez interaktywny formularz, więc nie wymuszamy tu wyboru rodzaju pracy.
 */
export function validateTimeEntryInput(
  input: CreateTimeEntryInput,
  category: TimeCategory,
  entryType: TimeEntryType,
  createdFrom: TimeEntryCreatedFrom = "manual",
): string | null {
  if (!input.date) {
    return "Data pracy jest wymagana.";
  }
  if (!input.categoryId) {
    return "Wybierz kategorię.";
  }
  if (!input.entryTypeId) {
    return "Wybierz typ wpisu.";
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return "Czas musi być większy od zera.";
  }
  if (input.breakMinutes != null && input.breakMinutes < 0) {
    return "Przerwa nie może być ujemna.";
  }

  const needsProject = category.requiresProject || entryType.requiresProject;
  if (needsProject && !input.projectId && !input.serviceId) {
    return "Dla tej kategorii wybierz projekt lub zgłoszenie serwisowe.";
  }

  const needsDescription = entryType.requiresDescription;
  if (needsDescription && !input.description?.trim()) {
    return "Opis pracy jest wymagany dla tego typu wpisu.";
  }

  if (entryType.countsAsWork && createdFrom === "manual" && !input.workNature) {
    return "Wybierz rodzaj pracy (nowa praca / poprawka / nieplanowane kończenie / zmiana zakresu).";
  }

  if (input.workNature && input.workNature !== "new_work" && !input.workCause) {
    return "Wybierz przyczynę — wymagana dla każdego rodzaju pracy innego niż „Nowa praca”.";
  }

  if (
    input.workNature &&
    input.workNature !== "new_work" &&
    input.workCause &&
    !TIME_ENTRY_WORK_CAUSES_BY_NATURE[input.workNature].includes(input.workCause)
  ) {
    return "Wybrana przyczyna nie pasuje do rodzaju pracy.";
  }

  if (input.billable && !entryType.allowsBillable) {
    return "Ten typ wpisu nie może być oznaczony jako do rozliczenia.";
  }

  return null;
}
