// Faza 7 (Warstwa sygnałów + zdrowie etapu) — docs/08 D3/D26. Nowy, osobny koncept od "zdrowia
// projektu" (lib/projects/project-health.ts) — ten drugi zostaje nietknięty.
export const STAGE_HEALTH_BANDS = ["green", "yellow", "red"] as const;
export type StageHealthBand = (typeof STAGE_HEALTH_BANDS)[number];

export const STAGE_HEALTH_BAND_LABELS: Record<StageHealthBand, string> = {
  green: "Zdrowy",
  yellow: "Wymaga uwagi",
  red: "Wymaga interwencji",
};

export type ProjectStageHealth = {
  projectId: string;
  projectName: string;
  stageId: string;
  stageTitle: string;
  openBlockersCount: number;
  overdueReviewsCount: number;
  staleAcceptancesCount: number;
  overdueTasksCount: number;
  rawScore: number;
  band: StageHealthBand;
};
