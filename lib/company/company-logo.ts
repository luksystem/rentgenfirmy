export const COMPANY_ASSETS_BUCKET = "company-assets";
export const COMPANY_LOGO_FILE_SIZE_LIMIT = 2 * 1024 * 1024;

const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

export function extensionForLogoMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/svg+xml") return "svg";
  return "png";
}

export function validateCompanyLogoFile(file: File) {
  if (file.size <= 0) {
    throw new Error("Plik jest pusty.");
  }
  if (file.size > COMPANY_LOGO_FILE_SIZE_LIMIT) {
    throw new Error("Logo jest za duże (max 2 MB).");
  }
  const isImage =
    ALLOWED_LOGO_TYPES.has(file.type) ||
    /\.(jpe?g|png|webp|svg)$/i.test(file.name);
  if (!isImage) {
    throw new Error("Dozwolone formaty logo: JPG, PNG, WEBP, SVG.");
  }
}

export function getCompanyLogoPublicUrl(storagePath: string | null | undefined) {
  const path = storagePath?.trim();
  if (!path) {
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/storage/v1/object/public/${COMPANY_ASSETS_BUCKET}/${path}`;
}
