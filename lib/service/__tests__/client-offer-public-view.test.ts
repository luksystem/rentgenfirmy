import { describe, expect, it } from "vitest";
import { toPublicOfferPayload } from "@/lib/service/client-offer-public-view";
import { buildServiceReportCosts } from "@/lib/service/report-document";
import { EMPTY_BILLABLE, emptyLineItems, type ServiceRecord } from "@/lib/service/types";

function buildService(overrides: Partial<ServiceRecord> = {}): ServiceRecord {
  const estimate = {
    ...emptyLineItems(EMPTY_BILLABLE),
    supervisionHours: 2,
    installerHours: 5,
    helperHours: 1,
    programmerHours: 0,
    carHours: 1,
    kilometersOneWay: 40,
    tripCount: 1,
    materialsCost: 300,
    accommodations: 1,
  };

  return {
    id: "service-1",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    status: "Oczekuje na klienta",
    projectId: "project-1",
    clientId: "client-1",
    contactId: "contact-1",
    client: {
      fullName: "Jan Kowalski",
      location: "Warszawa",
      email: "jan@example.com",
      phone: "123456789",
    },
    title: "Serwis klimatyzacji",
    serviceType: "Pogwarancyjny",
    rates: {
      supervisionHourly: 150,
      installerHourly: 120,
      helperHourly: 80,
      programmerHourly: 200,
      carPerKm: 2.5,
      carHourly: 60,
      accommodationCost: 250,
    },
    estimateDiscounts: {
      percentDiscount: 10,
      materialsPercentDiscount: 0,
      specialDiscountPln: 50,
      vatRate: 23,
    },
    actualDiscounts: {
      percentDiscount: 0,
      materialsPercentDiscount: 0,
      specialDiscountPln: 0,
      vatRate: 23,
    },
    zoneSettings: { zone1ThresholdKm: 20, zone2ThresholdKm: 60, zone3ThresholdKm: 120 },
    detailedSettlement: true,
    showEstimateComparison: false,
    estimate,
    actual: emptyLineItems(EMPTY_BILLABLE),
    optionalItems: [],
    pricingModel: "hourly",
    fixedPriceTables: [],
    clientOffer: {
      token: "estimate-secret-token",
      expiresAt: "2026-08-01T00:00:00.000Z",
      status: "pending",
      message: "Wewnętrzna notatka negocjacyjna",
      respondedAt: null,
      lastClientMessage: null,
      sentAt: "2026-07-05T00:00:00.000Z",
    },
    clientOfferHistory: [
      { id: "h1", at: "2026-07-05T00:00:00.000Z", type: "link_generated", message: null, offerStatus: null },
    ],
    clientOfferAcceptedDocument: null,
    settlementOffer: {
      token: "settlement-secret-token",
      expiresAt: null,
      status: null,
      message: null,
      respondedAt: null,
      lastClientMessage: null,
      sentAt: null,
    },
    settlementOfferHistory: [],
    settlementOfferAcceptedDocument: null,
    estimateApproval: {
      status: "approved",
      requestedBy: "employee-42",
      assignedAdminId: "employee-1",
      note: "wewnętrzna notatka admina",
      history: [
        { id: "a1", at: "2026-07-02T00:00:00.000Z", type: "approved", actorId: "employee-1", note: null },
      ],
    },
    settlementApproval: {
      status: null,
      requestedBy: null,
      assignedAdminId: null,
      note: "",
      history: [],
    },
    aiEstimate: {
      createdAt: "2026-07-01T00:00:00.000Z",
      description: "wewnętrzny opis AI",
      proposal: {} as never,
      travelContext: {} as never,
      appliedAt: null,
      appliedLineItems: null,
      calculatedCosts: null,
      variance: null,
    },
    intakeReference: "INTAKE-123",
    reviewedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("toPublicOfferPayload", () => {
  it("nie wysyła stawek godzinowych ani ustawień stref km", () => {
    const { service } = toPublicOfferPayload(buildService(), "estimate");

    expect(service.rates).toEqual({
      supervisionHourly: 0,
      installerHourly: 0,
      helperHourly: 0,
      programmerHourly: 0,
      carPerKm: 0,
      carHourly: 0,
      accommodationCost: 0,
    });
    expect(service.zoneSettings).toEqual({
      zone1ThresholdKm: 0,
      zone2ThresholdKm: 0,
      zone3ThresholdKm: 0,
    });
  });

  it("nie wysyła historii akceptacji z ID pracowników ani wewnętrznych notatek", () => {
    const { service } = toPublicOfferPayload(buildService(), "estimate");

    expect(service.estimateApproval).toEqual({
      status: null,
      requestedBy: null,
      assignedAdminId: null,
      note: "",
      history: [],
    });
    expect(service.settlementApproval.history).toEqual([]);
    expect(service.aiEstimate).toBeNull();
    expect(service.intakeReference).toBeNull();
    expect(service.reviewedAt).toBeNull();
    expect(service.clientOfferHistory).toEqual([]);
    expect(service.settlementOfferHistory).toEqual([]);
    expect(service.clientOfferAcceptedDocument).toBeNull();
    expect(service.settlementOfferAcceptedDocument).toBeNull();
    expect(service.clientId).toBeNull();
    expect(service.contactId).toBeNull();
  });

  it("nie ujawnia tokenu ani wiadomości drugiej z ofert (estimate <-> settlement)", () => {
    const { service } = toPublicOfferPayload(buildService(), "estimate");

    expect(service.clientOffer.token).toBeNull();
    expect(service.clientOffer.message).toBeNull();
    expect(service.clientOffer.sentAt).toBeNull();
    expect(service.clientOffer.status).toBe("pending");

    expect(service.settlementOffer.token).toBeNull();
    expect(service.settlementOffer.status).toBeNull();
  });

  it("zwraca policzone kwoty (costs) zgodne z rzeczywistymi stawkami mimo wyzerowania rates", () => {
    const fullService = buildService();
    const expectedCosts = buildServiceReportCosts(fullService);

    const { costs } = toPublicOfferPayload(fullService, "estimate");

    expect(costs.estimate.grossTotal).toBeGreaterThan(0);
    expect(costs.estimate).toEqual(expectedCosts.estimate);
  });

  it("dla rozliczenia (settlement) status serwisu to Rozliczony i koszty liczone są z actual", () => {
    const fullService = buildService({ status: "Rozliczony" });
    const { service, costs } = toPublicOfferPayload(fullService, "settlement");

    expect(service.status).toBe("Rozliczony");
    expect(costs.actual).toBeDefined();
  });

  it("zachowuje pola potrzebne do wyrenderowania oferty klientowi", () => {
    const { service } = toPublicOfferPayload(buildService(), "estimate");

    expect(service.title).toBe("Serwis klimatyzacji");
    expect(service.client.fullName).toBe("Jan Kowalski");
    expect(service.estimate.installerHours).toBe(5);
    expect(service.estimateDiscounts.percentDiscount).toBe(10);
    expect(service.pricingModel).toBe("hourly");
  });
});
