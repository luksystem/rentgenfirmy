import type { ChatAttachmentKind } from "@/lib/chat/types";

export const CHAT_ATTACHMENTS_FILE_SIZE_LIMIT = 25 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const OFFICE_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const CAD_EXTENSIONS = new Set(["dwg", "dxf", "skp", "step", "stp", "ifc", "rvt"]);

const ALLOWED_MIME_TYPES = new Set<string>([
  "application/pdf",
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...OFFICE_MIME_TYPES,
]);

function extensionOf(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function validateChatAttachmentFile(file: { name: string; size: number; type: string }) {
  if (file.size <= 0) {
    throw new Error("Plik jest pusty.");
  }
  if (file.size > CHAT_ATTACHMENTS_FILE_SIZE_LIMIT) {
    throw new Error("Plik jest za duży (max 25 MB).");
  }
  const extension = extensionOf(file.name);
  if (ALLOWED_MIME_TYPES.has(file.type) || CAD_EXTENSIONS.has(extension) || extension === "pdf") {
    return;
  }
  throw new Error("Ten typ pliku nie jest obsługiwany w czacie.");
}

export function classifyAttachmentKind(file: { name: string; type: string }): ChatAttachmentKind {
  const extension = extensionOf(file.name);
  if (IMAGE_MIME_TYPES.has(file.type) || file.type.startsWith("image/")) {
    return "image";
  }
  if (VIDEO_MIME_TYPES.has(file.type) || file.type.startsWith("video/")) {
    return "video";
  }
  if (file.type === "application/pdf" || extension === "pdf") {
    return "pdf";
  }
  if (OFFICE_MIME_TYPES.has(file.type)) {
    return "office";
  }
  if (CAD_EXTENSIONS.has(extension)) {
    return "cad";
  }
  return "other";
}
