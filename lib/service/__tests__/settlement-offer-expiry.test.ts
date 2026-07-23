import { describe, expect, it } from "vitest";
import { isSettlementOfferActive } from "@/lib/service/settlement-offer";
import {
  isPublicSettlementOfferAvailable,
  isPublicSettlementOfferQuestionAvailable,
} from "@/lib/supabase/client-offer-repository";
import type { ServiceRecord } from "@/lib/service/types";

const PAST = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
const FUTURE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

function settlementService(overrides: Partial<ServiceRecord["settlementOffer"]>): ServiceRecord {
  return {
    settlementOffer: {
      token: "tok",
      expiresAt: PAST,
      status: "pending",
      message: null,
      respondedAt: null,
      lastClientMessage: null,
      ...overrides,
    },
  } as ServiceRecord;
}

describe("isSettlementOfferActive — rozliczenie nie wygasa", () => {
  it("jest aktywne mimo minięcia terminu (auto-akceptacji), dopóki status to pending", () => {
    expect(isSettlementOfferActive(settlementService({ expiresAt: PAST }))).toBe(true);
  });

  it("jest aktywne też przed terminem", () => {
    expect(isSettlementOfferActive(settlementService({ expiresAt: FUTURE }))).toBe(true);
  });

  it("nie jest aktywne po decyzji klienta", () => {
    expect(isSettlementOfferActive(settlementService({ status: "accepted" }))).toBe(false);
  });

  it("nie jest aktywne bez tokenu", () => {
    expect(isSettlementOfferActive(settlementService({ token: null }))).toBe(false);
  });
});

describe("isPublicSettlementOfferAvailable — brak blokady po terminie", () => {
  it("dostępne mimo przeterminowania", () => {
    expect(isPublicSettlementOfferAvailable(settlementService({ expiresAt: PAST }))).toBe(true);
  });

  it("niedostępne, gdy klient już zdecydował", () => {
    expect(isPublicSettlementOfferAvailable(settlementService({ status: "rejected" }))).toBe(false);
  });
});

describe("isPublicSettlementOfferQuestionAvailable — tryb pytania nie istnieje dla rozliczenia", () => {
  it("zawsze false", () => {
    expect(isPublicSettlementOfferQuestionAvailable()).toBe(false);
  });
});
