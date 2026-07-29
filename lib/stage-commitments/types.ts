// Krok A A7 (docs/08 D27 2.4) — kalendarz zobowiązań aktywnego etapu każdego projektu.
export const STAGE_COMMITMENT_STATUSES = ["zrobione", "ok", "rozbieznosc", "brak_planu"] as const;
export type StageCommitmentStatus = (typeof STAGE_COMMITMENT_STATUSES)[number];

export const STAGE_COMMITMENT_STATUS_LABELS: Record<StageCommitmentStatus, string> = {
  zrobione: "Zrobione",
  ok: "Zaplanowane",
  rozbieznosc: "Rozbieżność z terminem",
  brak_planu: "Brak planu",
};

export type StageCommitment = {
  projectId: string;
  projectName: string;
  stageId: string;
  stageTitle: string;
  itemId: string;
  templateItemId: string;
  title: string;
  terminWynikajacy: string | null;
  dataPlanowana: string | null;
  dataUkonczenia: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  responsibleSource: "assignee" | "macierz" | null;
  status: StageCommitmentStatus;
};
