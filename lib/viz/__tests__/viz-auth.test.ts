import { describe, expect, it } from "vitest";
import { resolveInternalVizAccessRole } from "@/lib/viz/viz-auth-server";
import { DEFAULT_VIZ_PERMISSIONS_BY_ROLE } from "@/lib/viz/types";

describe("resolveInternalVizAccessRole", () => {
  it("maps internal staff roles to dashboard access roles", () => {
    expect(resolveInternalVizAccessRole("administrator")).toBe("admin");
    expect(resolveInternalVizAccessRole("manager")).toBe("admin");
    expect(resolveInternalVizAccessRole("pracownik")).toBe("operator");
    expect(resolveInternalVizAccessRole("podwykonawca")).toBe("service");
    expect(resolveInternalVizAccessRole("klient")).toBeNull();
  });

  it("keeps client readonly without control permissions by default", () => {
    expect(DEFAULT_VIZ_PERMISSIONS_BY_ROLE.client_readonly.controlSetpoint).toBe(false);
    expect(DEFAULT_VIZ_PERMISSIONS_BY_ROLE.client_readonly.viewEnergy).toBe(true);
    expect(DEFAULT_VIZ_PERMISSIONS_BY_ROLE.client_admin.uploadInvoices).toBe(true);
  });
});
