import { activityLogInsertPayload } from "@/lib/activity-log/payload";
import type {
  ActivityEntityType,
  ActivityLogEntry,
  ActivityLogInput,
  ActivityLogPage,
} from "@/lib/activity-log/types";
import { ACTIVITY_ENTITY_TYPES } from "@/lib/activity-log/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ActivityLogRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string;
  summary: string;
  href: string | null;
  metadata: Record<string, unknown> | null;
};

function rowToEntry(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label ?? "",
    summary: row.summary,
    href: row.href,
    metadata: row.metadata ?? {},
  };
}

/** Zapis z API / service role (np. admin users). */
export async function logActivityAdmin(input: ActivityLogInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("activity_log").insert(activityLogInsertPayload(input));
    if (error) {
      console.error("[activity_log]", error.message);
    }
  } catch (error) {
    console.error("[activity_log]", error);
  }
}

export type FetchActivityLogPageInput = {
  limit?: number;
  cursor?: string | null;
  actorUserId?: string | null;
  entityType?: string | null;
  from?: string | null;
  to?: string | null;
};

export async function fetchActivityLogPage(
  input: FetchActivityLogPageInput = {},
): Promise<ActivityLogPage> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (input.actorUserId) {
    query = query.eq("actor_user_id", input.actorUserId);
  }

  if (input.entityType && ACTIVITY_ENTITY_TYPES.includes(input.entityType as ActivityEntityType)) {
    query = query.eq("entity_type", input.entityType);
  }

  if (input.from) {
    query = query.gte("created_at", input.from);
  }

  if (input.to) {
    query = query.lte("created_at", input.to);
  }

  if (input.cursor) {
    query = query.lt("created_at", input.cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ActivityLogRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];

  return {
    entries: pageRows.map(rowToEntry),
    nextCursor: hasMore && last ? last.created_at : null,
  };
}
