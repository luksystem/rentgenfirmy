export type XpLevelTier = {
  tier: number;
  label: string;
  icon: string;
  minPoints: number;
};

/** Progi poziomów — czysto prezentacyjne, nie w bazie (łatwe do zmiany w kodzie). */
export const LEVEL_TIERS: XpLevelTier[] = [
  { tier: 1, label: "Nowicjusz", icon: "seedling", minPoints: 0 },
  { tier: 2, label: "Rzemieślnik", icon: "hammer", minPoints: 200 },
  { tier: 3, label: "Ekspert", icon: "award", minPoints: 500 },
  { tier: 4, label: "Mistrz", icon: "medal", minPoints: 1000 },
  { tier: 5, label: "Legenda", icon: "crown", minPoints: 2000 },
];

export function resolveLevel(totalPoints: number) {
  const points = Math.max(0, totalPoints);
  let current = LEVEL_TIERS[0]!;
  let next: XpLevelTier | null = null;

  for (let i = 0; i < LEVEL_TIERS.length; i += 1) {
    const tier = LEVEL_TIERS[i]!;
    if (points >= tier.minPoints) {
      current = tier;
      next = LEVEL_TIERS[i + 1] ?? null;
    }
  }

  return {
    tier: current.tier,
    label: current.label,
    icon: current.icon,
    pointsIntoLevel: points - current.minPoints,
    pointsForNextLevel: next ? next.minPoints - current.minPoints : null,
  };
}
