// Kolejność ma znaczenie w UI (legenda, przyciski wyboru statusu) — od "jeszcze nic" przez
// ścieżkę happy-path, na wyjątkach kończąc.
export const SWITCHBOARD_CIRCUIT_STATUSES = [
  "nie_ruszone",
  "przygotowane_do_podlaczenia",
  "podlaczone",
  "podlaczone_i_sprawdzone",
  "wymaga_uwagi",
  "problem",
] as const;

export type SwitchboardCircuitStatus = (typeof SWITCHBOARD_CIRCUIT_STATUSES)[number];

export const SWITCHBOARD_CIRCUIT_STATUS_LABELS: Record<SwitchboardCircuitStatus, string> = {
  nie_ruszone: "Nie ruszone",
  przygotowane_do_podlaczenia: "Przygotowane do podłączenia",
  podlaczone: "Podłączone",
  podlaczone_i_sprawdzone: "Podłączone i sprawdzone",
  wymaga_uwagi: "Wymaga uwagi",
  problem: "Problem",
};

// Odznaka statusu (obrys/tło/tekst) — sześć wizualnie odróżnialnych kolorów, zgodnie ze
// specyfikacją: szary/żółty/jasnozielony/ciemnozielony/jasnoczerwony/ciemnoczerwony.
export const SWITCHBOARD_CIRCUIT_STATUS_BADGE_CLASS: Record<SwitchboardCircuitStatus, string> = {
  nie_ruszone: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  przygotowane_do_podlaczenia: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  podlaczone: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  podlaczone_i_sprawdzone: "border-emerald-700/60 bg-emerald-700/25 text-emerald-300",
  wymaga_uwagi: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  problem: "border-rose-800/60 bg-rose-800/30 text-rose-300",
};

// Pełne kolory (bez przezroczystości) do segmentów paska postępu i kropek legendy.
export const SWITCHBOARD_CIRCUIT_STATUS_DOT_CLASS: Record<SwitchboardCircuitStatus, string> = {
  nie_ruszone: "bg-slate-500",
  przygotowane_do_podlaczenia: "bg-amber-500",
  podlaczone: "bg-emerald-400",
  podlaczone_i_sprawdzone: "bg-emerald-700",
  wymaga_uwagi: "bg-rose-400",
  problem: "bg-rose-800",
};

/** Statusy, dla których warto zaproponować zgłoszenie do biura (D44). */
export function switchboardCircuitNeedsReport(status: SwitchboardCircuitStatus): boolean {
  return status === "wymaga_uwagi" || status === "problem";
}

// Niebieski — inny niż wszystkie sześć kolorów statusu montażu, żeby "ogarnięte/zgłoszone" było
// jednoznacznie odróżnialne. W przeciwieństwie do checklisty PRZYKRYWA kolor statusu: dla instalatora
// sprawa jest zamknięta (zrobił swoje, przekazał dalej), decyzję co dalej podejmuje manager przy
// zamykaniu etapu.
export const SWITCHBOARD_HANDLED_BADGE_CLASS = "border-blue-500/40 bg-blue-500/10 text-blue-200";
export const SWITCHBOARD_HANDLED_DOT_CLASS = "bg-blue-400";

/** "Podłączone" to świadome podłączenie w rozdzielni — brakuje tylko sprawdzenia na obiekcie, więc
 *  do liczników postępu liczy się tak samo jak "podłączone i sprawdzone". */
export function switchboardStatusCountsAsDone(status: SwitchboardCircuitStatus): boolean {
  return status === "podlaczone" || status === "podlaczone_i_sprawdzone";
}

/** Instalator przekazał sprawę dalej (zgłosił do biura albo ręcznie ogarnął) — z jego perspektywy
 *  pozycja jest zamknięta, niezależnie od statusu montażu. Manager decyduje co dalej przy zamykaniu
 *  etapu. */
export function switchboardCircuitIsHandled(
  circuit: Pick<SwitchboardCircuit, "handledAt" | "employeeReportId">,
): boolean {
  return Boolean(circuit.handledAt) || Boolean(circuit.employeeReportId);
}

