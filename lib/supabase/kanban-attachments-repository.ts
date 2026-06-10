import type { KanbanAttachment, KanbanAuthorSide } from "@/lib/process/kanban-types";
import {
  extensionForMimeType,
  KANBAN_ATTACHMENT_SIGNED_URL_TTL_SEC,
  validateKanbanAttachmentFile,
  type KanbanMediaKind,
} from "@/lib/process/kanban-attachments";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase/client";

export const KANBAN_ATTACHMENTS_BUCKET = "kanban-attachments";

type AttachmentRow = {
  id: string;
  task_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  media_kind: string;
  size_bytes: number;
  position: number;
  is_card_cover: boolean;
  uploaded_by_side: string;
  uploaded_by_name: string;
  created_at: string;
};

function isAuthorSide(value: string): value is KanbanAuthorSide {
  return value === "team" || value === "client";
}

function isMediaKind(value: string): value is KanbanMediaKind {
  return value === "image" || value === "video";
}

function rowToAttachment(row: AttachmentRow): KanbanAttachment {
  return {
    id: row.id,
    taskId: row.task_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    mediaKind: isMediaKind(row.media_kind) ? row.media_kind : "image",
    sizeBytes: row.size_bytes,
    position: row.position,
    isCardCover: Boolean(row.is_card_cover),
    uploadedBySide: isAuthorSide(row.uploaded_by_side) ? row.uploaded_by_side : "client",
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
    url: null,
  };
}

export async function attachSignedUrlsToAttachments(
  attachments: KanbanAttachment[],
): Promise<KanbanAttachment[]> {
  if (!attachments.length) {
    return attachments;
  }

  const supabase = getSupabase();
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(KANBAN_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.storagePath, KANBAN_ATTACHMENT_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return attachment;
      }

      return { ...attachment, url: data.signedUrl };
    }),
  );
}

export async function attachSignedUrlsAdmin(attachments: KanbanAttachment[]) {
  if (!attachments.length) {
    return attachments;
  }

  const supabase = getSupabaseAdmin();
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(KANBAN_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.storagePath, KANBAN_ATTACHMENT_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return attachment;
      }

      return { ...attachment, url: data.signedUrl };
    }),
  );
}

