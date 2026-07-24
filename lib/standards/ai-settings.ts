export const DEFAULT_COMPANY_STANDARD_RESTRUCTURE_INSTRUCTIONS = `Uporządkuj poniższy opis w wewnętrzny standard/procedurę firmową dla pracowników. Podziel go na:
- Kontekst (dlaczego ten standard istnieje, jaki problem rozwiązuje — 2-3 zdania),
- Kroki (ponumerowana, konkretna sekwencja działań — każdy krok jako osobna, krótka pozycja),
- Wskazówki (uwagi, wyjątki, częste błędy).

Pisz prostym, jednoznacznym językiem, po polsku. Nie wymyślaj informacji, których nie ma w oryginalnym
tekście — jedynie porządkuj i doprecyzowuj styl.`;

const MAX_PROMPT_INSTRUCTIONS_CHARS = 6_000;

export type CompanyStandardAiSettings = {
  /** Instrukcje wstawiane do promptu AI porządkującego treść standardu — edytowalne przez administratora. */
  restructurePromptInstructions: string;
};

export const DEFAULT_COMPANY_STANDARD_AI_SETTINGS: CompanyStandardAiSettings = {
  restructurePromptInstructions: DEFAULT_COMPANY_STANDARD_RESTRUCTURE_INSTRUCTIONS,
};

export function normalizeCompanyStandardAiSettings(
  input: Partial<CompanyStandardAiSettings> | null | undefined,
): CompanyStandardAiSettings {
  const raw =
    typeof input?.restructurePromptInstructions === "string"
      ? input.restructurePromptInstructions.trim()
      : "";

  return {
    restructurePromptInstructions: raw
      ? raw.slice(0, MAX_PROMPT_INSTRUCTIONS_CHARS)
      : DEFAULT_COMPANY_STANDARD_RESTRUCTURE_INSTRUCTIONS,
  };
}
