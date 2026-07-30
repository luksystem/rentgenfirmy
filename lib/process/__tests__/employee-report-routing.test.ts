import { describe, expect, it } from "vitest";
import {
  routeEmployeeReport,
  shouldShowUrgency,
  type BillingImpactAnswer,
} from "@/lib/process/employee-report-routing";

describe("routeEmployeeReport", () => {
  it("TAK idzie w zmianę projektową", () => {
    expect(routeEmployeeReport("tak")).toEqual({
      target: "change_request",
      markUncertain: false,
    });
  });

  it("NIE idzie w ustalenie, bez śladu niepewności", () => {
    expect(routeEmployeeReport("nie")).toEqual({ target: "agreement", markUncertain: false });
  });

  it("NIE WIEM idzie w to samo miejsce co NIE, ale ze śladem niepewności", () => {
    // Bez tego rozróżnienia manager nie odróżni „na pewno bez wpływu" od „nie wiem",
    // a to jest wejście do decyzji o konwersji na zmianę projektową.
    expect(routeEmployeeReport("nie_wiem")).toEqual({
      target: "agreement",
      markUncertain: true,
    });
  });

  it("żadna odpowiedź nie prowadzi do utworzenia zadania — routing zna tylko dwa cele", () => {
    const answers: BillingImpactAnswer[] = ["tak", "nie", "nie_wiem"];
    const targets = new Set(answers.map((answer) => routeEmployeeReport(answer).target));
    expect(targets).toEqual(new Set(["change_request", "agreement"]));
  });

  it("tylko TAK trafia do zmian — dwie z trzech odpowiedzi lądują w ustaleniach", () => {
    const answers: BillingImpactAnswer[] = ["tak", "nie", "nie_wiem"];
    const agreements = answers.filter(
      (answer) => routeEmployeeReport(answer).target === "agreement",
    );
    expect(agreements).toEqual(["nie", "nie_wiem"]);
  });
});

describe("shouldShowUrgency", () => {
  it("pokazuje pilność na nieobsłużonym zgłoszeniu", () => {
    expect(shouldShowUrgency({ isUrgent: true, status: "draft" })).toBe(true);
  });

  it("przestaje pokazywać, gdy manager sklasyfikował — bez logiki czyszczenia", () => {
    for (const status of ["pending_client", "accepted", "rejected", "cancelled"]) {
      expect(shouldShowUrgency({ isUrgent: true, status })).toBe(false);
    }
  });

  it("niepilne pozostaje niepilne w każdym stanie", () => {
    for (const status of ["draft", "pending_client", "accepted"]) {
      expect(shouldShowUrgency({ isUrgent: false, status })).toBe(false);
    }
  });
});
