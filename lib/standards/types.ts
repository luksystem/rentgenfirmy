export type CompanyStandardStatus = "draft" | "published";

export type CompanyStandardStep = {
  title: string;
  bodyHtml: string;
};

export type CompanyStandard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  contextHtml: string;
  steps: CompanyStandardStep[];
  tipsHtml: string;
  status: CompanyStandardStatus;
  sourceGoalId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyStandardInput = {
  title: string;
  summary?: string;
  contextHtml?: string;
  steps?: CompanyStandardStep[];
  tipsHtml?: string;
  status?: CompanyStandardStatus;
  sourceGoalId?: string | null;
};

const COMBINING_DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

export function slugifyCompanyStandard(label: string, fallback = "standard"): string {
  const base = label
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_PATTERN, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || fallback;
}
