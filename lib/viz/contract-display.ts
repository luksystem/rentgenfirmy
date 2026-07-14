import type { VizServiceContractRateVersion } from "@/lib/viz/contract-types";

export function pickCurrentRateVersion(rateVersions: VizServiceContractRateVersion[]) {
  if (!rateVersions.length) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const active = rateVersions.find(
    (version) =>
      version.validFrom <= today && (!version.validUntil || version.validUntil >= today),
  );
  return active ?? rateVersions[0] ?? null;
}
