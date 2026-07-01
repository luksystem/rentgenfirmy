export const PROJECT_DOCUMENTS_BUCKET = "project-documents";
export const PROJECT_DOCUMENTS_FILE_SIZE_LIMIT = 15 * 1024 * 1024;
export const PROJECT_DOCUMENTS_SIGNED_URL_TTL_SEC = 3600;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

export function validateProjectDocumentFile(file: File) {
  if (file.size <= 0) {
    throw new Error("Plik jest pusty.");
  }
  if (file.size > PROJECT_DOCUMENTS_FILE_SIZE_LIMIT) {
    throw new Error("Plik jest za duży (max 15 MB).");
  }
  if (!ALLOWED_MIME_TYPES.has(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Dozwolone są pliki PDF oraz zdjęcia (JPG, PNG, WEBP).");
  }
}
