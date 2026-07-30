import type { ProjectProcessSnapshot } from "@/lib/process/types";
import type { ProjectProcessSnapshotRow } from "@/lib/supabase/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const PROCESS_SNAPSHOT_PHOTOS_BUCKET = "process-snapshot-photos";

const SNAPSHOT_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

export function validateProcessSnapshotFile(file: { type: string; size: number }) {
  if (!file.type.startsWith("image/")) {
    return { ok: false as const, error: "Dozwolone są tylko zdjęcia." };
  }
  if (file.size > SNAPSHOT_IMAGE_MAX_BYTES) {
    return { ok: false as const, error: "Zdjęcie jest za duże (limit 15 MB)." };
  }
  return { ok: true as const };
}

function extensionForImageMimeType(mimeType: string) {
  switch (mimeType) {
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
    default:
      return "jpg";
  }
}

function rowToProcessSnapshot(row: ProjectProcessSnapshotRow): ProjectProcessSnapshot {
  const supabase = getSupabaseAdmin();
  const { data } = supabase.storage.from(PROCESS_SNAPSHOT_PHOTOS_BUCKET).getPublicUrl(row.storage_path);

  return {
    id: row.id,
    projectProcessItemId: row.project_process_item_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    employeeNote: row.employee_note,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name,
    url: data.publicUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProcessSnapshotByItemId(
  projectProcessItemId: string,
): Promise<ProjectProcessSnapshot | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_process_snapshots")
    .select("*")
    .eq("project_process_item_id", projectProcessItemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return rowToProcessSnapshot(data as ProjectProcessSnapshotRow);
}

/** Nadpisuje poprzednie zdjęcie tego elementu (jeden slot na element) — świadome ponowne wysłanie. */
export async function uploadProcessSnapshotAdmin(input: {
  projectProcessItemId: string;
  file: File;
  employeeNote: string | null;
  uploadedByProfileId: string | null;
  uploadedByName: string;
}): Promise<ProjectProcessSnapshot> {
  const validation = validateProcessSnapshotFile({ type: input.file.type, size: input.file.size });
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("project_process_snapshots")
    .select("storage_path")
    .eq("project_process_item_id", input.projectProcessItemId)
    .maybeSingle();

  const extension = extensionForImageMimeType(input.file.type);
  const storagePath = `${input.projectProcessItemId}/${crypto.randomUUID()}.${extension}`;
  const fileBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PROCESS_SNAPSHOT_PHOTOS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const now = new Date().toISOString();
  const { data: saved, error: saveError } = await supabase
    .from("project_process_snapshots")
    .upsert(
      {
        project_process_item_id: input.projectProcessItemId,
        storage_path: storagePath,
        file_name: input.file.name.trim() || `zdjecie.${extension}`,
        mime_type: input.file.type,
        size_bytes: input.file.size,
        employee_note: input.employeeNote?.trim() || null,
        uploaded_by: input.uploadedByProfileId,
        uploaded_by_name: input.uploadedByName.trim() || "Pracownik",
        updated_at: now,
      },
      { onConflict: "project_process_item_id" },
    )
    .select("*")
    .single();

  if (saveError) {
    throw new Error(saveError.message);
  }

  // Poprzedni plik w storage nie jest już z niczego linkowany - sprzątamy, żeby nie zostawiać śmieci.
  if (existing?.storage_path && existing.storage_path !== storagePath) {
    await supabase.storage.from(PROCESS_SNAPSHOT_PHOTOS_BUCKET).remove([existing.storage_path]);
  }

  return rowToProcessSnapshot(saved as ProjectProcessSnapshotRow);
}
