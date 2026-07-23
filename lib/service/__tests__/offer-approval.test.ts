import { describe, expect, it } from "vitest";
import {
  canDecideOfferApproval,
  canGenerateOrSendOffer,
  emptyOfferApprovalState,
  getOfferApprovalBlockReason,
  requiresOfferApproval,
} from "@/lib/service/offer-approval";

const employee = { id: "emp-1", role: "instalator" as const, offerApprovalBypass: false };
const bypassEmployee = { id: "emp-2", role: "office" as const, offerApprovalBypass: true };
const admin = { id: "admin-1", role: "administrator" as const, offerApprovalBypass: false };

describe("requiresOfferApproval", () => {
  it("administrator nigdy nie wymaga akceptacji", () => {
    expect(requiresOfferApproval(admin)).toBe(false);
  });

  it("pracownik z flagą bypass nie wymaga akceptacji", () => {
    expect(requiresOfferApproval(bypassEmployee)).toBe(false);
  });

  it("zwykły pracownik wymaga akceptacji", () => {
    expect(requiresOfferApproval(employee)).toBe(true);
  });
});

describe("canGenerateOrSendOffer", () => {
  it("administrator może zawsze, niezależnie od stanu akceptacji", () => {
    expect(canGenerateOrSendOffer(emptyOfferApprovalState(), admin)).toBe(true);
  });

  it("pracownik bez aktywnego cyklu akceptacji nie może", () => {
    expect(canGenerateOrSendOffer(emptyOfferApprovalState(), employee)).toBe(false);
  });

  it("pracownik z zaakceptowanym własnym wnioskiem może", () => {
    const approval = { ...emptyOfferApprovalState(), status: "approved" as const, requestedBy: employee.id };
    expect(canGenerateOrSendOffer(approval, employee)).toBe(true);
  });

  it("pracownik nie może użyć akceptacji przyznanej komuś innemu", () => {
    const approval = { ...emptyOfferApprovalState(), status: "approved" as const, requestedBy: "kto-inny" };
    expect(canGenerateOrSendOffer(approval, employee)).toBe(false);
  });

  it("status pending blokuje wysyłkę", () => {
    const approval = { ...emptyOfferApprovalState(), status: "pending" as const, requestedBy: employee.id };
    expect(canGenerateOrSendOffer(approval, employee)).toBe(false);
  });
});

describe("getOfferApprovalBlockReason", () => {
  it("zwraca null gdy wysyłka dozwolona", () => {
    expect(getOfferApprovalBlockReason(emptyOfferApprovalState(), admin)).toBeNull();
  });

  it("opisuje stan pending", () => {
    const approval = { ...emptyOfferApprovalState(), status: "pending" as const, requestedBy: employee.id };
    expect(getOfferApprovalBlockReason(approval, employee)).toMatch(/akceptacj/i);
  });
});

describe("canDecideOfferApproval", () => {
  const pendingForAdmin1 = {
    ...emptyOfferApprovalState(),
    status: "pending" as const,
    requestedBy: employee.id,
    assignedAdminId: "admin-1",
  };

  it("wskazany administrator może zdecydować", () => {
    expect(canDecideOfferApproval(pendingForAdmin1, admin)).toBe(true);
  });

  it("inny administrator też może zdecydować", () => {
    const otherAdmin = { id: "admin-2", role: "administrator" as const };
    expect(canDecideOfferApproval(pendingForAdmin1, otherAdmin)).toBe(true);
  });

  it("zwykły pracownik nie może zdecydować", () => {
    expect(canDecideOfferApproval(pendingForAdmin1, employee)).toBe(false);
  });

  it("nie da się zdecydować, gdy status nie jest pending", () => {
    const approved = { ...pendingForAdmin1, status: "approved" as const };
    expect(canDecideOfferApproval(approved, admin)).toBe(false);
  });
});
