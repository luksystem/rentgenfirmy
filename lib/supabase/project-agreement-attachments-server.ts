import type { AgreementCommentAuthorSource } from "@/lib/dashboard/agreement-collaboration-types";
import type { AgreementAttachment } from "@/lib/dashboard/agreement-attachment-types";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { touchAgreementActivity } from "@/lib/supabase/project-agreement-collaboration-repository";
import {
  AGREEMENT_ATTACHMENTS_BUCKET,
  AGREEMENT_ATTACHMENTS_FILE_SIZE_LIMIT,
  attachSignedUrlsToAgreementAttachments,
  uploadAgreementAttachmentWithClient,
} from "@/lib/supabase/project-agreement-attachments-repository";

let agreementAttachmentsBucketReady = false;

export async function ensureAgreementAttachmentsBucket() {
  if (agreementAttachmentsBucketReady || !isSupabaseAdminConfigured()) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.storage.getBucket(AGREEMENT_ATTACHMENTS_BUCKET);

  if (existing) {
    agreementAttachmentsBucketReady = true;
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(AGREEMENT_ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: AGREEMENT_ATTACHMENTS_FILE_SIZE_LIMIT,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }

  agreementAttachmentsBucketReady = true;
}

export async function attachSignedUrlsAdmin(attachments: AgreementAttachment[]) {
  return attachSignedUrlsToAgreementAttachments(attachments, getSupabaseAdmin());
}

export async function uploadAgreementAttachmentAdmin(input: {
  agreementId: string;
  file: File;
  authorName: string;
  authorSource: AgreementCommentAuthorSource;
}) {
  await ensureAgreementAttachmentsBucket();
  return uploadAgreementAttachmentWithClient({ ...input, supabase: getSupabaseAdmin() });
}

export async function deleteAgreementAttachmentAdmin(attachmentId: string) {
  await ensureAgreementAttachmentsBucket();

  const supabase = getSupabaseAdmin();

  const { data: row, error: fetchError } = await supabase
    .from("project_agreement_attachments")
    .select("storage_path, agreement_id")
    .eq("id", attachmentId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!row?.storage_path || !row.agreement_id) {
    throw new Error("Nie znaleziono załącznika.");
  }

  const { error: deleteRowError } = await supabase
    .from("project_agreement_attachments")
    .delete()
    .eq("id", attachmentId);

  if (deleteRowError) {
    throw new Error(deleteRowError.message);
  }

  await touchAgreementActivity(row.agreement_id, supabase);
  await supabase.storage.from(AGREEMENT_ATTACHMENTS_BUCKET).remove([row.storage_path]);
}
