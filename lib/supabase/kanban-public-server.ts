import { DEFAULT_FIELD_OPTIONS, normalizeFieldOptions } from "@/lib/field-options";
import { hashKanbanPassword, normalizeKanbanLogin, verifyKanbanPassword } from "@/lib/process/kanban-auth";
import type { KanbanBoard, KanbanPublicAccessInfo, KanbanTemplatePayload } from "@/lib/process/kanban-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { attachSignedUrlsAdmin } from "@/lib/supabase/kanban-attachments-repository";
import { fetchKanbanPublicContext } from "@/lib/supabase/kanban-repository";

type BoardAccessRow = {
  id: string;
  project_process_item_id: string;
  public_token: string;
  public_enabled: boolean;
  public_access_password_hash: string | null;
  public_access_username: string | null;
  public_author_name: string | null;
  created_at: string;
  updated_at: string;
};

export type KanbanBoardAccessRecord = {
  boardId: string;
  projectProcessItemId: string;
  publicToken: string;
  publicEnabled: boolean;
  passwordHash: string | null;
  accessUsername: string | null;
  authorName: string;
};

async function fetchBoardAccessRow(token: string): Promise<BoardAccessRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("process_kanban_boards")
    .select("*")
    .eq("public_token", token)
    .eq("public_enabled", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BoardAccessRow | null) ?? null;
}

export function rowToKanbanBoardAccess(row: BoardAccessRow): KanbanBoardAccessRecord {
  return {
    boardId: row.id,
    projectProcessItemId: row.project_process_item_id,
    publicToken: row.public_token,
    publicEnabled: row.public_enabled,
    passwordHash: row.public_access_password_hash,
    accessUsername: row.public_access_username?.trim() || null,
    authorName: row.public_author_name?.trim() || "Klient",
  };
}

export function getKanbanPublicAccessInfo(access: KanbanBoardAccessRecord): KanbanPublicAccessInfo {
  const hasPassword = Boolean(access.passwordHash);
  return {
    authRequired: hasPassword,
    legacyNameRequired: !hasPassword,
    usernameRequired: hasPassword && Boolean(access.accessUsername),
    authorDisplayName: access.accessUsername ?? access.authorName,
  };
}

export async function fetchKanbanBoardAccessByToken(token: string) {
  const row = await fetchBoardAccessRow(token);
  return row ? rowToKanbanBoardAccess(row) : null;
}

export async function fetchPublicKanbanBoardGraph(token: string): Promise<KanbanBoard | null> {
  const access = await fetchKanbanBoardAccessByToken(token);
  if (!access) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data: boardRow, error } = await supabase
    .from("process_kanban_boards")
    .select("*")
    .eq("id", access.boardId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { fetchBoardGraphAdmin } = await import("@/lib/supabase/kanban-repository");
  const board = await fetchBoardGraphAdmin(boardRow as Parameters<typeof fetchBoardGraphAdmin>[0]);
  const attachments = await attachSignedUrlsAdmin(board.attachments);
  return { ...board, attachments };
}

export async function verifyKanbanPublicCredentials(
  token: string,
  password: string,
  username?: string,
) {
  const access = await fetchKanbanBoardAccessByToken(token);
  if (!access?.passwordHash) {
    throw new Error("Tablica nie wymaga hasła.");
  }

  const trimmedPassword = password.trim();
  if (!trimmedPassword) {
    throw new Error("Hasło jest wymagane.");
  }

  if (access.accessUsername) {
    const provided = normalizeKanbanLogin(username ?? "");
    const expected = normalizeKanbanLogin(access.accessUsername);
    if (!provided || provided !== expected) {
      throw new Error("Nieprawidłowy login lub hasło.");
    }
  }

  const valid = await verifyKanbanPassword(trimmedPassword, access.passwordHash);
  if (!valid) {
    throw new Error("Nieprawidłowy login lub hasło.");
  }

  return {
    authorName: access.accessUsername ?? access.authorName,
  };
}

export async function applyKanbanTemplateAccess(
  boardId: string,
  template: KanbanTemplatePayload,
  options?: { onlyIfUnset?: boolean },
) {
  const password = template.publicAccessPassword?.trim();
  const username = template.publicAccessUsername?.trim() || null;
  const authorName = template.publicAuthorName?.trim() || username || "Klient";

  if (!password && !username && authorName === "Klient") {
    return;
  }

  const supabase = getSupabaseAdmin();
  if (options?.onlyIfUnset) {
    const { data: existing } = await supabase
      .from("process_kanban_boards")
      .select("public_access_password_hash")
      .eq("id", boardId)
      .maybeSingle();

    if (existing?.public_access_password_hash) {
      return;
    }
  }

  const payload: Record<string, unknown> = {
    public_access_username: username,
    public_author_name: authorName,
    updated_at: new Date().toISOString(),
  };

  if (password) {
    payload.public_access_password_hash = await hashKanbanPassword(password);
  }

  const { error } = await supabase.from("process_kanban_boards").update(payload).eq("id", boardId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateKanbanPublicAccessSettings(input: {
  projectProcessItemId: string;
  password?: string | null;
  username?: string | null;
  authorName?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.username !== undefined) {
    payload.public_access_username = input.username?.trim() || null;
  }

  if (input.authorName !== undefined) {
    payload.public_author_name = input.authorName?.trim() || "Klient";
  }

  if (input.password !== undefined) {
    const trimmed = input.password?.trim();
    payload.public_access_password_hash = trimmed ? await hashKanbanPassword(trimmed) : null;
  }

  const { data, error } = await supabase
    .from("process_kanban_boards")
    .update(payload)
    .eq("project_process_item_id", input.projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BoardAccessRow;
}

export async function fetchPublicKanbanAssigneeOptions() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", "field_options")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const options = normalizeFieldOptions((data?.data as Partial<typeof DEFAULT_FIELD_OPTIONS>) ?? {});
  return options.nextStepOwners;
}

export async function fetchKanbanPublicMeta(token: string) {
  const access = await fetchKanbanBoardAccessByToken(token);
  if (!access) {
    return null;
  }

  const context = await fetchKanbanPublicContext(access.projectProcessItemId);
  const assigneeOptions = await fetchPublicKanbanAssigneeOptions();
  return {
    access: getKanbanPublicAccessInfo(access),
    context: { ...context, assigneeOptions },
  };
}
