export const KANBAN_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const KANBAN_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const KANBAN_ATTACHMENT_SIGNED_URL_TTL_SEC = 60 * 60;

export const KANBAN_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export const KANBAN_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type KanbanMediaKind = "image" | "video";

export function getKanbanMediaKind(mimeType: string): KanbanMediaKind | null {
  if (KANBAN_IMAGE_MIME_TYPES.includes(mimeType as (typeof KANBAN_IMAGE_MIME_TYPES)[number])) {
    return "image";
  }
  if (KANBAN_VIDEO_MIME_TYPES.includes(mimeType as (typeof KANBAN_VIDEO_MIME_TYPES)[number])) {
    return "video";
  }
  return null;
}

export function validateKanbanAttachmentFile(file: { type: string; size: number }) {
  const mediaKind = getKanbanMediaKind(file.type);
  if (!mediaKind) {
    return {
      ok: false as const,
      error: "Dozwolone są zdjęcia (JPG, PNG, WebP, GIF) lub jeden film (MP4, WebM, MOV).",
    };
  }

  if (mediaKind === "image" && file.size > KANBAN_IMAGE_MAX_BYTES) {
    return { ok: false as const, error: "Zdjęcie może mieć maksymalnie 3 MB." };
  }

  if (mediaKind === "video" && file.size > KANBAN_VIDEO_MAX_BYTES) {
    return { ok: false as const, error: "Film może mieć maksymalnie 50 MB." };
  }

  return { ok: true as const, mediaKind };
}

export function extensionForMimeType(mimeType: string) {
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
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}
