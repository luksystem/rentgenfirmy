export type DocumentationMediaKind = "photo" | "document";

export type DocumentationMediaSource =
  | "documents"
  | "checklist"
  | "kanban"
  | "agreement"
  | "change_request"
  | "snapshot";

export type DocumentationMediaItem = {
  id: string;
  kind: DocumentationMediaKind;
  source: DocumentationMediaSource;
  title: string;
  sourceLabel: string;
  url: string | null;
  mimeType: string | null;
  createdAt: string;
};
