import { describe, expect, it } from "vitest";
import { isServiceSettled } from "@/lib/service/report-document";
import type { ServiceRecord, ServiceStatus } from "@/lib/service/types";

function serviceWithStatus(status: ServiceStatus): ServiceRecord {
  return { status } as ServiceRecord;
}

describe("isServiceSettled", () => {
  it("jest true dla całego cyklu po rozliczeniu, nie tylko dla Rozliczony", () => {
    expect(isServiceSettled(serviceWithStatus("Rozliczony"))).toBe(true);
    expect(isServiceSettled(serviceWithStatus("Rozliczanie"))).toBe(true);
    expect(isServiceSettled(serviceWithStatus("Fakturowanie"))).toBe(true);
    expect(isServiceSettled(serviceWithStatus("Zakończona"))).toBe(true);
  });

  it("jest false przed rozliczeniem", () => {
    expect(isServiceSettled(serviceWithStatus("Wycena"))).toBe(false);
    expect(isServiceSettled(serviceWithStatus("Do rozliczenia"))).toBe(false);
    expect(isServiceSettled(serviceWithStatus("Anulowany"))).toBe(false);
  });
});
