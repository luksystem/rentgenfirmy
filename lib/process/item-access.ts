import type { ProcessItem } from "@/lib/process/types";

/**
 * Czy użytkownik może otworzyć/pracować na elemencie procesu.
 * Odbiór wewnętrzny jest zawsze dostępny. Poza tym element jest blokowany, gdy jego
 * etap jest zablokowany — patrz `lib/process/stage-gate.ts` (computeStageGate).
 */
export function canOpenProcessItem(
  item: ProcessItem,
  context: {
    stageIndex: number;
    blockedStageIndexes?: Set<number>;
  },
): boolean {
  if (item.isInternalAcceptance) {
    return true;
  }

  return !context.blockedStageIndexes?.has(context.stageIndex);
}
