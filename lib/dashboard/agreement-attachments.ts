export const AGREEMENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const AGREEMENT_FILE_MAX_BYTES = 15 * 1024 * 1024;
export const AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC = 60 * 60;

export const AGREEMENT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export const AGREEMENT_FILE_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export type AgreementAttachmentMediaKind = "image" | "file";

export function getAgreementAttachmentMediaKind(mimeType: string): AgreementAttachmentMediaKind | null {
  if (
    AGREEMENT_IMAGE_MIME_TYPES.includes(mimeType as (typeof AGREEMENT_IMAGE_MIME_TYPES)[number])
  ) {
    return "image";
  }
  if (AGREEMENT_FILE_MIME_TYPES.includes(mimeType as (typeof AGREEMENT_FILE_MIME_TYPES)[number])) {
    return "file";
  }
  return null;
}

export function validateAgreementAttachmentFile(file: { type: string; size: number }) {
  const mediaKind = getAgreementAttachmentMediaKind(file.type);
  if (!mediaKind) {
    return {
      ok: false as const,
      error:
        "Dozwolone są zdjęcia (JPG, PNG, WebP, GIF) lub pliki PDF, Word, Excel, TXT, ZIP.",
    };
  }

  if (mediaKind === "image" && file.size > AGREEMENT_IMAGE_MAX_BYTES) {
    return { ok: false as const, error: "Zdjęcie może mieć maksymalnie 5 MB." };
  }

  if (mediaKind === "file" && file.size > AGREEMENT_FILE_MAX_BYTES) {
    return { ok: false as const, error: "Plik może mieć maksymalnie 15 MB." };
  }

  return { ok: true as const, mediaKind };
}

export function extensionForAgreementMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.ms-excel":
      return "xls";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "text/plain":
      return "txt";
    case "application/zip":
    case "application/x-zip-compressed":
      return "zip";
    default:
      return "bin";
  }
}
