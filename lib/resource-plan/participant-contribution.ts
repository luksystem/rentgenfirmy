// Rozszerzenie modułu Plan Zasobów — % zaangażowania osoby zaangażowanej (poza osobą
// odpowiedzialną). Semantyka (Wariant C, wybrany świadomie przez koordynatora — patrz
// ARCHITEKTURA.md §D23):
//
//   godziny uczestnika = godziny elementu × (involvementPercent / 100)
//
// Uczestnik może mieć własny (węższy) zakres dat w ramach zakresu elementu — np. element
// trwa cały tydzień, a uczestnik jest zaangażowany tylko 2 dni. Gdy w Gantcie
// przeciąga/skraca się suwakiem WŁASNY zakres uczestnika, `involvementPercent` przelicza
// się automatycznie proporcjonalnie do zmiany długości okresu (krótszy zakres = mniejszy
// %, z tego samego "poola" godzin elementu) — patrz `recalcInvolvementPercentAfterRangeChange`.

export type ParticipantRangeLike = {
  involvementPercent: number;
  startAt: string | null;
  endAt: string | null;
};

export type ItemRangeLike = {
  startAt: string;
  endAt: string;
  plannedHours: number | null;
};

function hoursBetweenIso(startAt: string, endAt: string): number {
  return Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3_600_000);
}

/** Zakres dat uczestnika — jego własny (jeśli ustawiony), inaczej cały zakres elementu. */
export function participantEffectiveRange(
  item: Pick<ItemRangeLike, "startAt" | "endAt">,
  participant: Pick<ParticipantRangeLike, "startAt" | "endAt">,
): { startAt: string; endAt: string } {
  return {
    startAt: participant.startAt ?? item.startAt,
    endAt: participant.endAt ?? item.endAt,
  };
}

/** Godziny elementu — planowane, albo (gdy nie podano) długość zakresu w godzinach. */
export function itemTotalHours(item: ItemRangeLike): number {
  return item.plannedHours ?? hoursBetweenIso(item.startAt, item.endAt);
}

/** Godziny wynikające z % zaangażowania uczestnika względem godzin całego elementu. */
export function participantContributedHours(item: ItemRangeLike, participant: ParticipantRangeLike): number {
  return (itemTotalHours(item) * participant.involvementPercent) / 100;
}

/**
 * Godziny konkretnej osoby w danym elemencie planu — pełne godziny elementu, jeśli to osoba
 * odpowiedzialna, albo godziny wyliczone z % zaangażowania, jeśli to osoba zaangażowana.
 * Jeśli dana osoba jest jednocześnie odpowiedzialna i zaangażowana, liczymy ją raz (pełne
 * godziny elementu — % w takim wypadku traktujemy jako nadmiarowy wpis konfiguracyjny).
 */
export function userHoursInItem<
  T extends ItemRangeLike & { assigneeId: string | null; participants: (ParticipantRangeLike & { userId: string })[] },
>(item: T, userId: string): number {
  if (item.assigneeId === userId) return itemTotalHours(item);
  const participant = item.participants.find((p) => p.userId === userId);
  if (!participant) return 0;
  return participantContributedHours(item, participant);
}

/** Efektywny zakres dat konkretnej osoby w elemencie (do wykrywania konfliktów terminów) —
 *  osoba odpowiedzialna = cały zakres elementu, uczestnik = jego własny (węższy) zakres. */
export function userEffectiveRangeInItem<
  T extends ItemRangeLike & { assigneeId: string | null; participants: (ParticipantRangeLike & { userId: string })[] },
>(item: T, userId: string): { startAt: string; endAt: string } | null {
  if (item.assigneeId === userId) return { startAt: item.startAt, endAt: item.endAt };
  const participant = item.participants.find((p) => p.userId === userId);
  if (!participant) return null;
  return participantEffectiveRange(item, participant);
}

const MIN_PERCENT = 1;
const MAX_PERCENT = 100;

/**
 * Przelicza % zaangażowania po zmianie własnego zakresu dat uczestnika (np. suwakiem w
 * Gantcie) — zachowuje proporcję: skrócenie obszaru o połowę = połowa poprzedniego %,
 * bo te same godziny "poola" elementu rozkładają się teraz na mniej dni.
 */
export function recalcInvolvementPercentAfterRangeChange(params: {
  oldStartAt: string;
  oldEndAt: string;
  newStartAt: string;
  newEndAt: string;
  oldPercent: number;
}): number {
  const oldDurationMs = new Date(params.oldEndAt).getTime() - new Date(params.oldStartAt).getTime();
  const newDurationMs = new Date(params.newEndAt).getTime() - new Date(params.newStartAt).getTime();
  if (oldDurationMs <= 0) return params.oldPercent;
  const ratio = newDurationMs / oldDurationMs;
  const next = Math.round(params.oldPercent * ratio);
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, next));
}

/** Przycina własny zakres dat uczestnika, żeby zawsze był podzbiorem zakresu elementu
 *  (np. po skróceniu dat elementu w panelu edycji). Uczestnicy bez własnego zakresu
 *  (`null`/`null`) są nietknięci — dziedziczą zakres elementu automatycznie. */
export function clampParticipantRangeToItem<T extends ParticipantRangeLike>(
  item: Pick<ItemRangeLike, "startAt" | "endAt">,
  participant: T,
): T {
  if (!participant.startAt && !participant.endAt) return participant;
  const itemStartMs = new Date(item.startAt).getTime();
  const itemEndMs = new Date(item.endAt).getTime();
  let startMs = participant.startAt ? new Date(participant.startAt).getTime() : itemStartMs;
  let endMs = participant.endAt ? new Date(participant.endAt).getTime() : itemEndMs;
  startMs = Math.min(Math.max(startMs, itemStartMs), itemEndMs);
  endMs = Math.min(Math.max(endMs, itemStartMs), itemEndMs);
  if (endMs < startMs) endMs = startMs;
  return { ...participant, startAt: new Date(startMs).toISOString(), endAt: new Date(endMs).toISOString() };
}
