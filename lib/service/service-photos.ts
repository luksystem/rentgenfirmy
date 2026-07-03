import type { ServicePhoto } from "@/lib/service/types";
import { getSupabase } from "@/lib/supabase/client";

export const SERVICE_PHOTOS_BUCKET = "service-photos";
export const SERVICE_PHOTOS_FILE_SIZE_LIMIT = 10 * 1024 * 1024;
export const SERVICE_PHOTOS_SIGNED_URL_TTL_SEC = 3600;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/heic" || mimeType === "image/heif") return "heic";
  return "jpg";
}

export function validateServicePhotoFile(file: File) {
  if (file.size <= 0) {
    throw new Error("Plik jest pusty.");
  }
  if (file.size > SERVICE_PHOTOS_FILE_SIZE_LIMIT) {
    throw new Error("Zdjęcie jest za duże (max 10 MB).");
  }
  const isImage =
    ALLOWED_IMAGE_TYPES.has(file.type) ||
    /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
  if (!isImage) {
    throw new Error("Dozwolone są pliki JPG, PNG, WEBP i HEIC.");
  }
}

export function normalizeServicePhotos(value: unknown): ServicePhoto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry): ServicePhoto | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Partial<ServicePhoto>;
      const storagePath = String(row.storagePath ?? "").trim();
      if (!storagePath) {
        return null;
      }
      return {
        id: String(row.id ?? crypto.randomUUID()),
        storagePath,
        fileName: String(row.fileName ?? "zdjecie.jpg").trim() || "zdjecie.jpg",
        mimeType: String(row.mimeType ?? "image/jpeg").trim() || "image/jpeg",
        caption: String(row.caption ?? "").trim(),
        createdAt: String(row.createdAt ?? new Date().toISOString()),
      };
    })
    .filter((entry): entry is ServicePhoto => entry !== null);
}

export async function uploadServicePhoto(
  serviceId: string,
  file: File,
): Promise<ServicePhoto> {
  validateServicePhotoFile(file);

  const supabase = getSupabase();
  const photoId = crypto.randomUUID();
  const extension = extensionForMimeType(file.type || "image/jpeg");
  const storagePath = `${serviceId}/${photoId}.${extension}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(SERVICE_PHOTOS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return {
    id: photoId,
    storagePath,
    fileName: file.name.trim() || `zdjecie.${extension}`,
    mimeType: file.type || "image/jpeg",
    caption: "",
    createdAt: new Date().toISOString(),
  };
}

export async function deleteServicePhotoFromStorage(storagePath: string) {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(SERVICE_PHOTOS_BUCKET).remove([storagePath]);
  if (error) {
    throw new Error(error.message);
  }
}

export type ServicePhotoWithUrl = ServicePhoto & { url: string | null };

export async function attachSignedUrlsToServicePhotos(
  photos: ServicePhoto[],
): Promise<ServicePhotoWithUrl[]> {
  if (!photos.length) {
    return [];
  }

  const supabase = getSupabase();
  return Promise.all(
    photos.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from(SERVICE_PHOTOS_BUCKET)
        .createSignedUrl(photo.storagePath, SERVICE_PHOTOS_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return { ...photo, url: null };
      }

      return { ...photo, url: data.signedUrl };
    }),
  );
}
