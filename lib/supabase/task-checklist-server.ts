import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth/types";
import type {
  CreateTaskChecklistItemInput,
  TaskChecklistItem,
  TaskChecklistParent,
  UpdateTaskChecklistItemInput,
} from "@/lib/task-checklist/types";

type AdminClient = SupabaseClient;

type TaskChecklistRow = {
  id: string;
  work_item_id: string | null;
  resource_plan_item_id: string | null;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by_id: string | null;
  sort_order: number;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: TaskChecklistRow): TaskChecklistItem {
  return {
    id: row.id,
    workItemId: row.work_item_id,
    resourcePlanItemId: row.resource_plan_item_id,
    title: row.title,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    completedById: row.completed_by_id,
    sortOrder: row.sort_order,
    createdById: row.created_by_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parentFilter(parent: TaskChecklistParent) {
  if (parent.kind === "work_item") {
    return { column: "work_item_id" as const, value: parent.id };
  }
  return { column: "resource_plan_item_id" as const, value: parent.id };
}

async function assertChecklistParentAllowed(admin: AdminClient, parent: TaskChecklistParent) {
  if (parent.kind === "resource_plan_item") {
    const { data, error } = await admin
      .from("resource_plan_items")
      .select("id")
      .eq("id", parent.id)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Nie znaleziono przydziału planu zasobów.");
    }
    return;
  }

  const { data, error } = await admin
    .from("work_items")
    .select("id, source_type")
    .eq("id", parent.id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Nie znaleziono zadania.");
  }
  if (data.source_type !== "manual") {
    throw new Error("Podzadania można dodawać tylko do zadań ręcznych.");
  }
}

export async function fetchTaskChecklistItemsServer(
  admin: AdminClient,
  parent: TaskChecklistParent,
): Promise<TaskChecklistItem[]> {
  await assertChecklistParentAllowed(admin, parent);
  const filter = parentFilter(parent);
  const { data, error } = await admin
    .from("task_checklist_items")
    .select("*")
    .eq(filter.column, filter.value)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapRow(row as TaskChecklistRow));
}

export async function fetchTaskChecklistItemsBatchServer(
  admin: AdminClient,
  parents: TaskChecklistParent[],
): Promise<Map<string, TaskChecklistItem[]>> {
  const result = new Map<string, TaskChecklistItem[]>();
  if (!parents.length) {
    return result;
  }

  const workItemIds = parents.filter((p) => p.kind === "work_item").map((p) => p.id);
  const resourcePlanItemIds = parents.filter((p) => p.kind === "resource_plan_item").map((p) => p.id);

  const queries: Promise<{ data: TaskChecklistRow[] | null; error: { message: string } | null }>[] =
    [];
  if (workItemIds.length) {
    queries.push(
      Promise.resolve(
        admin
          .from("task_checklist_items")
          .select("*")
          .in("work_item_id", workItemIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ),
    );
  }
  if (resourcePlanItemIds.length) {
    queries.push(
      Promise.resolve(
        admin
          .from("task_checklist_items")
          .select("*")
          .in("resource_plan_item_id", resourcePlanItemIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ),
    );
  }

  const responses = await Promise.all(queries);
  for (const response of responses) {
    if (response.error) {
      throw new Error(response.error.message);
    }
    for (const row of response.data ?? []) {
      const item = mapRow(row);
      const key = item.workItemId
        ? `work_item:${item.workItemId}`
        : `resource_plan_item:${item.resourcePlanItemId}`;
      const bucket = result.get(key) ?? [];
      bucket.push(item);
      result.set(key, bucket);
    }
  }

  return result;
}

export async function createTaskChecklistItemServer(
  admin: AdminClient,
  input: CreateTaskChecklistItemInput,
  actor: UserProfile,
): Promise<TaskChecklistItem> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Tytuł podzadania jest wymagany.");
  }

  await assertChecklistParentAllowed(admin, input.parent);
  const filter = parentFilter(input.parent);

  const { data: existing } = await admin
    .from("task_checklist_items")
    .select("sort_order")
    .eq(filter.column, filter.value)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = ((existing?.sort_order as number | undefined) ?? -1) + 1;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const insertPayload: Record<string, unknown> = {
    id,
    title,
    sort_order: sortOrder,
    created_by_id: actor.id,
    created_at: now,
    updated_at: now,
  };
  if (input.parent.kind === "work_item") {
    insertPayload.work_item_id = input.parent.id;
  } else {
    insertPayload.resource_plan_item_id = input.parent.id;
  }

  const { data, error } = await admin.from("task_checklist_items").insert(insertPayload).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return mapRow(data as TaskChecklistRow);
}

export async function updateTaskChecklistItemServer(
  admin: AdminClient,
  id: string,
  input: UpdateTaskChecklistItemInput,
  actor: UserProfile,
): Promise<TaskChecklistItem> {
  const { data: existing, error: fetchError } = await admin
    .from("task_checklist_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!existing) {
    throw new Error("Nie znaleziono podzadania.");
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = { updated_at: now };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      throw new Error("Tytuł podzadania jest wymagany.");
    }
    updatePayload.title = title;
  }

  if (input.isCompleted !== undefined) {
    updatePayload.is_completed = input.isCompleted;
    if (input.isCompleted) {
      updatePayload.completed_at = now;
      updatePayload.completed_by_id = actor.id;
    } else {
      updatePayload.completed_at = null;
      updatePayload.completed_by_id = null;
    }
  }

  const { data, error } = await admin
    .from("task_checklist_items")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapRow(data as TaskChecklistRow);
}

export async function deleteTaskChecklistItemServer(admin: AdminClient, id: string) {
  const { error } = await admin.from("task_checklist_items").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
