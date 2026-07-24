export const DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS = `Uporządkuj poniższy opis dla klienta końcowego systemu smart home. Podziel go na:
- Kontekst (czego dotyczy problem/temat — 2-3 zdania),
- Kroki (ponumerowana, konkretna sekwencja działań — każdy krok jako osobna, krótka pozycja),
- Wskazówki (uwagi, ostrzeżenia, częste błędy).

Pisz prostym językiem, bez żargonu technicznego, po polsku. Nie wymyślaj informacji, których nie ma
w oryginalnym tekście — jedynie porządkuj i doprecyzowuj styl.`;

const MAX_PROMPT_INSTRUCTIONS_CHARS = 6_000;

export type SmartHomeKbAiSettings = {
  /** Instrukcje wstawiane do promptu AI porządkującego treść artykułu — edytowalne przez administratora. */
  restructurePromptInstructions: string;
};

export const DEFAULT_SMART_HOME_KB_AI_SETTINGS: SmartHomeKbAiSettings = {
  restructurePromptInstructions: DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS,
};

export function normalizeSmartHomeKbAiSettings(
  input: Partial<SmartHomeKbAiSettings> | null | undefined,
): SmartHomeKbAiSettings {
  const raw =
    typeof input?.restructurePromptInstructions === "string"
      ? input.restructurePromptInstructions.trim()
      : "";

  return {
    restructurePromptInstructions: raw
      ? raw.slice(0, MAX_PROMPT_INSTRUCTIONS_CHARS)
      : DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS,
  };
}
