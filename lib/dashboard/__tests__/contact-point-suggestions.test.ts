import { describe, expect, it } from "vitest";
import { computeContactPointSuggestions } from "@/lib/dashboard/contact-point-suggestions";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { TradeContactPoint } from "@/lib/dashboard/trade-contact-point-types";
import type { ProjectTrade } from "@/lib/dashboard/trade-types";

function makeTrade(name: string, overrides: Partial<ProjectTrade> = {}): ProjectTrade {
  return {
    id: `trade-${name}`,
    projectId: "project-1",
    name,
    company: "",
    contactName: "",
    email: "",
    phone: "",
    description: "",
    hiredBy: "",
    position: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeContactPoint(overrides: Partial<TradeContactPoint> = {}): TradeContactPoint {
  return {
    id: "cp-1",
    projectType: "Dom",
    tradeNames: ["Stolarka", "Smart Home"],
    title: "Czujki w meblach",
    description: "Opis",
    category: "integration",
    blockingStageId: null,
    blocksNextStage: false,
    photoStoragePath: null,
    photoFileName: null,
    photoMimeType: null,
    isActive: true,
    position: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeAgreement(overrides: Partial<ProjectClientAgreement> = {}): ProjectClientAgreement {
  return {
    id: "agreement-1",
    projectId: "project-1",
    title: "Ustalenie",
    body: "",
    category: "integration",
    status: "draft",
    proposedCostNet: null,
    proposedCostGross: null,
    proposedCostVatRate: null,
    costNote: null,
    createdByName: "Zespół",
    createdBySide: "team",
    submittedAt: null,
    clientRespondedAt: null,
    clientResponseName: null,
    clientResponseNote: null,
    proposedWarrantyEndDate: null,
    position: 0,
    publicToken: "token",
    publicEnabled: false,
    discussionOpen: false,
    activeVersionId: null,
    communicationProtocols: [],
    acceptanceDeadlineStageId: null,
    blocksNextStage: false,
    responsibleUserId: null,
    sourceContactPointId: null,
    sentAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeContactPointSuggestions", () => {
  it("dopasowuje punkt styku, gdy wszystkie branże są obecne w projekcie (bez względu na wielkość liter)", () => {
    const trades = [makeTrade("stolarka"), makeTrade("SMART HOME")];
    const contactPoint = makeContactPoint();

    const result = computeContactPointSuggestions("Dom", trades, [contactPoint], []);

    expect(result).toHaveLength(1);
    expect(result[0].contactPoint.id).toBe("cp-1");
    expect(result[0].matchedTrades.map((trade) => trade.name)).toEqual(["stolarka", "SMART HOME"]);
  });

  it("nie sugeruje punktu styku, gdy brakuje jednej z branż w projekcie", () => {
    const trades = [makeTrade("Stolarka")];
    const contactPoint = makeContactPoint();

    const result = computeContactPointSuggestions("Dom", trades, [contactPoint], []);

    expect(result).toHaveLength(0);
  });

  it("filtruje po typie projektu punktu styku", () => {
    const trades = [makeTrade("Stolarka"), makeTrade("Smart Home")];
    const contactPoint = makeContactPoint({ projectType: "Sklep" });

    const result = computeContactPointSuggestions("Dom", trades, [contactPoint], []);

    expect(result).toHaveLength(0);
  });

  it("wyklucza punkt styku już zastosowany w projekcie (sourceContactPointId na istniejącym ustaleniu)", () => {
    const trades = [makeTrade("Stolarka"), makeTrade("Smart Home")];
    const contactPoint = makeContactPoint();
    const existingAgreements = [makeAgreement({ sourceContactPointId: "cp-1" })];

    const result = computeContactPointSuggestions("Dom", trades, [contactPoint], existingAgreements);

    expect(result).toHaveLength(0);
  });

  it("pomija nieaktywne punkty styku", () => {
    const trades = [makeTrade("Stolarka"), makeTrade("Smart Home")];
    const contactPoint = makeContactPoint({ isActive: false });

    const result = computeContactPointSuggestions("Dom", trades, [contactPoint], []);

    expect(result).toHaveLength(0);
  });
});
