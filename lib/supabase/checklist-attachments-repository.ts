import {
  AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC,
  extensionForAgreementMimeType,
  validateAgreementAttachmentFile,
} from "@/lib/dashboard/agreement-attachments";
import type { ChecklistLineAttachment } from "@/lib/process/types";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase/client";

export const CHECKLIST_ATTACHMENTS_BUCKET = "checklist-attachments";

const CHECKLIST_ATTACHMENTS_FILE_SIZE_LIMIT = 15 * 1024 * 1024;

let checklistAttachmentsBucketReady = false;

export async function ensureChecklistAttachmentsBucket() {
  if (checklistAttachmentsBucketReady || !isSupabaseAdminConfigured()) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.storage.getBucket(CHECKLIST_ATTACHMENTS_BUCKET);

  if (existing) {
    checklistAttachmentsBucketReady = true;
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(CHECKLIST_ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: CHECKLIST_ATTACHMENTS_FILE_SIZE_LIMIT,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }

  checklistAttachmentsBucketReady = true;
}

export async function attachSignedUrlsToChecklistAttachments(
  attachments: ChecklistLineAttachment[],
): Promise<ChecklistLineAttachment[]> {
  if (!attachments.length) {
    return attachments;
  }

  const supabase = getSupabase();
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(CHECKLIST_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.storagePath, AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return attachment;
      }

      return { ...attachment, url: data.signedUrl };
    }),
  );
}

export async function attachSignedUrlsToChecklistAttachmentsAdmin(
  attachments: ChecklistLineAttachment[],
): Promise<ChecklistLineAttachment[]> {
  if (!attachments.length) {
    return attachments;
  }

  const supabase = getSupabaseAdmin();
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(CHECKLIST_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.storagePath, AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return attachment;
      }

      return { ...attachment, url: data.signedUrl };
    }),
  );
}

export async function uploadChecklistLineAttachmentAdmin(input: {
  projectProcessItemId: string;
  lineId: string;
  file: File;
  uploadedBy: string;
}): Promise<ChecklistLineAttachment> {
  const validation = validateAgreementAttachmentFile({
    type: input.file.type,
    size: input.file.size,
  });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  await ensureChecklistAttachmentsBucket();

  const supabase = getSupabaseAdmin();
  const attachmentId = crypto.randomUUID();
  const extension = extensionForAgreementMimeType(input.file.type);
  const storagePath = `${input.projectProcessItemId}/${input.lineId}/${attachmentId}.${extension}`;
  const fileBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(CHECKLIST_ATTACHMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const attachment: ChecklistLineAttachment = {
    id: attachmentId,
    storagePath,
    fileName: input.file.name.trim() || `zalacznik.${extension}`,
    mimeType: input.file.type,
    mediaKind: validation.mediaKind,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy.trim() || "Użytkownik",
    url: null,
  };

  const [withUrl] = await attachSignedUrlsToChecklistAttachmentsAdmin([attachment]);
  return withUrl;
}

export async function deleteChecklistLineAttachmentAdmin(storagePath: string) {
  await ensureChecklistAttachmentsBucket();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(CHECKLIST_ATTACHMENTS_BUCKET).remove([storagePath]);
  if (error) {
    throw new Error(error.message);
  }
}
