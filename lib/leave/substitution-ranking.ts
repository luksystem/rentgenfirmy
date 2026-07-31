// Faza 13 Krok 1 (docs/role/04 §6.3) — ranking kandydatów na zastępstwo urlopowe.
//
// Filtr (kandydat wchodzi do listy albo nie) jest OSOBNY od sortowania (docs/role/04: "kandydaci =
// spełnia role_competency ∩ nieobecny w oknie? nie"). Sortowanie: znajomość projektu -> poziom
// kompetencji -> właściciel na końcu (ujemna waga, docs/08 D48 zatwierdzone: "proponowany dopiero,
// gdy nikt inny nie przechodzi filtrów" — właściciel ma zejść pod KAŻDEGO innego kandydata, nie
// tylko przegrać remis).
export type SubstitutionCandidateFacts = {
  userId: string;
  userName: string | null;
  familiarityDays: number;
  meetsRequiredCompetency: boolean;
  bestRequiredLevelSortOrder: number | null;
  isAvailable: boolean;
  isWlasciciel: boolean;
};

export type RankedSubstitutionCandidate = SubstitutionCandidateFacts & {
  reasons: string[];
};

function priorityTuple(facts: SubstitutionCandidateFacts): [number, number, number] {
  return [
    facts.isWlasciciel ? 0 : 1,
    facts.familiarityDays,
    facts.bestRequiredLevelSortOrder ?? 0,
  ];
}

function compareTuples(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return b[i] - a[i];
    }
  }
  return 0;
}

function buildReasons(facts: SubstitutionCandidateFacts): string[] {
  const reasons: string[] = [];
  if (facts.familiarityDays > 0) reasons.push(`Znajomość projektu: ${facts.familiarityDays} dni przydziału.`);
  else reasons.push("Bez wcześniejszej historii przydziału na tym projekcie.");
  if (facts.bestRequiredLevelSortOrder !== null) reasons.push("Spełnia wymaganą kompetencję ponad próg.");
  if (facts.isWlasciciel) reasons.push("Właściciel — proponowany dopiero, gdy nikt inny nie przechodzi filtrów.");
  return reasons;
}

/**
 * Filtruje (dostępność ∩ wymagane kompetencje) i sortuje. Pusta lista wynikowa = brak kandydata —
 * wołający eskaluje do właściciela (docs/role/04 §6.2 pkt 5), nie blokuje wniosku.
 */
export function rankSubstitutionCandidates(
  candidates: SubstitutionCandidateFacts[],
): RankedSubstitutionCandidate[] {
  return candidates
    .filter((facts) => facts.isAvailable && facts.meetsRequiredCompetency)
    .map((facts) => ({ ...facts, reasons: buildReasons(facts) }))
    .sort((a, b) => compareTuples(priorityTuple(a), priorityTuple(b)));
}
