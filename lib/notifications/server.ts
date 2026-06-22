import type { MentionCandidate, UserNotificationKind } from "@/lib/notifications/types";
import { resolveMentionTargets } from "@/lib/notifications/mentions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function createKanbanMentionNotificationsServer(input: {
  commentId: string;
  taskId: string;
  taskTitle: string;
  body: string;
  authorName: string;
  candidates: MentionCandidate[];
  linkUrl?: string;
}) {
  const targets = resolveMentionTargets(input.body, input.candidates).filter(
    (target) => normalizeAuthor(target.name) !== normalizeAuthor(input.authorName),
  );

  if (!targets.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const excerpt = input.body.trim().slice(0, 180);
  const rows = targets.map((target) => ({
    id: crypto.randomUUID(),
    profile_id: target.profileId!,
    kind: "kanban_mention" as UserNotificationKind,
    title: `${input.authorName} oznaczył Cię w Kanbanie`,
    body: `${input.taskTitle}: ${excerpt}`,
    link_url: input.linkUrl ?? "/tablice-wdrozen",
    source_id: input.commentId,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}

function normalizeAuthor(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}
