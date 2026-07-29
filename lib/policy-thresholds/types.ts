// Progi/liczby będące polityką firmy, nie atrybutem projektu ani szablonu (docs/CLAUDE.md —
// "kod zna mechanizmy, szablon zna wartości"; te wartości nie różnią się per projekt/szablon,
// więc żyją w ustawieniach globalnych, nie w process_stages). Wzorzec jak lib/field-options.ts.
export type PolicyThresholds = {
  /** ROT (app/rot/page.tsx) — pozycja bez ruchu dłużej niż N dni dostaje badge "bez ruchu". */
  rotStagnationDays: number;
  /** Gwarancja (lib/project/warranty.ts) — powiadomienie/status "kończy się wkrótce" N dni przed końcem. */
  warrantyExpiryNoticeDays: number;
  /** Bezpiecznik ciszy (docs/08 D3/D19, faza 8+, jeszcze nie zaimplementowane) — brak aktywności
   *  N dni dla projektu "w trakcie" wyzwala eskalację. */
  silenceTimeoutInProgressDays: number;
  /** Bezpiecznik ciszy — jw., dla projektu wstrzymanego (dłuższe okno, świadomie zawieszony). */
  silenceTimeoutHoldDays: number;
  /** Ostrzeżenie przed zadziałaniem bezpiecznika ciszy, N dni przed progiem. */
  silenceWarningDays: number;
  /** Histereza aktywności (faza 8+) — dolny próg w dniach do przełączenia projektu w stan mniej aktywny. */
  activityHysteresisLowDays: number;
  /** Histereza aktywności — górny próg w dniach do przełączenia w stan bardziej aktywny. */
  activityHysteresisHighDays: number;
  /** Zastępstwa (faza 8+) — nieobecność odpowiedzialnego krótsza niż N dni roboczych nie wymaga
   *  formalnego zastępstwa. */
  substituteRequiredWorkingDays: number;
};

export const DEFAULT_POLICY_THRESHOLDS: PolicyThresholds = {
  rotStagnationDays: 5,
  warrantyExpiryNoticeDays: 30,
  silenceTimeoutInProgressDays: 30,
  silenceTimeoutHoldDays: 90,
  silenceWarningDays: 25,
  activityHysteresisLowDays: 30,
  activityHysteresisHighDays: 45,
  substituteRequiredWorkingDays: 2,
};

export function normalizePolicyThresholds(value: Partial<PolicyThresholds> | null | undefined): PolicyThresholds {
  const source = value ?? {};
  const result = { ...DEFAULT_POLICY_THRESHOLDS };
  for (const key of Object.keys(DEFAULT_POLICY_THRESHOLDS) as (keyof PolicyThresholds)[]) {
    const candidate = source[key];
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      result[key] = candidate;
    }
  }
  return result;
}
