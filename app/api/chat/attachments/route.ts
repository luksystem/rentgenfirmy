import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getUserDisplayName } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertChatRoomMember } from "@/lib/chat/room-access";
import { classifyAttachmentKind, validateChatAttachmentFile } from "@/lib/chat/attachments";
import { PROJECT_DOCUMENTS_BUCKET } from "@/lib/documents/attachments";
import { dispatchChatMessageNotifications } from "@/lib/notifications/chat-message";

function extensionOf(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "bin";
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedProfile();
    const formData = await request.formData();
    const roomId = String(formData.get("roomId") ?? "").trim();
    const caption = String(formData.get("body") ?? "").trim();
    const replyToId = String(formData.get("replyToId") ?? "").trim() || null;
    const file = formData.get("file");

    if (!roomId || !(file instanceof File)) {
      return NextResponse.json({ error: "Podaj pokój i plik." }, { status: 400 });
    }

    validateChatAttachmentFile(file);

    const admin = getSupabaseAdmin();
    await assertChatRoomMember(admin, actor.userId, roomId);

    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .select("id, name, project_id, client_id")
      .eq("id", roomId)
      .maybeSingle();
    if (roomError) throw new Error(roomError.message);
    if (!room) {
      return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
    }

    const { data: message, error: messageError } = await admin
      .from("chat_messages")
      .insert({ room_id: roomId, author_id: actor.userId, body: caption, reply_to_id: replyToId })
      .select("*")
      .single();
    if (messageError) throw new Error(messageError.message);

    const extension = extensionOf(file.name);
    const storagePath = `chat/${roomId}/${message.id}/${crypto.randomUUID()}.${extension}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from(PROJECT_DOCUMENTS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) {
      await admin.from("chat_messages").delete().eq("id", message.id);
      throw new Error(uploadError.message);
    }

    const kind = classifyAttachmentKind(file);

    const { data: documentRow, error: documentError } = await admin
      .from("project_documents")
      .insert({
        project_id: room.project_id,
        client_id: room.client_id,
        category: kind === "image" ? "photo" : kind === "pdf" ? "pdf" : "other",
        title: file.name,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        source: "chat",
        chat_message_id: message.id,
        created_by_name: getUserDisplayName(actor.profile),
      })
      .select("id")
      .single();
    if (documentError) {
      console.warn("[chat] project_documents mirror failed:", documentError.message);
    }

    const { data: attachment, error: attachmentError } = await admin
      .from("chat_attachments")
      .insert({
        message_id: message.id,
        project_document_id: documentRow?.id ?? null,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        storage_path: storagePath,
        kind,
      })
      .select("*")
      .single();
    if (attachmentError) throw new Error(attachmentError.message);

    await dispatchChatMessageNotifications({
      admin,
      messageId: message.id,
      roomId,
      roomName: room.name,
      authorId: actor.userId,
      authorName: getUserDisplayName(actor.profile),
      bodyPreview: caption || `Załącznik: ${file.name}`,
      linkUrl: `/czat/${roomId}`,
      mentionedProfileIds: [],
      isAllMention: false,
    }).catch((error) => console.warn("[chat] notification dispatch failed:", error));

    return NextResponse.json({ message, attachment }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
