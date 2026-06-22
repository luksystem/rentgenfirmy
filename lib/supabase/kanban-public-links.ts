import type { SupabaseClient } from "@supabase/supabase-js";

/** templateItemId → ścieżka publicznej tablicy, np. `/kanban/abc123` */
export type KanbanPublicLinkMap = Record<string, string>;

export async function fetchKanbanPublicLinksForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<KanbanPublicLinkMap> {
  const { data: items, error: itemsError } = await supabase
    .from("project_process_items")
    .select("id, template_item_id")
    .eq("project_id", projectId)
    .eq("kind", "kanban");

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (!items?.length) {
    return {};
  }

  const templateIdByItemId = new Map(
    items.map((item) => [item.id as string, item.template_item_id as string]),
  );
  const itemIds = items.map((item) => item.id as string);

  const { data: boards, error: boardsError } = await supabase
    .from("process_kanban_boards")
    .select("project_process_item_id, public_token")
    .in("project_process_item_id", itemIds)
    .eq("public_enabled", true);

  if (boardsError) {
    throw new Error(boardsError.message);
  }

  const links: KanbanPublicLinkMap = {};
  for (const board of boards ?? []) {
    const templateItemId = templateIdByItemId.get(board.project_process_item_id as string);
    const token = (board.public_token as string | null)?.trim();
    if (templateItemId && token) {
      links[templateItemId] = `/kanban/${token}`;
    }
  }

  return links;
}
