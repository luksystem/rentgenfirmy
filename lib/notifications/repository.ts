import {
  USER_NOTIFICATION_KINDS,
  type MentionCandidate,
  type UserNotification,
  type UserNotificationKind,
} from "@/lib/notifications/types";
import { resolveMentionTargets } from "@/lib/notifications/mentions";
import { fetchProfileIdsByOperationalRole } from "@/lib/supabase/user-resource-repository";
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
  const kind: UserNotification["kind"] = (
    USER_NOTIFICATION_KINDS as readonly string[]
  ).includes(row.kind)
    ? (row.kind as UserNotificationKind)
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

function normalizeAuthor(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}

export async function createUserMentionNotifications(input: {
  sourceId: string;
  authorName: string;
  body: string;
  candidates: MentionCandidate[];
  /** np. „w Kanbanie”, „w komentarzu do celu” */
  contextLabel: string;
  /** Opcjonalny prefiks treści (np. tytuł zadania). */
  subjectLabel?: string;
  linkUrl: string;
  excludeProfileIds?: string[];
}) {
  const mentionTargets = resolveMentionTargets(input.body, input.candidates).filter(
    (target) => normalizeAuthor(target.name) !== normalizeAuthor(input.authorName),
  );

  if (!mentionTargets.length) {
    return;
  }

  const profileIds = new Set<string>();
  for (const target of mentionTargets) {
    if (target.kind === "role" || target.roleItemId) {
      if (!target.roleItemId) {
        continue;
      }
      const roleProfileIds = await fetchProfileIdsByOperationalRole(target.roleItemId);
      for (const profileId of roleProfileIds) {
        profileIds.add(profileId);
      }
      continue;
    }
    if (target.profileId) {
      profileIds.add(target.profileId);
    }
  }

  for (const excluded of input.excludeProfileIds ?? []) {
    profileIds.delete(excluded);
  }

  if (!profileIds.size) {
    return;
  }

  const supabase = getSupabase();
  const excerpt = input.body.trim().slice(0, NOTIFICATION_BODY_MAX_LENGTH);
  const rows = [...profileIds].map((profileId) => ({
    id: crypto.randomUUID(),
    profile_id: profileId,
    kind: "kanban_mention" as UserNotificationKind,
    title: `${input.authorName} oznaczył Cię ${input.contextLabel}`,
    body: input.subjectLabel ? `${input.subjectLabel}: ${excerpt}` : excerpt,
    link_url: input.linkUrl,
    source_id: input.sourceId,
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

export async function createKanbanMentionNotifications(input: {
  commentId: string;
  taskId: string;
  taskTitle: string;
  body: string;
  authorName: string;
  candidates: MentionCandidate[];
  linkUrl?: string;
}) {
  await createUserMentionNotifications({
    sourceId: input.commentId,
    authorName: input.authorName,
    body: input.body,
    candidates: input.candidates,
    contextLabel: "w Kanbanie",
    subjectLabel: input.taskTitle,
    linkUrl: input.linkUrl ?? "/tablice-wdrozen",
  });
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
