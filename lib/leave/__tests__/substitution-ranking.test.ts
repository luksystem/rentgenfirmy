import { describe, expect, it } from "vitest";
import {
  rankSubstitutionCandidates,
  type SubstitutionCandidateFacts,
} from "@/lib/leave/substitution-ranking";

function facts(id: string, patch: Partial<SubstitutionCandidateFacts> = {}): SubstitutionCandidateFacts {
  return {
    userId: id,
    userName: id,
    familiarityDays: 0,
    meetsRequiredCompetency: true,
    bestRequiredLevelSortOrder: null,
    isAvailable: true,
    isWlasciciel: false,
    ...patch,
  };
}

describe("rankSubstitutionCandidates — filtr (dostępność ∩ kompetencja) osobno od sortowania", () => {
  it("niedostępny kandydat jest USUWANY z listy, nie tylko przesunięty w dół", () => {
    const unavailable = facts("a", { isAvailable: false, familiarityDays: 999 });
    const available = facts("b");
    const ranked = rankSubstitutionCandidates([unavailable, available]);
    expect(ranked.map((c) => c.userId)).toEqual(["b"]);
  });

  it("kandydat niespełniający wymaganej kompetencji jest USUWANY z listy", () => {
    const failsCompetency = facts("a", { meetsRequiredCompetency: false, familiarityDays: 999 });
    const passes = facts("b");
    const ranked = rankSubstitutionCandidates([failsCompetency, passes]);
    expect(ranked.map((c) => c.userId)).toEqual(["b"]);
  });

  it("brak wymaganej kompetencji ORAZ niedostępność jednocześnie — nadal tylko filtr, kandydat znika", () => {
    const bad = facts("a", { isAvailable: false, meetsRequiredCompetency: false });
    const ranked = rankSubstitutionCandidates([bad]);
    expect(ranked).toEqual([]);
  });

  it("wśród przechodzących filtr, wyższa znajomość projektu wygrywa jako pierwsze kryterium", () => {
    const moreFamiliar = facts("a", { familiarityDays: 20 });
    const lessFamiliar = facts("b", { familiarityDays: 5, bestRequiredLevelSortOrder: 40 });
    const ranked = rankSubstitutionCandidates([lessFamiliar, moreFamiliar]);
    expect(ranked.map((c) => c.userId)).toEqual(["a", "b"]);
  });

  it("przy równej znajomości, wyższy poziom kompetencji wygrywa jako drugie kryterium", () => {
    const higherLevel = facts("a", { familiarityDays: 10, bestRequiredLevelSortOrder: 40 });
    const lowerLevel = facts("b", { familiarityDays: 10, bestRequiredLevelSortOrder: 20 });
    const ranked = rankSubstitutionCandidates([lowerLevel, higherLevel]);
    expect(ranked.map((c) => c.userId)).toEqual(["a", "b"]);
  });

  it("właściciel przegrywa z KAŻDYM innym kandydatem, nawet gorszym na obu pozostałych kryteriach", () => {
    const owner = facts("a", { isWlasciciel: true, familiarityDays: 999, bestRequiredLevelSortOrder: 40 });
    const worseButNotOwner = facts("b", { familiarityDays: 0, bestRequiredLevelSortOrder: null });
    const ranked = rankSubstitutionCandidates([owner, worseButNotOwner]);
    expect(ranked.map((c) => c.userId)).toEqual(["b", "a"]);
  });

  it("właściciel jest jedynym kandydatem, który przechodzi filtr — pojawia się jako jedyna propozycja", () => {
    const owner = facts("a", { isWlasciciel: true });
    const ranked = rankSubstitutionCandidates([owner]);
    expect(ranked.map((c) => c.userId)).toEqual(["a"]);
  });

  it("pusta lista wejściowa zwraca pustą listę, nie wyjątek", () => {
    expect(rankSubstitutionCandidates([])).toEqual([]);
  });

  it("wszyscy odfiltrowani (np. wszyscy niedostępni) zwraca pustą listę — to sygnał do eskalacji, nie błąd", () => {
    const ranked = rankSubstitutionCandidates([facts("a", { isAvailable: false }), facts("b", { isAvailable: false })]);
    expect(ranked).toEqual([]);
  });

  it("identyczne fakty zachowują kolejność wejściową (sort stabilny)", () => {
    const same = { familiarityDays: 5, bestRequiredLevelSortOrder: 20 };
    const ranked = rankSubstitutionCandidates([facts("first", same), facts("second", same)]);
    expect(ranked.map((c) => c.userId)).toEqual(["first", "second"]);
  });

  it("brak znajomości projektu dopisuje jawne uzasadnienie", () => {
    const [ranked] = rankSubstitutionCandidates([facts("a", { familiarityDays: 0 })]);
    expect(ranked.reasons).toContain("Bez wcześniejszej historii przydziału na tym projekcie.");
  });

  it("bycie właścicielem dopisuje jawne uzasadnienie o ujemnej wadze", () => {
    const [ranked] = rankSubstitutionCandidates([facts("a", { isWlasciciel: true })]);
    expect(ranked.reasons).toContain(
      "Właściciel — proponowany dopiero, gdy nikt inny nie przechodzi filtrów.",
    );
  });
});
