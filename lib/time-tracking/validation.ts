import type { CreateTimeEntryInput, TimeCategory, TimeEntryType } from "@/lib/time-tracking/types";

export function validateTimeEntryInput(
  input: CreateTimeEntryInput,
  category: TimeCategory,
  entryType: TimeEntryType,
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

  if (input.billable && !entryType.allowsBillable) {
    return "Ten typ wpisu nie może być oznaczony jako do rozliczenia.";
  }

  return null;
}
