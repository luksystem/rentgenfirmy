import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getUserDisplayName } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertChatRoomMember } from "@/lib/chat/room-access";
import { resolveMentions, type MentionCandidate } from "@/lib/chat/mentions";
import { dispatchChatMessageNotifications } from "@/lib/notifications/chat-message";

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedProfile();
    const body = (await request.json()) as { roomId?: string; body?: string; replyToId?: string | null };
    const roomId = body.roomId?.trim();
    const text = body.body?.trim() ?? "";
    if (!roomId || !text) {
      return NextResponse.json({ error: "Podaj pokój i treść wiadomości." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    await assertChatRoomMember(admin, actor.userId, roomId);

    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .select("id, name")
      .eq("id", roomId)
      .maybeSingle();
    if (roomError) throw new Error(roomError.message);
    if (!room) {
      return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
    }

    const { data: memberRows, error: membersError } = await admin
      .from("chat_room_members")
      .select("profile_id")
      .eq("room_id", roomId);
    if (membersError) throw new Error(membersError.message);

    const memberIds = (memberRows ?? []).map((row) => row.profile_id as string);
    const { data: memberProfiles, error: profilesError } = memberIds.length
      ? await admin.from("profiles").select("id, first_name, last_name").in("id", memberIds)
      : { data: [], error: null };
    if (profilesError) throw new Error(profilesError.message);

    const candidates: MentionCandidate[] = (memberProfiles ?? []).map((row) => ({
      profileId: row.id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
    }));
    const { profileIds: mentionedProfileIds, isAll } = resolveMentions(text, candidates);

    const { data: message, error: insertError } = await admin
      .from("chat_messages")
      .insert({
        room_id: roomId,
        author_id: actor.userId,
        body: text,
        reply_to_id: body.replyToId ?? null,
      })
      .select("*")
      .single();
    if (insertError) throw new Error(insertError.message);

    if (mentionedProfileIds.length || isAll) {
      const mentionRows: { message_id: string; mentioned_profile_id: string | null; is_all: boolean }[] = isAll
        ? [{ message_id: message.id, mentioned_profile_id: null, is_all: true }]
        : mentionedProfileIds.map((profileId) => ({
            message_id: message.id,
            mentioned_profile_id: profileId,
            is_all: false,
          }));
      await admin.from("chat_mentions").insert(mentionRows);
    }

    await dispatchChatMessageNotifications({
      admin,
      messageId: message.id,
      roomId,
      roomName: room.name,
      authorId: actor.userId,
      authorName: getUserDisplayName(actor.profile),
      bodyPreview: text,
      linkUrl: `/czat/${roomId}`,
      mentionedProfileIds,
      isAllMention: isAll,
    }).catch((error) => console.warn("[chat] notification dispatch failed:", error));

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
