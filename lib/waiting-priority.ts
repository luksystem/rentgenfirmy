import type { Priority } from "@/lib/types";

export type WaitingFlags = {
  waitingDependsOnUs?: boolean;
  waitingIncreasesCostLater?: boolean;
  waitingBlocksSettlement?: boolean;
};

export function countWaitingFlags(flags: WaitingFlags) {
  return [
    flags.waitingDependsOnUs,
    flags.waitingIncreasesCostLater,
    flags.waitingBlocksSettlement,
  ].filter(Boolean).length;
}

/** 1 zaznaczony → Wysoki, 2+ → Krytyczny. Brak zaznaczeń → bez zmiany. */
export function priorityFromWaitingFlags(flags: WaitingFlags): Priority | null {
  const count = countWaitingFlags(flags);

  if (count >= 2) {
    return "Krytyczny";
  }

  if (count === 1) {
    return "Wysoki";
  }

  return null;
}

export function applyWaitingPriority<T extends { priority: Priority } & WaitingFlags>(
  values: T,
  isWaiting: boolean,
): T {
  if (!isWaiting) {
    return {
      ...values,
      waitingDependsOnUs: undefined,
      waitingIncreasesCostLater: undefined,
      waitingBlocksSettlement: undefined,
    };
  }

  const autoPriority = priorityFromWaitingFlags(values);

  return {
    ...values,
    priority: autoPriority ?? values.priority,
  };
}
