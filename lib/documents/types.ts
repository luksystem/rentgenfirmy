export const PROJECT_DOCUMENT_CATEGORIES = [
  "photo",
  "scan",
  "pdf",
  "plan",
  "protocol",
  "other",
] as const;

export type ProjectDocumentCategory = (typeof PROJECT_DOCUMENT_CATEGORIES)[number];

export const PROJECT_DOCUMENT_CATEGORY_LABELS: Record<ProjectDocumentCategory, string> = {
  photo: "Zdjęcie",
  scan: "Skan",
  pdf: "PDF",
  plan: "Plan / rysunek",
  protocol: "Protokół",
  other: "Inne",
};

export type ProjectDocumentSource = "manual" | "kanban";

export type ProjectDocument = {
  id: string;
  projectId: string | null;
  clientId: string | null;
  category: ProjectDocumentCategory;
  title: string;
  description: string;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  source: ProjectDocumentSource;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string | null;
};

export type ProjectDocumentInput = {
  projectId?: string | null;
  clientId?: string | null;
  category: ProjectDocumentCategory;
  title: string;
  description?: string;
  source?: ProjectDocumentSource;
};

export function normalizeProjectDocumentInput(input: ProjectDocumentInput): ProjectDocumentInput {
  return {
    ...input,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    projectId: input.projectId || null,
    clientId: input.clientId || null,
    source: input.source ?? "manual",
  };
}

export function isImageDocument(document: Pick<ProjectDocument, "mimeType" | "category">) {
  if (document.mimeType?.startsWith("image/")) {
    return true;
  }
  return document.category === "photo";
}
