import { describe, expect, it } from "vitest";
import { formatChangeRequestCost } from "@/lib/dashboard/change-request-types";
import { formatAgreementCost } from "@/lib/dashboard/agreement-types";

describe("formatChangeRequestCost", () => {
  it("returns null when net/gross are empty even if a VAT rate is set", () => {
    expect(
      formatChangeRequestCost({
        proposedCostNet: null,
        proposedCostGross: null,
        proposedCostVatRate: 23,
        costNote: null,
      }),
    ).toBeNull();
  });

  it("falls back to costNote when net/gross are empty", () => {
    expect(
      formatChangeRequestCost({
        proposedCostNet: null,
        proposedCostGross: null,
        proposedCostVatRate: 23,
        costNote: "Wycena po ustaleniu zakresu",
      }),
    ).toBe("Wycena po ustaleniu zakresu");
  });

  it("includes VAT alongside a real amount", () => {
    expect(
      formatChangeRequestCost({
        proposedCostNet: 100,
        proposedCostGross: null,
        proposedCostVatRate: 23,
        costNote: null,
      }),
    ).toBe("netto 100.00 PLN · VAT 23%");
  });
});

describe("formatAgreementCost", () => {
  it("returns null when net/gross are empty even if a VAT rate is set", () => {
    expect(
      formatAgreementCost({
        proposedCostNet: null,
        proposedCostGross: null,
        proposedCostVatRate: 23,
        costNote: null,
      }),
    ).toBeNull();
  });

  it("includes VAT alongside a real amount", () => {
    expect(
      formatAgreementCost({
        proposedCostNet: null,
        proposedCostGross: 123,
        proposedCostVatRate: 8,
        costNote: null,
      }),
    ).toBe("VAT 8% · brutto 123.00 PLN");
  });
});
