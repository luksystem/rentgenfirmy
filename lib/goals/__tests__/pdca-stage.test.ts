import { describe, expect, it } from "vitest";
import { derivePdcaStage } from "@/lib/goals/pdca-stage";

describe("derivePdcaStage", () => {
  it("planned -> plan", () => {
    expect(derivePdcaStage({ status: "planned" })).toBe("plan");
  });

  it("in_progress / at_risk -> do (bez otwartego przeglądu)", () => {
    expect(derivePdcaStage({ status: "in_progress" })).toBe("do");
    expect(derivePdcaStage({ status: "at_risk" })).toBe("do");
  });

  it("in_progress / at_risk z otwartym przeglądem -> check", () => {
    expect(derivePdcaStage({ status: "in_progress" }, true)).toBe("check");
    expect(derivePdcaStage({ status: "at_risk" }, true)).toBe("check");
  });

  it("on_hold -> check niezależnie od otwartego przeglądu", () => {
    expect(derivePdcaStage({ status: "on_hold" })).toBe("check");
    expect(derivePdcaStage({ status: "on_hold" }, true)).toBe("check");
  });

  it("settled -> act", () => {
    expect(derivePdcaStage({ status: "settled" })).toBe("act");
  });

  it("cancelled -> cancelled, nie wpada w otwarty przegląd", () => {
    expect(derivePdcaStage({ status: "cancelled" }, true)).toBe("cancelled");
  });

  it("planned z otwartym przeglądem pozostaje plan (przegląd wpływa tylko na in_progress/at_risk)", () => {
    expect(derivePdcaStage({ status: "planned" }, true)).toBe("plan");
  });
});
