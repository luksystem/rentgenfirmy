import {
  companyDisplayName,
  companyFooterLines,
  DEFAULT_COMPANY_PROFILE,
  type CompanyProfile,
} from "@/lib/company/company-profile";
import { getCompanyLogoPublicUrl } from "@/lib/company/company-logo";

export type CompanyProfileDocument = CompanyProfile & {
  displayName: string;
  logoUrl: string | null;
  footerLines: string[];
};

export function resolveCompanyProfileDocument(
  profile: CompanyProfile = DEFAULT_COMPANY_PROFILE,
): CompanyProfileDocument {
  return {
    ...profile,
    displayName: companyDisplayName(profile),
    logoUrl: getCompanyLogoPublicUrl(profile.logoStoragePath),
    footerLines: companyFooterLines(profile),
  };
}

export function escapeCompanyHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCompanyFooterHtml(
  profile: CompanyProfileDocument,
  options?: { documentNote?: string },
) {
  const note =
    options?.documentNote?.trim() ||
    "Dokument wygenerowany w module Oferty · Rentgen firmy";

  const logo = profile.logoUrl
    ? `<img src="${escapeCompanyHtml(profile.logoUrl)}" alt="${escapeCompanyHtml(profile.displayName)}" class="company-logo" />`
    : "";

  const lines = profile.footerLines.length
    ? profile.footerLines
        .map((line) => `<p class="company-line">${escapeCompanyHtml(line)}</p>`)
        .join("")
    : `<p class="company-line">${escapeCompanyHtml(profile.displayName)}</p>`;

  return `<div class="doc-footer company-footer">
    ${logo ? `<div class="company-logo-wrap">${logo}</div>` : ""}
    <div class="company-details">${lines}</div>
    <p class="company-doc-note">${escapeCompanyHtml(note)}</p>
  </div>`;
}

export const COMPANY_FOOTER_PRINT_STYLES = `
  .doc-footer.company-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }
  .company-logo-wrap { line-height: 0; }
  .company-logo {
    max-height: 48px;
    max-width: 180px;
    width: auto;
    height: auto;
    object-fit: contain;
  }
  .company-details { display: grid; gap: 2px; }
  .company-line {
    margin: 0;
    font-size: 8.5pt;
    color: #52525b;
    line-height: 1.45;
  }
  .company-doc-note {
    margin: 4px 0 0;
    font-size: 7.5pt;
    color: #a1a1aa;
  }
`;
