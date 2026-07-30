// D44 — załączniki zmian projektowych.
//
// Ustalenia miały je od dawna, zmiany nie miały żadnej tabeli powiązanej. Odwzorowane z
// `project-agreement-attachments-repository.ts`: ta sama walidacja pliku, ten sam limit, ten sam
// układ kolumn — bo to ta sama potrzeba, tylko po drugiej stronie.
//
// Zdjęcie przy znalezisku niosącym koszt to dowód, który potem rozstrzyga spór z inwestorem,
// więc nie może być gorzej obsłużone niż załącznik do ustalenia.
import {
  extensionForAgreementMimeType,
  validateAgreementAttachmentFile,
} from "@/lib/dashboard/agreement-attachments";
import { getSupabase } from "@/lib/supabase/client";

export const CHANGE_REQUEST_ATTACHMENTS_BUCKET = "change-request-attachments";

export type ChangeRequestAttachmentAuthorSource = "team" | "client" | "external";

export async function uploadChangeRequestAttachment(input: {
  changeRequestId: string;
  file: File;
  authorName: string;
  authorSource: ChangeRequestAttachmentAuthorSource;
}): Promise<{ id: string; storagePath: string }> {
  const validation = validateAgreementAttachmentFile({
    type: input.file.type,
    size: input.file.size,
  });
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const supabase = getSupabase();

  const { data: lastAttachment } = await supabase
    .from("project_change_request_attachments")
    .select("position")
    .eq("change_request_id", input.changeRequestId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const attachmentId = crypto.randomUUID();
  const extension = extensionForAgreementMimeType(input.file.type);
  const storagePath = `${input.changeRequestId}/${attachmentId}.${extension}`;

  const fileBuffer = await input.file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(CHANGE_REQUEST_ATTACHMENTS_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: input.file.type, upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error } = await supabase.from("project_change_request_attachments").insert({
    id: attachmentId,
    change_request_id: input.changeRequestId,
    storage_path: storagePath,
    file_name: input.file.name.trim() || `zalacznik.${extension}`,
    mime_type: input.file.type,
    media_kind: validation.mediaKind,
    size_bytes: input.file.size,
    position: (typeof lastAttachment?.position === "number" ? lastAttachment.position : -1) + 1,
    uploaded_by_name: input.authorName.trim() || "Użytkownik",
    uploaded_by_source: input.authorSource,
  });

  if (error) {
    // Plik bez wiersza w bazie byłby śmieciem nie do znalezienia — sprzątamy, tak jak przy ustaleniach.
    await supabase.storage.from(CHANGE_REQUEST_ATTACHMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return { id: attachmentId, storagePath };
}
