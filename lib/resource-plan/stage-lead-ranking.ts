// D46 — ranking kandydatów na lidera etapu.
//
// Pięć sygnałów z ustaleń właściciela, w JAWNIE ustalonej kolejności priorytetu: przydzielony na
// ten etap -> zna projekt -> spełnia kompetencję -> dostępny -> ciągłość z poprzedniego etapu.
//
// Świadomie ranking LEKSYKOGRAFICZNY (krotka pięciu boole'i), nie ważona suma punktów. Suma
// punktów mogłaby dać wynik, w którym kompetencja przebija przydzielenie do etapu — a właściciel
// podał kolejność wprost, "pierwszy priorytet bije drugi", nie "każdy priorytet dokłada punkty".
export type StageLeadCandidateFacts = {
  userId: string;
  userName: string | null;
  assignedToStage: boolean;
  knownProject: boolean;
  meetsCompetency: boolean;
  isAvailable: boolean;
  continuityFromPreviousStage: boolean;
};

export type RankedStageLeadCandidate = StageLeadCandidateFacts & {
  /** Wyjaśnienie rankingu, do pokazania pod kandydatem — ten sam wzorzec co suggestions.ts. */
  reasons: string[];
};

function priorityTuple(facts: StageLeadCandidateFacts): [number, number, number, number, number] {
  return [
    facts.assignedToStage ? 1 : 0,
    facts.knownProject ? 1 : 0,
    facts.meetsCompetency ? 1 : 0,
    facts.isAvailable ? 1 : 0,
    facts.continuityFromPreviousStage ? 1 : 0,
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

function buildReasons(facts: StageLeadCandidateFacts): string[] {
  const reasons: string[] = [];
  if (facts.assignedToStage) reasons.push("Już przydzielony(a) do tego etapu w Planie Zasobów.");
  if (facts.knownProject) reasons.push("Pracował(a) już przy tym projekcie.");
  if (facts.meetsCompetency) reasons.push("Spełnia wymagane kompetencje etapu.");
  else reasons.push("Nie spełnia wszystkich wymaganych kompetencji etapu.");
  if (!facts.isAvailable) reasons.push("Niedostępny(a) — urlop albo wyłączenie z planowania.");
  if (facts.continuityFromPreviousStage) reasons.push("Prowadził(a) poprzedni etap na tym projekcie — ciągłość.");
  return reasons;
}

/** Ranking bez limitu — wołający decyduje, ile pokazać (dziś: cała lista w pickerze). */
export function rankStageLeadCandidates(
  candidates: StageLeadCandidateFacts[],
): RankedStageLeadCandidate[] {
  return candidates
    .map((facts) => ({ ...facts, reasons: buildReasons(facts) }))
    .sort((a, b) => compareTuples(priorityTuple(a), priorityTuple(b)));
}
