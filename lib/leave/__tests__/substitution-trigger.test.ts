import { describe, expect, it } from "vitest";
import {
  resolveSubstitutionTriggeredSlots,
  type SubstitutionSlotFacts,
} from "@/lib/leave/substitution-trigger";

function slot(id: string, patch: Partial<SubstitutionSlotFacts> = {}): SubstitutionSlotFacts {
  return {
    projectId: id,
    projectName: id,
    roleCode: "opiekun_projektu",
    gateRegime: "STANDARD",
    milestoneOverlap: false,
    ...patch,
  };
}

describe("resolveSubstitutionTriggeredSlots — §6.1, trzy warunki OR", () => {
  it("urlop > 2 dni robocze obejmuje WSZYSTKIE sloty, nawet CZUWANIE bez nachodzenia", () => {
    const calm = slot("a", { gateRegime: "CZUWANIE" });
    const triggered = resolveSubstitutionTriggeredSlots(true, [calm]);
    expect(triggered).toEqual([calm]);
  });

  it("poniżej progu dni, CZUWANIE i STANDARD bez nachodzenia NIE wyzwalają", () => {
    const calm = slot("a", { gateRegime: "CZUWANIE" });
    const standard = slot("b", { gateRegime: "STANDARD" });
    expect(resolveSubstitutionTriggeredSlots(false, [calm, standard])).toEqual([]);
  });

  it("poniżej progu dni, brama INTENSYWNA wyzwala mimo braku nachodzenia kamienia", () => {
    const intensive = slot("a", { gateRegime: "INTENSYWNA" });
    expect(resolveSubstitutionTriggeredSlots(false, [intensive])).toEqual([intensive]);
  });

  it("poniżej progu dni, brama KRYTYCZNA wyzwala mimo braku nachodzenia kamienia", () => {
    const critical = slot("a", { gateRegime: "KRYTYCZNA" });
    expect(resolveSubstitutionTriggeredSlots(false, [critical])).toEqual([critical]);
  });

  it("poniżej progu dni, nachodzenie na kamień wyzwala mimo bramy STANDARD", () => {
    const overlapping = slot("a", { gateRegime: "STANDARD", milestoneOverlap: true });
    expect(resolveSubstitutionTriggeredSlots(false, [overlapping])).toEqual([overlapping]);
  });

  it("mieszana lista: wybiera tylko sloty spełniające warunek, resztę pomija", () => {
    const calm = slot("a", { gateRegime: "CZUWANIE" });
    const critical = slot("b", { gateRegime: "KRYTYCZNA" });
    const overlapping = slot("c", { milestoneOverlap: true });
    const result = resolveSubstitutionTriggeredSlots(false, [calm, critical, overlapping]);
    expect(result.map((s) => s.projectId)).toEqual(["b", "c"]);
  });

  it("pusta lista slotów zwraca pustą listę niezależnie od progu dni", () => {
    expect(resolveSubstitutionTriggeredSlots(true, [])).toEqual([]);
    expect(resolveSubstitutionTriggeredSlots(false, [])).toEqual([]);
  });

  it("brak_komunikacji i tryb_serwisowy (reżimy spoza czterech faz) nie wyzwalają same z siebie", () => {
    const suspended = slot("a", { gateRegime: "brak_komunikacji" });
    const service = slot("b", { gateRegime: "tryb_serwisowy" });
    expect(resolveSubstitutionTriggeredSlots(false, [suspended, service])).toEqual([]);
  });
});
