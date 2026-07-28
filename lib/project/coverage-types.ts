// Faza 6 (Cykl życia projektu) — docs/08 D19 §2a. Append-only fakty pokrycia serwisowego.
export const PROJECT_COVERAGE_KINDS = ["gwarancja_pierwotna", "przedluzenie", "umowa_serwisowa"] as const;
export type ProjectCoverageKind = (typeof PROJECT_COVERAGE_KINDS)[number];

export const PROJECT_COVERAGE_KIND_LABELS: Record<ProjectCoverageKind, string> = {
  gwarancja_pierwotna: "Gwarancja pierwotna",
  przedluzenie: "Przedłużenie",
  umowa_serwisowa: "Umowa serwisowa",
};

export type ProjectCoveragePeriod = {
  id: string;
  projectId: string;
  kind: ProjectCoverageKind;
  startsAt: string;
  endsAt: string;
  sourceRef: string | null;
  note: string;
  createdBy: string | null;
  createdAt: string;
};

export type ProjectCoveragePeriodInput = {
  kind: ProjectCoverageKind;
  startsAt: string;
  endsAt: string;
  sourceRef?: string | null;
  note?: string;
};
