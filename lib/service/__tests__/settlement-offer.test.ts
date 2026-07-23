import { describe, expect, it } from "vitest";
import { serviceStatusAfterSettlementAction } from "@/lib/service/settlement-offer";

describe("serviceStatusAfterSettlementAction", () => {
  it("akceptacja klienta przechodzi do Fakturowanie", () => {
    expect(serviceStatusAfterSettlementAction("accept")).toBe("Fakturowanie");
  });

  it("odrzucenie wraca do Rozliczony, żeby dało się poprawić i wysłać ponownie", () => {
    expect(serviceStatusAfterSettlementAction("reject")).toBe("Rozliczony");
  });

  it("negocjacja też wraca do Rozliczony", () => {
    expect(serviceStatusAfterSettlementAction("negotiate")).toBe("Rozliczony");
  });
});
