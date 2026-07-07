export const KNOWLEDGE_SOURCE_TYPES = [
  "pdf",
  "text",
  "whatsapp",
  "link",
  "youtube",
  "note",
  "image",
] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, string> = {
  pdf: "PDF",
  text: "Plik tekstowy",
  whatsapp: "Eksport czatu WhatsApp",
  link: "Link / dokumentacja",
  youtube: "Film YouTube",
  note: "Wpisany tekst",
  image: "Zdjęcie (analiza AI)",
};

export const KNOWLEDGE_SOURCE_STATUSES = ["pending", "processing", "ready", "error"] as const;
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number];

export const KNOWLEDGE_SOURCE_STATUS_LABELS: Record<KnowledgeSourceStatus, string> = {
  pending: "Czeka na przetworzenie",
  processing: "Przetwarzanie…",
  ready: "Gotowe",
  error: "Błąd",
};

export type KnowledgeSource = {
  id: string;
  type: KnowledgeSourceType;
  title: string;
  description: string;
  url: string | null;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  status: KnowledgeSourceStatus;
  errorMessage: string | null;
  charCount: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeChunk = {
  id: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  createdAt: string;
};

/** Wynik sugestii AI prezentowany klientowi w kreatorze zgłoszenia serwisowego. */
export type KnowledgeSuggestionResult = {
  hasSuggestion: boolean;
  summary: string;
  steps: string[];
  confidence: "high" | "medium" | "low";
  sourceTitles: string[];
  usedInternet: boolean;
  followUpQuestion: string | null;
};
