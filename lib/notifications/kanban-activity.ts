import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserNotificationKind } from "@/lib/notifications/types";

export const NOTIFICATION_BODY_MAX_LENGTH = 500;

export function buildKanbanNewActivityRows(input: {
  teamProfileIds: string[];
  sourceId: string;
  taskTitle: string;
  authorName: string;
  body: string;
  linkUrl?: string;
  excludeProfileIds?: string[];
}) {
  const excerpt = input.body.trim().slice(0, NOTIFICATION_BODY_MAX_LENGTH);
  const exclude = new Set(input.excludeProfileIds ?? []);
  const now = new Date().toISOString();
  const linkUrl = input.linkUrl ?? "/tablice-wdrozen";

  return input.teamProfileIds
    .filter((profileId) => !exclude.has(profileId))
    .map((profileId) => ({
      id: crypto.randomUUID(),
      profile_id: profileId,
      kind: "kanban_new_activity" as UserNotificationKind,
      title: `${input.authorName} — aktywność na Kanbanie`,
      body: `${input.taskTitle}: ${excerpt}`,
      link_url: linkUrl,
      source_id: input.sourceId,
      created_at: now,
    }));
}

export async function resolveKanbanPublicLinkForColumn(
  supabase: SupabaseClient,
  columnId: string,
  fallback = "/tablice-wdrozen",
) {
  const { data: column } = await supabase
    .from("process_kanban_columns")
    .select("board_id")
    .eq("id", columnId)
    .maybeSingle();

  if (!column?.board_id) {
    return fallback;
  }

  const { data: board } = await supabase
    .from("process_kanban_boards")
    .select("public_token")
    .eq("id", column.board_id)
    .maybeSingle();

  if (board?.public_token) {
    return `/kanban/${board.public_token}`;
  }

  return fallback;
}

export async function resolveKanbanPublicLinkForTask(
  supabase: SupabaseClient,
  taskId: string,
  fallback = "/tablice-wdrozen",
) {
  const { data: task } = await supabase
    .from("process_kanban_tasks")
    .select("column_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!task?.column_id) {
    return fallback;
  }

  return resolveKanbanPublicLinkForColumn(supabase, task.column_id, fallback);
}
