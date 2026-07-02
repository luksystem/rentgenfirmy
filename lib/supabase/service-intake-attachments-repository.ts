import {
  extensionForMimeType,
  validateKanbanAttachmentFile,
} from "@/lib/process/kanban-attachments";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const SERVICE_INTAKE_ATTACHMENTS_BUCKET = "service-intake-attachments";

export async function uploadServiceIntakeAttachment(input: {
  verificationToken: string;
  file: File;
}) {
  const validation = validateKanbanAttachmentFile({
    type: input.file.type,
    size: input.file.size,
  });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const supabase = getSupabaseAdmin();
  const attachmentId = crypto.randomUUID();
  const extension = extensionForMimeType(input.file.type);
  const storagePath = `${input.verificationToken}/${attachmentId}.${extension}`;
  const fileBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(SERVICE_INTAKE_ATTACHMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from(SERVICE_INTAKE_ATTACHMENTS_BUCKET)
    .getPublicUrl(storagePath);

  return {
    kind: validation.mediaKind,
    url: publicUrlData.publicUrl,
    label: input.file.name.trim() || null,
  };
}
