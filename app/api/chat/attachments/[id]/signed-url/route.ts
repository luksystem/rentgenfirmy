import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertChatRoomMember } from "@/lib/chat/room-access";
import { PROJECT_DOCUMENTS_BUCKET, PROJECT_DOCUMENTS_SIGNED_URL_TTL_SEC } from "@/lib/documents/attachments";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();

    const { data: attachment, error } = await admin
      .from("chat_attachments")
      .select("id, storage_path, message_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!attachment) {
      return NextResponse.json({ error: "Nie znaleziono załącznika." }, { status: 404 });
    }

    const { data: message, error: messageError } = await admin
      .from("chat_messages")
      .select("room_id")
      .eq("id", attachment.message_id)
      .maybeSingle();
    if (messageError) throw new Error(messageError.message);
    if (!message) {
      return NextResponse.json({ error: "Nie znaleziono wiadomości." }, { status: 404 });
    }

    await assertChatRoomMember(admin, userId, message.room_id);

    const { data: signed, error: signError } = await admin.storage
      .from(PROJECT_DOCUMENTS_BUCKET)
      .createSignedUrl(attachment.storage_path, PROJECT_DOCUMENTS_SIGNED_URL_TTL_SEC);
    if (signError || !signed?.signedUrl) {
      throw new Error(signError?.message ?? "Nie udało się wygenerować linku.");
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    return jsonError(error);
  }
}
