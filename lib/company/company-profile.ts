export type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  nip: string;
  regon: string;
  additionalInfo: string;
  logoStoragePath: string | null;
};

export const COMPANY_PROFILE_SETTINGS_ID = "company_profile";

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "",
  address: "",
  phone: "",
  nip: "",
  regon: "",
  additionalInfo: "",
  logoStoragePath: null,
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeCompanyProfile(value: unknown): CompanyProfile {
  const data = asObject(value);

  return {
    name: typeof data.name === "string" ? data.name.trim() : "",
    address: typeof data.address === "string" ? data.address.trim() : "",
    phone: typeof data.phone === "string" ? data.phone.trim() : "",
    nip: typeof data.nip === "string" ? data.nip.trim() : "",
    regon: typeof data.regon === "string" ? data.regon.trim() : "",
    additionalInfo: typeof data.additionalInfo === "string" ? data.additionalInfo.trim() : "",
    logoStoragePath:
      typeof data.logoStoragePath === "string" && data.logoStoragePath.trim()
        ? data.logoStoragePath.trim()
        : null,
  };
}

export function companyDisplayName(profile: CompanyProfile) {
  return profile.name.trim() || "Rentgen firmy";
}

export function companyFooterLines(profile: CompanyProfile) {
  const lines: string[] = [];
  const name = profile.name.trim();
  if (name) {
    lines.push(name);
  }
  if (profile.address.trim()) {
    lines.push(profile.address.trim());
  }
  const taxParts: string[] = [];
  if (profile.nip.trim()) {
    taxParts.push(`NIP: ${profile.nip.trim()}`);
  }
  if (profile.regon.trim()) {
    taxParts.push(`REGON: ${profile.regon.trim()}`);
  }
  if (taxParts.length) {
    lines.push(taxParts.join(" · "));
  }
  if (profile.phone.trim()) {
    lines.push(`tel. ${profile.phone.trim()}`);
  }
  if (profile.additionalInfo.trim()) {
    lines.push(profile.additionalInfo.trim());
  }
  return lines;
}

export function hasCompanyFooterContent(profile: CompanyProfile) {
  return (
    Boolean(profile.logoStoragePath) ||
    companyFooterLines(profile).length > 0 ||
    Boolean(profile.name.trim())
  );
}
