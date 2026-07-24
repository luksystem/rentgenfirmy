import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push/send-push";

type AdminClient = SupabaseClient;

/**
 * Powiadomienia czatu — Faza 1: in-app (user_notifications) + push, bez pełnego dopięcia do
 * lib/notifications/dispatch.ts (wymagałoby rejestracji nowych EmailTemplateKind w systemie
 * ustawień e-mail — poza zakresem MVP, e-mail dla czatu zaplanowany w Fazie 2+).
 */
export async function dispatchChatMessageNotifications(params: {
  admin: AdminClient;
  messageId: string;
  roomId: string;
  roomName: string;
  authorId: string | null;
  authorName: string;
  bodyPreview: string;
  linkUrl: string;
  mentionedProfileIds: string[];
  isAllMention: boolean;
}) {
  const { admin } = params;
  const { data: members, error } = await admin
    .from("chat_room_members")
    .select("profile_id, muted")
    .eq("room_id", params.roomId);
  if (error) {
    throw new Error(error.message);
  }

  const recipients = (members ?? []).filter(
    (member) => member.profile_id !== params.authorId && !member.muted,
  );
  if (!recipients.length) {
    return;
  }

  const mentionedSet = new Set(params.mentionedProfileIds);
  const now = new Date().toISOString();
  const preview = params.bodyPreview.slice(0, 160) || "(załącznik)";

  const rows = recipients.map((member) => {
    const isMentioned = params.isAllMention || mentionedSet.has(member.profile_id);
    return {
      id: crypto.randomUUID(),
      profile_id: member.profile_id,
      kind: isMentioned ? "chat_mention" : "chat_message",
      title: isMentioned
        ? `${params.authorName} oznaczył(a) Cię w #${params.roomName}`
        : `Nowa wiadomość w #${params.roomName}`,
      body: `${params.authorName}: ${preview}`,
      link_url: params.linkUrl,
      source_id: `chat_message:${params.messageId}:${member.profile_id}`,
      created_at: now,
    };
  });

  const { error: insertError } = await admin.from("user_notifications").insert(rows);
  if (insertError && !insertError.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(insertError.message);
  }

  await Promise.all(
    recipients.map((member) => {
      const isMentioned = params.isAllMention || mentionedSet.has(member.profile_id);
      return sendPushToUser(member.profile_id, {
        title: isMentioned ? `${params.authorName} oznaczył(a) Cię` : `#${params.roomName}`,
        body: `${params.authorName}: ${preview}`,
        url: params.linkUrl,
        tag: `chat-room-${params.roomId}`,
      }).catch((pushError) => console.warn("[chat] push failed:", pushError));
    }),
  );
}

export async function notifyChatRoomInvite(params: {
  admin: AdminClient;
  profileId: string;
  roomName: string;
  invitedByName: string;
  linkUrl: string;
}) {
  const { admin } = params;
  const now = new Date().toISOString();
  const sourceId = `chat_room_invite:${params.profileId}:${params.linkUrl}`;

  const { data: existing } = await admin
    .from("user_notifications")
    .select("id")
    .eq("source_id", sourceId)
    .limit(1);
  if ((existing ?? []).length > 0) {
    return;
  }

  const { error } = await admin.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: params.profileId,
    kind: "chat_room_invite",
    title: `Zaproszono Cię do #${params.roomName}`,
    body: `${params.invitedByName} dodał(a) Cię do pokoju „${params.roomName}”.`,
    link_url: params.linkUrl,
    source_id: sourceId,
    created_at: now,
  });
  if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(error.message);
  }

  await sendPushToUser(params.profileId, {
    title: "Zaproszenie do czatu",
    body: `${params.invitedByName} dodał(a) Cię do „${params.roomName}”.`,
    url: params.linkUrl,
    tag: `chat-invite-${params.profileId}`,
  }).catch((pushError) => console.warn("[chat] invite push failed:", pushError));
}
