// Faza 13 Krok 1 (docs/role/04 §6.1) — wyzwalacz walidacji zastępstwa, per slot trzymany przez
// wnioskującego. Trzy warunki (OR): urlop > 2 dni robocze (globalny, obejmuje WSZYSTKIE sloty),
// brama komunikacyjna INTENSYWNA/KRYTYCZNA (per projekt), nachodzenie na kamień milowy odpowiedzialności
// roli (per slot). "Poniżej progu — brak walidacji" (docs/role/04): jeśli żaden warunek nie zachodzi
// dla ŻADNEGO slotu, wniosek idzie dzisiejszą ścieżką bez zmian.
export type SubstitutionSlotFacts = {
  projectId: string;
  projectName: string;
  roleCode: string;
  gateRegime: string;
  milestoneOverlap: boolean;
};

const HIGH_URGENCY_REGIMES = new Set(["INTENSYWNA", "KRYTYCZNA"]);

/**
 * Zwraca podzbiór slotów wymagających planowania zastępstwa. `workingDaysOverThreshold` = urlop
 * > 2 dni robocze — gdy true, KAŻDY trzymany slot wchodzi do listy niezależnie od bramy/kamieni,
 * bo próg czasowy w §6.1 nie jest warunkiem per-slot.
 */
export function resolveSubstitutionTriggeredSlots(
  workingDaysOverThreshold: boolean,
  slots: SubstitutionSlotFacts[],
): SubstitutionSlotFacts[] {
  if (workingDaysOverThreshold) {
    return slots;
  }
  return slots.filter(
    (slot) => HIGH_URGENCY_REGIMES.has(slot.gateRegime) || slot.milestoneOverlap,
  );
}
