import type { ProcessTemplate, ProjectProcess, ProjectProcessItem } from "@/lib/process/types";

/**
 * Silnik blokady kaskadowej etapów procesu.
 *
 * Źródła blokady ("blocking sources"):
 * - Element procesu (checklista/protokół/kanban) z `blocksNextStage=true`, nieukończony
 *   → blokuje etap NASTĘPNY po etapie elementu i wszystkie etapy po nim.
 * - Ustalenie / Zmiana budowlana z `blocksNextStage=true` i `acceptanceDeadlineStageId`,
 *   nie w pełni zaakceptowane → blokuje WYBRANY etap (deadline) i wszystkie etapy po nim.
 *
 * Blokada jest kaskadowa: raz zablokowany etap blokuje też każdy kolejny, aż źródło
 * blokady zostanie spełnione.
 */

export type StageBlockSource = {
  /** Pierwszy indeks etapu (0-based), który jest blokowany — kaskaduje do końca template.stages. */
  targetStageIndex: number;
  reason: string;
};

export type StageGateResult = {
  blockedStageIndexes: Set<number>;
  reasonsByStageIndex: Map<number, string[]>;
};

export function computeStageGate(stageCount: number, sources: StageBlockSource[]): StageGateResult {
  const blockedStageIndexes = new Set<number>();
  const reasonsByStageIndex = new Map<number, string[]>();

  for (const source of sources) {
    if (source.targetStageIndex < 0) {
      continue;
    }
    for (let index = source.targetStageIndex; index < stageCount; index += 1) {
      blockedStageIndexes.add(index);
      const list = reasonsByStageIndex.get(index) ?? [];
      list.push(source.reason);
      reasonsByStageIndex.set(index, list);
    }
  }

  return { blockedStageIndexes, reasonsByStageIndex };
}

export function buildProcessItemBlockSources(
  template: ProcessTemplate,
  itemInstances: Record<string, ProjectProcessItem> | null | undefined,
  process: ProjectProcess | null | undefined,
): StageBlockSource[] {
  const sources: StageBlockSource[] = [];

  template.stages.forEach((stage, stageIndex) => {
    stage.milestones.forEach((milestone) => {
      milestone.items.forEach((item) => {
        const instance = itemInstances?.[item.id];
        if (!instance?.blocksNextStage) {
          return;
        }
        const completed = Boolean(process?.completions?.[item.id]);
        if (completed) {
          return;
        }
        sources.push({
          targetStageIndex: stageIndex + 1,
          reason: `„${item.title}” (etap ${stageIndex + 1}: ${stage.title}) nie jest ukończone`,
        });
      });
    });
  });

  return sources;
}

/** Wspólny kontrakt dla Ustaleń i Karty zmian budowlanych — obie blokują ten sam sposób. */
export type AgreementBlockCandidate = {
  title: string;
  acceptanceDeadlineStageId: string | null;
  blocksNextStage: boolean;
  isFullyAccepted: boolean;
};

export function buildAgreementBlockSources(
  template: ProcessTemplate,
  agreements: AgreementBlockCandidate[],
  labelPrefix = "Ustalenie",
): StageBlockSource[] {
  const sources: StageBlockSource[] = [];

  agreements.forEach((agreement) => {
    if (!agreement.blocksNextStage || !agreement.acceptanceDeadlineStageId || agreement.isFullyAccepted) {
      return;
    }
    const stageIndex = template.stages.findIndex(
      (stage) => stage.id === agreement.acceptanceDeadlineStageId,
    );
    if (stageIndex < 0) {
      return;
    }
    sources.push({
      targetStageIndex: stageIndex,
      reason: `${labelPrefix} „${agreement.title}” wymaga akceptacji przed etapem „${template.stages[stageIndex].title}”`,
    });
  });

  return sources;
}

/**
 * Etapy z niekompletnymi elementami, które NIE blokują (checkbox niezaznaczony) —
 * do wyświetlenia jako "miękkie" ostrzeżenie, gdy zespół przeszedł dalej mimo braków.
 */
export function findUnblockedIncompleteStagesBeforeActive(
  template: ProcessTemplate,
  process: ProjectProcess | null | undefined,
  blockedStageIndexes: Set<number>,
): number[] {
  if (!process?.activeStageId) {
    return [];
  }
  const activeIndex = template.stages.findIndex((stage) => stage.id === process.activeStageId);
  if (activeIndex < 0) {
    return [];
  }

  const warnedIndexes: number[] = [];
  for (let index = 0; index < activeIndex; index += 1) {
    if (blockedStageIndexes.has(index)) {
      continue;
    }
    const stage = template.stages[index];
    const items = stage.milestones.flatMap((milestone) => milestone.items);
    if (!items.length) {
      continue;
    }
    const allDone = items.every((item) => Boolean(process?.completions?.[item.id]));
    if (!allDone) {
      warnedIndexes.push(index);
    }
  }

  return warnedIndexes;
}
