import { describe, expect, it } from "vitest";
import {
  rankStageLeadCandidates,
  type StageLeadCandidateFacts,
} from "@/lib/resource-plan/stage-lead-ranking";

function facts(id: string, patch: Partial<StageLeadCandidateFacts> = {}): StageLeadCandidateFacts {
  return {
    userId: id,
    userName: id,
    assignedToStage: false,
    knownProject: false,
    meetsCompetency: false,
    isAvailable: false,
    continuityFromPreviousStage: false,
    ...patch,
  };
}

describe("rankStageLeadCandidates — kolejność leksykograficzna, nie suma punktów", () => {
  it("przydzielony do etapu bije WSZYSTKO inne, nawet cztery inne spełnione kryteria", () => {
    const onlyAssigned = facts("a", { assignedToStage: true });
    const everythingElse = facts("b", {
      knownProject: true,
      meetsCompetency: true,
      isAvailable: true,
      continuityFromPreviousStage: true,
    });
    const ranked = rankStageLeadCandidates([everythingElse, onlyAssigned]);
    expect(ranked.map((c) => c.userId)).toEqual(["a", "b"]);
  });

  it("wśród nieprzydzielonych do etapu, znajomość projektu decyduje jako drugie kryterium", () => {
    const knowsProject = facts("a", { knownProject: true });
    const restBetter = facts("b", { meetsCompetency: true, isAvailable: true, continuityFromPreviousStage: true });
    const ranked = rankStageLeadCandidates([restBetter, knowsProject]);
    expect(ranked.map((c) => c.userId)).toEqual(["a", "b"]);
  });

  it("kompetencja bije dostępność i ciągłość, gdy pierwsze dwa kryteria są równe", () => {
    const competent = facts("a", { meetsCompetency: true });
    const availableAndContinuous = facts("b", { isAvailable: true, continuityFromPreviousStage: true });
    const ranked = rankStageLeadCandidates([availableAndContinuous, competent]);
    expect(ranked.map((c) => c.userId)).toEqual(["a", "b"]);
  });

  it("dostępność bije ciągłość, gdy pierwsze trzy kryteria są równe", () => {
    const available = facts("a", { isAvailable: true });
    const continuous = facts("b", { continuityFromPreviousStage: true });
    const ranked = rankStageLeadCandidates([continuous, available]);
    expect(ranked.map((c) => c.userId)).toEqual(["a", "b"]);
  });

  it("wszystkie pięć spełnionych bije wszystkie pięć niespełnionych", () => {
    const ideal = facts("a", {
      assignedToStage: true,
      knownProject: true,
      meetsCompetency: true,
      isAvailable: true,
      continuityFromPreviousStage: true,
    });
    const nobody = facts("b");
    expect(rankStageLeadCandidates([nobody, ideal]).map((c) => c.userId)).toEqual(["a", "b"]);
  });

  it("identyczne fakty zachowują kolejność wejściową (sort stabilny)", () => {
    const same = { assignedToStage: true, knownProject: true, meetsCompetency: true, isAvailable: true, continuityFromPreviousStage: true };
    const ranked = rankStageLeadCandidates([facts("first", same), facts("second", same)]);
    expect(ranked.map((c) => c.userId)).toEqual(["first", "second"]);
  });

  it("brak kompetencji dopisuje jawne uzasadnienie, nie milczy o tym", () => {
    const [ranked] = rankStageLeadCandidates([facts("a", { meetsCompetency: false })]);
    expect(ranked.reasons).toContain("Nie spełnia wszystkich wymaganych kompetencji etapu.");
  });

  it("niedostępność dopisuje jawne uzasadnienie", () => {
    const [ranked] = rankStageLeadCandidates([facts("a", { isAvailable: false })]);
    expect(ranked.reasons).toContain("Niedostępny(a) — urlop albo wyłączenie z planowania.");
  });

  it("pusta lista kandydatów zwraca pustą listę, nie wyjątek", () => {
    expect(rankStageLeadCandidates([])).toEqual([]);
  });
});
