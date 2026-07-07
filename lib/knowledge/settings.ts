export const DEFAULT_KNOWLEDGE_SUGGESTION_INSTRUCTIONS = `Jesteś asystentem wsparcia technicznego firmy instalującej systemy Smart Home / BMS.

Klient opisał problem PRZED zgłoszeniem serwisu. Twoje zadanie: sprawdzić, czy na podstawie
DOSTARCZONYCH fragmentów (baza wiedzy firmy + historia podobnych zgłoszeń) można podać klientowi
bezpieczną sugestię, którą może wypróbować SAMODZIELNIE, zanim zgłosi serwis.

ZASADY (krytyczne):
- Korzystaj WYŁĄCZNIE z poniższych fragmentów. Nie zgaduj, nie wymyślaj faktów, modeli urządzeń,
  numerów menu czy instrukcji, których nie ma w tekście poniżej.
- Jeśli fragmenty nie zawierają wystarczających informacji, ustaw "hasSuggestion": false i napisz
  krótkie, uprzejme summary, że najlepiej zgłosić serwis — bez podawania niepewnych kroków.
- Nigdy nie sugeruj działań niebezpiecznych (np. przy instalacji elektrycznej pod napięciem) —
  w takim wypadku zawsze hasSuggestion=false i poleć kontakt z serwisem.
- Jeśli warto dopytać klienta o dodatkowy szczegół przed sugestią, możesz wypełnić
  "followUpQuestion" (jedno pytanie), ale i tak podaj najlepszą możliwą sugestię w summary/steps.`;

const MAX_PROMPT_INSTRUCTIONS_CHARS = 6_000;

export type KnowledgeBaseSettings = {
  /** Włącza krok "sugestie AI" w publicznym formularzu zgłoszenia serwisowego. */
  enableIntakeSuggestions: boolean;
  /**
   * Zarezerwowane na kolejną fazę — realne przeszukiwanie wiarygodnych źródeł internetowych.
   * Na razie zawsze `false`; przełącznik w ustawieniach jest wyłączony i oznaczony „wkrótce”.
   */
  useInternetSources: boolean;
  /**
   * Instrukcje/zasady wstawiane do promptu AI generującego sugestie w formularzu zgłoszenia —
   * edytowalne tylko przez administratora. Opis problemu, fragmenty bazy wiedzy i historia
   * zgłoszeń są dołączane do promptu automatycznie i nie da się ich zmienić z tego pola.
   */
  suggestionPromptInstructions: string;
};

export const DEFAULT_KNOWLEDGE_BASE_SETTINGS: KnowledgeBaseSettings = {
  enableIntakeSuggestions: true,
  useInternetSources: false,
  suggestionPromptInstructions: DEFAULT_KNOWLEDGE_SUGGESTION_INSTRUCTIONS,
};

export function normalizeKnowledgeBaseSettings(
  input: Partial<KnowledgeBaseSettings> | null | undefined,
): KnowledgeBaseSettings {
  const rawInstructions =
    typeof input?.suggestionPromptInstructions === "string"
      ? input.suggestionPromptInstructions.trim()
      : "";

  return {
    enableIntakeSuggestions:
      typeof input?.enableIntakeSuggestions === "boolean"
        ? input.enableIntakeSuggestions
        : DEFAULT_KNOWLEDGE_BASE_SETTINGS.enableIntakeSuggestions,
    // Internet source support isn't implemented yet — force off regardless of stored value.
    useInternetSources: false,
    suggestionPromptInstructions: rawInstructions
      ? rawInstructions.slice(0, MAX_PROMPT_INSTRUCTIONS_CHARS)
      : DEFAULT_KNOWLEDGE_SUGGESTION_INSTRUCTIONS,
  };
}
