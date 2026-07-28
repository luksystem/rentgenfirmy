import type { ProjectAgreementCategory } from "@/lib/dashboard/agreement-types";

export type TradeContactPoint = {
  id: string;
  projectType: string;
  tradeNames: string[];
  title: string;
  description: string;
  category: ProjectAgreementCategory;
  blockingStageId: string | null;
  blocksNextStage: boolean;
  photoStoragePath: string | null;
  photoFileName: string | null;
  photoMimeType: string | null;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type TradeContactPointInput = {
  projectType: string;
  tradeNames: string[];
  title: string;
  description: string;
  category: ProjectAgreementCategory;
  blockingStageId?: string | null;
  blocksNextStage?: boolean;
  isActive?: boolean;
};

export function normalizeTradeContactPointInput(
  input: TradeContactPointInput,
): TradeContactPointInput {
  const tradeNames = [
    ...new Set(input.tradeNames.map((name) => name.trim()).filter(Boolean)),
  ];
  const blockingStageId = input.blockingStageId?.trim() || null;
  return {
    projectType: input.projectType.trim(),
    tradeNames,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    blockingStageId,
    blocksNextStage: Boolean(input.blocksNextStage && blockingStageId),
    isActive: input.isActive ?? true,
  };
}

export function validateTradeContactPointInput(input: TradeContactPointInput): string | null {
  const normalized = normalizeTradeContactPointInput(input);
  if (!normalized.projectType) {
    return "Wybierz typ projektu.";
  }
  if (normalized.tradeNames.length < 2) {
    return "Wybierz co najmniej dwie branże.";
  }
  if (!normalized.title) {
    return "Podaj tytuł punktu styku.";
  }
  return null;
}
