export const AVATARS_BUCKET = "avatars";
export const AVATAR_FILE_SIZE_LIMIT = 2 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function extensionForAvatarMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function validateAvatarFile(file: File) {
  if (file.size <= 0) {
    throw new Error("Plik jest pusty.");
  }
  if (file.size > AVATAR_FILE_SIZE_LIMIT) {
    throw new Error("Zdjęcie jest za duże (max 2 MB).");
  }
  const isImage =
    ALLOWED_AVATAR_TYPES.has(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!isImage) {
    throw new Error("Dozwolone formaty: JPG, PNG, WEBP.");
  }
}

export function getAvatarPublicUrl(storagePath: string | null | undefined) {
  const path = storagePath?.trim();
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return null;
  return `${baseUrl}/storage/v1/object/public/${AVATARS_BUCKET}/${path}`;
}

export function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
