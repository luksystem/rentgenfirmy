import type { BoardTaskOwner } from "@/lib/supabase/task-from-source-repository";

/**
 * D43 — stan „kto będzie właścicielem tego zadania”, wyliczany przed jego utworzeniem.
 *
 * Funkcja istnieje osobno, bo to maszyna stanów, a nie formatowanie: pięć wyników, z których
 * każdy naprawia się gdzie indziej, i każdy musi wyglądać inaczej w UI. Trzymanie tego w JSX-ie
 * sprawiało, że nie dało się tego przetestować, a różnice między „brak obsady” a „tablica poza
 * etapem” są dokładnie tym, co łatwo zlać w jeden komunikat i stracić.
 *
 * Ważne: żaden ze stanów nie blokuje utworzenia zadania. Dziura w obsadzie jest problemem
 * projektu, nie tej karty, i widać ją w widoku procesu.
 */
export type TaskOwnerState =
  | { kind: "pending_board" }
  | { kind: "assigned"; name: string; roleName: string | null }
  | { kind: "fallback"; name: string; roleName: string | null }
  | { kind: "no_staffing"; roleName: string | null }
  | { kind: "no_stage" };

export function resolveTaskOwnerState(input: {
  /** Czy tablica jest już zmaterializowana. Bez niej etapu nie ma jak rozwiązać. */
  hasBoard: boolean;
  owner: BoardTaskOwner | null;
}): TaskOwnerState {
  if (!input.hasBoard) {
    return { kind: "pending_board" };
  }

  const owner = input.owner;
  // Brak wiersza traktujemy jak brak etapu, a nie jak błąd — funkcja SQL zwraca wiersz dla każdej
  // tablicy, więc null oznacza, że tablicy nie udało się rozwiązać w ogóle.
  if (!owner || !owner.stageId) {
    return { kind: "no_stage" };
  }

  if (!owner.responsibleUserId || !owner.responsibleName) {
    return { kind: "no_staffing", roleName: owner.roleName };
  }

  return {
    kind: owner.slotSource === "fallback" ? "fallback" : "assigned",
    name: owner.responsibleName,
    roleName: owner.roleName,
  };
}
