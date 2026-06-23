import type { AgreementCommentAuthorSource } from "@/lib/dashboard/agreement-collaboration-types";
import type { AgreementAttachment } from "@/lib/dashboard/agreement-attachment-types";
import {
  AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC,
  extensionForAgreementMimeType,
  validateAgreementAttachmentFile,
  type AgreementAttachmentMediaKind,
} from "@/lib/dashboard/agreement-attachments";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase/client";

export const AGREEMENT_ATTACHMENTS_BUCKET = "agreement-attachments";

type AttachmentRow = {
  id: string;
  agreement_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  media_kind: string;
  size_bytes: number;
  position: number;
  uploaded_by_name: string;
  uploaded_by_source: string;
  created_at: string;
};

function isMediaKind(value: string): value is AgreementAttachmentMediaKind {
  return value === "image" || value === "file";
}

function isAuthorSource(value: string): value is AgreementCommentAuthorSource {
  return value === "team" || value === "client" || value === "external";
}

function rowToAttachment(row: AttachmentRow): AgreementAttachment {
  return {
    id: row.id,
    agreementId: row.agreement_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    mediaKind: isMediaKind(row.media_kind) ? row.media_kind : "file",
    sizeBytes: row.size_bytes,
    position: row.position,
    uploadedByName: row.uploaded_by_name,
    uploadedBySource: isAuthorSource(row.uploaded_by_source) ? row.uploaded_by_source : "external",
    createdAt: row.created_at,
    url: null,
  };
}

export async function attachSignedUrlsToAgreementAttachments(
  attachments: AgreementAttachment[],
): Promise<AgreementAttachment[]> {
  if (!attachments.length) {
    return attachments;
  }

  const supabase = getSupabase();
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(AGREEMENT_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.storagePath, AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return attachment;
      }

      return { ...attachment, url: data.signedUrl };
    }),
  );
}

export async function attachSignedUrlsAdmin(attachments: AgreementAttachment[]) {
  if (!attachments.length) {
    return attachments;
  }

  const supabase = getSupabaseAdmin();
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(AGREEMENT_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.storagePath, AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return attachment;
      }

      return { ...attachment, url: data.signedUrl };
    }),
  );
}

export async function fetchAgreementAttachments(agreementId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_agreement_attachments")
    .select("*")
    .eq("agreement_id", agreementId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const attachments = (data ?? []).map((row) => rowToAttachment(row as AttachmentRow));
  return attachSignedUrlsToAgreementAttachments(attachments);
}

async function uploadAgreementAttachmentInternal(input: {
  agreementId: string;
  file: File;
  authorName: string;
  authorSource: AgreementCommentAuthorSource;
  useAdmin: boolean;
}) {
  const validation = validateAgreementAttachmentFile({
    type: input.file.type,
    size: input.file.size,
  });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const supabase = input.useAdmin ? getSupabaseAdmin() : getSupabase();

  const { data: lastAttachment } = await supabase
    .from("project_agreement_attachments")
    .select("position")
    .eq("agreement_id", input.agreementId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const attachmentId = crypto.randomUUID();
  const extension = extensionForAgreementMimeType(input.file.type);
  const storagePath = `${input.agreementId}/${attachmentId}.${extension}`;

  const fileBuffer = await input.file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(AGREEMENT_ATTACHMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await supabase
    .from("project_agreement_attachments")
    .insert({
      id: attachmentId,
      agreement_id: input.agreementId,
      storage_path: storagePath,
      file_name: input.file.name.trim() || `zalacznik.${extension}`,
      mime_type: input.file.type,
      media_kind: validation.mediaKind,
      size_bytes: input.file.size,
      position: (typeof lastAttachment?.position === "number" ? lastAttachment.position : -1) + 1,
      uploaded_by_name: input.authorName.trim() || "Użytkownik",
      uploaded_by_source: input.authorSource,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(AGREEMENT_ATTACHMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  const attachment = rowToAttachment(data as AttachmentRow);
  const [withUrl] = input.useAdmin
    ? await attachSignedUrlsAdmin([attachment])
    : await attachSignedUrlsToAgreementAttachments([attachment]);
  return withUrl;
}

export async function uploadAgreementAttachment(input: {
  agreementId: string;
  file: File;
  authorName: string;
  authorSource: AgreementCommentAuthorSource;
}) {
  return uploadAgreementAttachmentInternal({ ...input, useAdmin: false });
}

export async function uploadAgreementAttachmentAdmin(input: {
  agreementId: string;
  file: File;
  authorName: string;
  authorSource: AgreementCommentAuthorSource;
}) {
  return uploadAgreementAttachmentInternal({ ...input, useAdmin: true });
}

export async function deleteAgreementAttachment(attachmentId: string) {
  const supabase = getSupabase();

  const { data: row, error: fetchError } = await supabase
    .from("project_agreement_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!row?.storage_path) {
    throw new Error("Nie znaleziono załącznika.");
  }

  const { error: deleteRowError } = await supabase
    .from("project_agreement_attachments")
    .delete()
    .eq("id", attachmentId);

  if (deleteRowError) {
    throw new Error(deleteRowError.message);
  }

  await supabase.storage.from(AGREEMENT_ATTACHMENTS_BUCKET).remove([row.storage_path]);
}
