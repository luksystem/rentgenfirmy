import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProcessItemKind } from "@/lib/process/types";
import {
  getProcessPublicPath,
  type ProcessPublicLinkMap,
} from "@/lib/process/public-link-paths";

export type ProcessPublicAccessRecord = {
  projectProcessItemId: string;
  publicToken: string;
  publicEnabled: boolean;
  publicAccessConfigured: boolean;
  publicAccessUsername: string | null;
  publicAuthorName: string | null;
};

type AccessRow = {
  project_process_item_id: string;
  public_token: string;
  public_enabled: boolean;
  public_access_password_hash: string | null;
  public_access_username: string | null;
  public_author_name: string | null;
};

function rowToAccess(row: AccessRow): ProcessPublicAccessRecord {
  return {
    projectProcessItemId: row.project_process_item_id,
    publicToken: row.public_token,
    publicEnabled: row.public_enabled,
    publicAccessConfigured: Boolean(row.public_access_password_hash?.trim()),
    publicAccessUsername: row.public_access_username ?? null,
    publicAuthorName: row.public_author_name ?? null,
  };
}

export async function ensureProcessPublicAccess(
  supabase: SupabaseClient,
  projectProcessItemId: string,
): Promise<ProcessPublicAccessRecord> {
  const { data: existing, error: existingError } = await supabase
    .from("project_process_item_public_access")
    .select("*")
    .eq("project_process_item_id", projectProcessItemId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return rowToAccess(existing as AccessRow);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_process_item_public_access")
    .insert({
      project_process_item_id: projectProcessItemId,
      public_enabled: false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAccess(data as AccessRow);
}

export async function setProcessPublicEnabled(
  supabase: SupabaseClient,
  projectProcessItemId: string,
  enabled: boolean,
) {
  await ensureProcessPublicAccess(supabase, projectProcessItemId);
  const { data, error } = await supabase
    .from("project_process_item_public_access")
    .update({ public_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("project_process_item_id", projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAccess(data as AccessRow);
}

export async function fetchProcessPublicAccessByToken(
  supabase: SupabaseClient,
  token: string,
) {
  const { data, error } = await supabase
    .from("project_process_item_public_access")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToAccess(data as AccessRow) : null;
}

/** Łączy linki Kanban (legacy) z uniwersalną tabelą dostępu. */
export async function fetchProcessPublicLinksForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProcessPublicLinkMap> {
  const { data: items, error: itemsError } = await supabase
    .from("project_process_items")
    .select("id, template_item_id, kind, is_internal_acceptance")
    .eq("project_id", projectId);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (!items?.length) {
    return {};
  }

  const links: ProcessPublicLinkMap = {};
  const itemMeta = new Map(
    items.map((item) => [
      item.id as string,
      {
        templateItemId: item.template_item_id as string,
        kind: item.kind as ProcessItemKind,
        isInternalAcceptance: Boolean(item.is_internal_acceptance),
      },
    ]),
  );

  const kanbanItemIds = items.filter((item) => item.kind === "kanban").map((item) => item.id as string);

  if (kanbanItemIds.length) {
    const { data: boards, error: boardsError } = await supabase
      .from("process_kanban_boards")
      .select("project_process_item_id, public_token")
      .in("project_process_item_id", kanbanItemIds)
      .eq("public_enabled", true);

    if (boardsError) {
      throw new Error(boardsError.message);
    }

    for (const board of boards ?? []) {
      const meta = itemMeta.get(board.project_process_item_id as string);
      const token = (board.public_token as string | null)?.trim();
      if (meta && token) {
        links[meta.templateItemId] = {
          path: getProcessPublicPath("kanban", token),
          kind: "kanban",
        };
      }
    }
  }

  const nonKanbanIds = items
    .filter((item) => item.kind !== "kanban")
    .map((item) => item.id as string);

  if (nonKanbanIds.length) {
    const { data: accessRows, error: accessError } = await supabase
      .from("project_process_item_public_access")
      .select("project_process_item_id, public_token, public_enabled")
      .in("project_process_item_id", nonKanbanIds)
      .eq("public_enabled", true);

    if (accessError) {
      throw new Error(accessError.message);
    }

    for (const row of accessRows ?? []) {
      const meta = itemMeta.get(row.project_process_item_id as string);
      const token = (row.public_token as string | null)?.trim();
      if (meta && token) {
        links[meta.templateItemId] = {
          path: getProcessPublicPath(meta.kind, token, {
            isInternalAcceptance: meta.isInternalAcceptance,
          }),
          kind: meta.kind,
          isInternalAcceptance: meta.isInternalAcceptance,
        };
      }
    }
  }

  return links;
}

export function mapProcessPublicLinksToPaths(links: ProcessPublicLinkMap): Record<string, string> {
  return Object.fromEntries(Object.entries(links).map(([key, entry]) => [key, entry.path]));
}
