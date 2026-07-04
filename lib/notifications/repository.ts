import type { MentionCandidate, UserNotification, UserNotificationKind } from "@/lib/notifications/types";
import { resolveMentionTargets } from "@/lib/notifications/mentions";
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  buildKanbanNewActivityRows,
  resolveKanbanPublicLinkForColumn,
  resolveKanbanPublicLinkForTask,
} from "@/lib/notifications/kanban-activity";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { getSupabase } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  profile_id: string;
  kind: string;
  title: string;
  body: string;
  link_url: string | null;
  source_id: string | null;
  read_at: string | null;
  created_at: string;
};

function rowToNotification(row: NotificationRow): UserNotification {
  const kind: UserNotification["kind"] =
    row.kind === "kanban_mention"
      ? "kanban_mention"
      : row.kind === "warranty_expiring"
        ? "warranty_expiring"
        : row.kind === "agreement_client_created"
          ? "agreement_client_created"
          : row.kind === "client_stage_rating"
            ? "client_stage_rating"
            : row.kind === "service_intake_preliminary_offer"
              ? "service_intake_preliminary_offer"
              : row.kind === "inspection_billing_due"
                ? "inspection_billing_due"
                : "kanban_new_activity";

  return {
    id: row.id,
    profileId: row.profile_id,
    kind,
    title: row.title,
    body: row.body,
    linkUrl: row.link_url,
    sourceId: row.source_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function fetchUnreadNotificationCount(profileId: string) {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .is("read_at", null);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return 0;
    }
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function fetchUserNotifications(profileId: string, limit = 30, unreadOnly = false) {
  const supabase = getSupabase();
  let query = supabase
    .from("user_notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToNotification(row as NotificationRow));
}

export async function markNotificationRead(notificationId: string, profileId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: now })
    .eq("id", notificationId)
    .eq("profile_id", profileId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead(profileId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: now })
    .eq("profile_id", profileId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createKanbanMentionNotifications(input: {
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

  const supabase = getSupabase();
  const excerpt = input.body.trim().slice(0, NOTIFICATION_BODY_MAX_LENGTH);
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
  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return;
    }
    throw new Error(error.message);
  }
}

export async function createKanbanNewActivityNotifications(input: {
  sourceId: string;
  taskTitle: string;
  authorName: string;
  body: string;
  linkUrl?: string;
  excludeProfileIds?: string[];
  teamProfileIds?: string[];
}) {
  const teamProfileIds =
    input.teamProfileIds ??
    (await fetchTeamProfiles().catch(() => [])).map((profile) => profile.id);

  if (!teamProfileIds.length) {
    return;
  }

  const rows = buildKanbanNewActivityRows({
    teamProfileIds,
    sourceId: input.sourceId,
    taskTitle: input.taskTitle,
    authorName: input.authorName,
    body: input.body,
    linkUrl: input.linkUrl,
    excludeProfileIds: input.excludeProfileIds,
  });

  if (!rows.length) {
    return;
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return;
    }
    throw new Error(error.message);
  }
}

export { resolveKanbanPublicLinkForColumn, resolveKanbanPublicLinkForTask };

function normalizeAuthor(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}
