import { describe, expect, it } from "vitest";
import { resolveTaskOwnerState } from "@/lib/process/task-owner-state";
import type { BoardTaskOwner } from "@/lib/supabase/task-from-source-repository";

function owner(patch: Partial<BoardTaskOwner> = {}): BoardTaskOwner {
  return {
    boardId: "board-1",
    projectId: "project-1",
    stageId: "stage-1",
    stageTitle: "Etap 7 – Dostawa rozdzielni",
    roleCode: "koordynator_techniczny",
    roleName: "Koordynator Techniczny",
    responsibleUserId: "user-1",
    responsibleName: "Łukasz Pietrzak",
    slotSource: "obsada",
    ...patch,
  };
}

describe("resolveTaskOwnerState", () => {
  it("bez tablicy nie zgaduje właściciela — etapu nie ma jak rozwiązać", () => {
    expect(resolveTaskOwnerState({ hasBoard: false, owner: null })).toEqual({
      kind: "pending_board",
    });
  });

  it("brak tablicy wygrywa nawet wtedy, gdy właściciel jest znany z poprzedniego wyboru", () => {
    expect(resolveTaskOwnerState({ hasBoard: false, owner: owner() })).toEqual({
      kind: "pending_board",
    });
  });

  it("slot obsadzony wprost daje konkretną osobę", () => {
    expect(resolveTaskOwnerState({ hasBoard: true, owner: owner() })).toEqual({
      kind: "assigned",
      name: "Łukasz Pietrzak",
      roleName: "Koordynator Techniczny",
    });
  });

  it("slot pokryty łańcuchem zastępstw jest oznaczony osobno, nie jako zwykła obsada", () => {
    expect(
      resolveTaskOwnerState({ hasBoard: true, owner: owner({ slotSource: "fallback" }) }),
    ).toEqual({
      kind: "fallback",
      name: "Łukasz Pietrzak",
      roleName: "Koordynator Techniczny",
    });
  });

  it("rola bez obsady to inny stan niż tablica bez etapu — naprawia się je gdzie indziej", () => {
    expect(
      resolveTaskOwnerState({
        hasBoard: true,
        owner: owner({ responsibleUserId: null, responsibleName: null }),
      }),
    ).toEqual({ kind: "no_staffing", roleName: "Koordynator Techniczny" });
  });

  it("tablica poza etapem (2 z 13 na produkcji) nie udaje braku obsady", () => {
    expect(
      resolveTaskOwnerState({
        hasBoard: true,
        owner: owner({
          stageId: null,
          stageTitle: null,
          roleCode: null,
          roleName: null,
          responsibleUserId: null,
          responsibleName: null,
          slotSource: null,
        }),
      }),
    ).toEqual({ kind: "no_stage" });
  });

  it("brak wiersza z funkcji SQL czytamy jak brak etapu, nie jak błąd", () => {
    expect(resolveTaskOwnerState({ hasBoard: true, owner: null })).toEqual({ kind: "no_stage" });
  });

  it("etap bez roli oznaczonej jako główna daje brak obsady bez nazwy roli", () => {
    expect(
      resolveTaskOwnerState({
        hasBoard: true,
        owner: owner({ roleCode: null, roleName: null, responsibleUserId: null, responsibleName: null }),
      }),
    ).toEqual({ kind: "no_staffing", roleName: null });
  });

  it("osoba bez nazwiska w profilu nie jest pokazywana jako obsadzona", () => {
    // responsible_name jest nullif(btrim(...)) — pusty profil daje null mimo istniejącego user_id.
    expect(
      resolveTaskOwnerState({ hasBoard: true, owner: owner({ responsibleName: null }) }),
    ).toEqual({ kind: "no_staffing", roleName: "Koordynator Techniczny" });
  });
});