export type Switchboard = {
  id: string;
  projectId: string;
  name: string;
  position: number;
  lastImportedAt: string | null;
  completedAt: string | null;
  completedById: string | null;
  completedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SwitchboardCircuit = {
  id: string;
  switchboardId: string;
  projectId: string;
  rowIndex: number;
  mergeKey: string;
  sectionName: string | null;
  zugNo: string | null;
  zugSubNo: string | null;
  circuitNo: string | null;
  breakerType: string | null;
  breakerNo: string | null;
  rcdNo: string | null;
  slotNo: string | null;
  connectorType: string | null;
  circuitDescription: string | null;
  location: string | null;
  detail1: string | null;
  detail2: string | null;
  detail3: string | null;
  status: SwitchboardCircuitStatus;
  note: string | null;
  isStale: boolean;
  source: "import" | "manual";
  employeeReportTarget: "agreement" | "change_request" | null;
  employeeReportId: string | null;
  updatedById: string | null;
  updatedByName: string | null;
  /** "Ogarnięte" — niezależne od statusu montażu; ustawiane po zgłoszeniu do biura/zapotrzebowania. */
  handledAt: string | null;
  handledById: string | null;
  handledByName: string | null;
  handledNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SwitchboardCircuitHistoryEntry = {
  id: string;
  circuitId: string;
  previousStatus: SwitchboardCircuitStatus | null;
  newStatus: SwitchboardCircuitStatus;
  note: string | null;
  changedById: string | null;
  changedByName: string | null;
  changedAt: string;
};

/** Krótka etykieta pozycji do listy/kart — "Z2.4" albo, dla pozycji bez zuga, nr zabezpieczenia. */
export function switchboardCircuitLabel(circuit: Pick<SwitchboardCircuit, "zugSubNo" | "zugNo" | "breakerNo">) {
  return circuit.zugSubNo || circuit.zugNo || circuit.breakerNo || "—";
}

export function buildSwitchboardCircuitReportDescription(
  switchboardName: string,
  circuit: Pick<SwitchboardCircuit, "zugNo" | "zugSubNo" | "circuitDescription" | "location" | "note">,
) {
  const zug = [circuit.zugNo, circuit.zugSubNo].filter(Boolean).join(" / ");
  const parts = [
    `Rozdzielnica ${switchboardName}`,
    zug ? `Zug ${zug}` : null,
    circuit.circuitDescription,
    circuit.location ? `(${circuit.location})` : null,
  ].filter(Boolean);
  const header = parts.join(", ");
  return circuit.note ? `${header}: ${circuit.note}` : header;
}

/** "BRAK ZUGA" i puste D nie tworzą grupy — to pojedyncze pozycje wpięte bezpośrednio do modułu. */
function isGroupableZug(zugNo: string | null): zugNo is string {
  return zugNo !== null && zugNo.trim().toUpperCase() !== "BRAK ZUGA";
}

export type SwitchboardSectionEntry =
  | { kind: "zug"; zugNo: string; circuits: SwitchboardCircuit[] }
  | { kind: "loose"; circuit: SwitchboardCircuit };

export type SwitchboardSectionGroup = {
  sectionName: string | null;
  entries: SwitchboardSectionEntry[];
};

/**
 * Grupuje pozycje dwupoziomowo: sekcja (kolejność pierwszego wystąpienia) → grupa Zug w obrębie
 * sekcji (też kolejność pierwszego wystąpienia). Pozycje bez zuga trafiają jako osobne wpisy
 * "loose", przeplatane w oryginalnej kolejności wierszy z arkusza — bez sztucznego grupowania.
 */
export function groupSwitchboardCircuitsBySection(
  circuits: SwitchboardCircuit[],
): SwitchboardSectionGroup[] {
  const sections: SwitchboardSectionGroup[] = [];
  const sectionIndexByName = new Map<string | null, number>();
  const zugEntryIndexByKey = new Map<string, number>();

  for (const circuit of circuits) {
    let sectionIndex = sectionIndexByName.get(circuit.sectionName);
    if (sectionIndex === undefined) {
      sectionIndex = sections.length;
      sections.push({ sectionName: circuit.sectionName, entries: [] });
      sectionIndexByName.set(circuit.sectionName, sectionIndex);
    }
    const section = sections[sectionIndex];

    if (isGroupableZug(circuit.zugNo)) {
      const key = `${sectionIndex}::${circuit.zugNo}`;
      let entryIndex = zugEntryIndexByKey.get(key);
      if (entryIndex === undefined) {
        entryIndex = section.entries.length;
        section.entries.push({ kind: "zug", zugNo: circuit.zugNo, circuits: [] });
        zugEntryIndexByKey.set(key, entryIndex);
      }
      const entry = section.entries[entryIndex];
      if (entry.kind === "zug") entry.circuits.push(circuit);
    } else {
      section.entries.push({ kind: "loose", circuit });
    }
  }

  return sections;
}

/** Licznik "gotowe/łącznie" do nagłówka zwiniętej grupy Zug — "gotowe" liczy też pozycje
 *  ogarnięte/zgłoszone, nie tylko fizycznie podłączone i sprawdzone. */
export function switchboardGroupDoneSummary(circuits: SwitchboardCircuit[]) {
  const total = circuits.length;
  const done = circuits.filter(
    (c) => switchboardStatusCountsAsDone(c.status) || switchboardCircuitIsHandled(c),
  ).length;
  return { total, done };
}

export type SwitchboardProgress = {
  total: number;
  counts: Record<SwitchboardCircuitStatus, number>;
  /** Podłączone (i sprawdzone) LUB ogarnięte/zgłoszone — instalator zamknął sprawę. */
  doneCount: number;
  doneRatio: number;
};

export function buildSwitchboardProgress(circuits: SwitchboardCircuit[]): SwitchboardProgress {
  const counts = Object.fromEntries(
    SWITCHBOARD_CIRCUIT_STATUSES.map((status) => [status, 0]),
  ) as Record<SwitchboardCircuitStatus, number>;
  for (const circuit of circuits) counts[circuit.status] += 1;
  const total = circuits.length;
  const doneCount = circuits.filter(
    (circuit) => switchboardStatusCountsAsDone(circuit.status) || switchboardCircuitIsHandled(circuit),
  ).length;
  return {
    total,
    counts,
    doneCount,
    doneRatio: total > 0 ? doneCount / total : 0,
  };
}
