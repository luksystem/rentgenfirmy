export type KnowledgeBaseSettings = {
  /** Włącza krok "sugestie AI" w publicznym formularzu zgłoszenia serwisowego. */
  enableIntakeSuggestions: boolean;
  /**
   * Zarezerwowane na kolejną fazę — realne przeszukiwanie wiarygodnych źródeł internetowych.
   * Na razie zawsze `false`; przełącznik w ustawieniach jest wyłączony i oznaczony „wkrótce”.
   */
  useInternetSources: boolean;
};

export const DEFAULT_KNOWLEDGE_BASE_SETTINGS: KnowledgeBaseSettings = {
  enableIntakeSuggestions: true,
  useInternetSources: false,
};

export function normalizeKnowledgeBaseSettings(
  input: Partial<KnowledgeBaseSettings> | null | undefined,
): KnowledgeBaseSettings {
  return {
    enableIntakeSuggestions:
      typeof input?.enableIntakeSuggestions === "boolean"
        ? input.enableIntakeSuggestions
        : DEFAULT_KNOWLEDGE_BASE_SETTINGS.enableIntakeSuggestions,
    // Internet source support isn't implemented yet — force off regardless of stored value.
    useInternetSources: false,
  };
}