export async function fetchAttachmentsForTaskIds(taskIds: string[]) {
  if (!taskIds.length) {
    return [];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_kanban_task_attachments")
    .select("*")
    .in("task_id", taskIds)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const attachments = (data ?? []).map((row) => rowToAttachment(row as AttachmentRow));
  return attachSignedUrlsToAttachments(attachments);
}

export async function taskBelongsToBoard(taskId: string, boardId: string) {
  const supabase = getSupabaseAdmin();

  const { data: task, error: taskError } = await supabase
    .from("process_kanban_tasks")
    .select("column_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task?.column_id) {
    return false;
  }

  const { data: column, error: columnError } = await supabase
    .from("process_kanban_columns")
    .select("board_id")
    .eq("id", task.column_id)
    .maybeSingle();

  if (columnError || !column) {
    return false;
  }

  return column.board_id === boardId;
}

export async function uploadKanbanTaskAttachment(input: {
  boardId: string;
  taskId: string;
  file: File;
  authorName: string;
  authorSide: KanbanAuthorSide;
  setAsCardCover?: boolean;
}) {
  const validation = validateKanbanAttachmentFile({
    type: input.file.type,
    size: input.file.size,
  });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const belongs = await taskBelongsToBoard(input.taskId, input.boardId);
  if (!belongs) {
    throw new Error("Nie znaleziono zgłoszenia na tej tablicy.");
  }

  const supabase = getSupabaseAdmin();

  if (validation.mediaKind === "video") {
    const { count, error: countError } = await supabase
      .from("process_kanban_task_attachments")
      .select("id", { count: "exact", head: true })
      .eq("task_id", input.taskId)
      .eq("media_kind", "video");

    if (countError) {
      throw new Error(countError.message);
    }

    if ((count ?? 0) > 0) {
      throw new Error("Na jednej karcie może być tylko jeden film.");
    }
  }

  const { data: lastAttachment } = await supabase
    .from("process_kanban_task_attachments")
    .select("position")
    .eq("task_id", input.taskId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const attachmentId = crypto.randomUUID();
  const extension = extensionForMimeType(input.file.type);
  const storagePath = `${input.boardId}/${input.taskId}/${attachmentId}.${extension}`;

  const fileBuffer = await input.file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(KANBAN_ATTACHMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const shouldSetCover = validation.mediaKind === "image" && Boolean(input.setAsCardCover);

  if (shouldSetCover) {
    const { error: clearCoverError } = await supabase
      .from("process_kanban_task_attachments")
      .update({ is_card_cover: false })
      .eq("task_id", input.taskId)
      .eq("is_card_cover", true);

    if (clearCoverError) {
      await supabase.storage.from(KANBAN_ATTACHMENTS_BUCKET).remove([storagePath]);
      throw new Error(clearCoverError.message);
    }
  }

  const { data, error } = await supabase
    .from("process_kanban_task_attachments")
    .insert({
      id: attachmentId,
      task_id: input.taskId,
      storage_path: storagePath,
      file_name: input.file.name.trim() || `zalacznik.${extension}`,
      mime_type: input.file.type,
      media_kind: validation.mediaKind,
      size_bytes: input.file.size,
      position: (typeof lastAttachment?.position === "number" ? lastAttachment.position : -1) + 1,
      is_card_cover: shouldSetCover,
      uploaded_by_side: input.authorSide,
      uploaded_by_name: input.authorName.trim() || "Klient",
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(KANBAN_ATTACHMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  const attachment = rowToAttachment(data as AttachmentRow);
  const [withUrl] = await attachSignedUrlsAdmin([attachment]);
  return withUrl;
}

async function fetchAttachmentRow(attachmentId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("process_kanban_task_attachments")
    .select("*")
    .eq("id", attachmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AttachmentRow | null) ?? null;
}

export async function setKanbanTaskAttachmentCover(input: {
  boardId: string;
  taskId: string;
  attachmentId: string;
  isCardCover: boolean;
}) {
  const belongs = await taskBelongsToBoard(input.taskId, input.boardId);
  if (!belongs) {
    throw new Error("Nie znaleziono zgłoszenia na tej tablicy.");
  }

  const row = await fetchAttachmentRow(input.attachmentId);
  if (!row || row.task_id !== input.taskId) {
    throw new Error("Nie znaleziono załącznika.");
  }

  if (row.media_kind !== "image") {
    throw new Error("Okładką karty może być tylko zdjęcie.");
  }

  const supabase = getSupabaseAdmin();

  if (input.isCardCover) {
    const { error: clearError } = await supabase
      .from("process_kanban_task_attachments")
      .update({ is_card_cover: false })
      .eq("task_id", input.taskId)
      .eq("is_card_cover", true);

    if (clearError) {
      throw new Error(clearError.message);
    }
  }

  const { data, error } = await supabase
    .from("process_kanban_task_attachments")
    .update({ is_card_cover: input.isCardCover })
    .eq("id", input.attachmentId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const attachment = rowToAttachment(data as AttachmentRow);
  const [withUrl] = await attachSignedUrlsAdmin([attachment]);
  return withUrl;
}

export async function clearKanbanTaskAttachmentCover(input: { boardId: string; taskId: string }) {
  const belongs = await taskBelongsToBoard(input.taskId, input.boardId);
  if (!belongs) {
    throw new Error("Nie znaleziono zgłoszenia na tej tablicy.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("process_kanban_task_attachments")
    .update({ is_card_cover: false })
    .eq("task_id", input.taskId)
    .eq("is_card_cover", true);

  if (error) {
    throw new Error(error.message);
  }
}
