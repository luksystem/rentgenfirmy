import type {
  SmartHomeKbClientPathItemRow,
  SmartHomeKbClientPathRow,
  SmartHomeKbPathTemplateItemRow,
  SmartHomeKbPathTemplateRow,
} from "@/lib/supabase/database.types";
import type {
  SmartHomeKbClientPath,
  SmartHomeKbClientPathItem,
  SmartHomeKbClientPathStatus,
  SmartHomeKbPathTemplate,
  SmartHomeKbPathTemplateItem,
} from "@/lib/smart-home-kb/types";
import { getSupabase } from "@/lib/supabase/client";

function isClientPathStatus(value: string): value is SmartHomeKbClientPathStatus {
  return value === "active" || value === "archived";
}

function rowToTemplateItem(row: SmartHomeKbPathTemplateItemRow): SmartHomeKbPathTemplateItem {
  return { id: row.id, templateId: row.template_id, articleId: row.article_id, sortOrder: row.sort_order };
}

function rowToTemplate(
  row: SmartHomeKbPathTemplateRow,
  items: SmartHomeKbPathTemplateItemRow[],
): SmartHomeKbPathTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items
      .filter((item) => item.template_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(rowToTemplateItem),
  };
}

function rowToClientPathItem(row: SmartHomeKbClientPathItemRow): SmartHomeKbClientPathItem {
  return {
    id: row.id,
    pathId: row.path_id,
    articleId: row.article_id,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function rowToClientPath(
  row: SmartHomeKbClientPathRow,
  items: SmartHomeKbClientPathItemRow[],
): SmartHomeKbClientPath {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    sourceTemplateId: row.source_template_id,
    status: isClientPathStatus(row.status) ? row.status : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items
      .filter((item) => item.path_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(rowToClientPathItem),
  };
}

export async function fetchSmartHomeKbPathTemplates(): Promise<SmartHomeKbPathTemplate[]> {
  const supabase = getSupabase();
  const [{ data: templates, error: templatesError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("smart_home_kb_path_templates").select("*").order("name", { ascending: true }),
    supabase.from("smart_home_kb_path_template_items").select("*").order("sort_order", { ascending: true }),
  ]);

  if (templatesError) {
    throw new Error(templatesError.message);
  }
  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemRows = (items ?? []) as SmartHomeKbPathTemplateItemRow[];
  return ((templates ?? []) as SmartHomeKbPathTemplateRow[]).map((row) => rowToTemplate(row, itemRows));
}

export async function createSmartHomeKbPathTemplate(input: {
  name: string;
  description?: string;
}): Promise<SmartHomeKbPathTemplate> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_path_templates")
    .insert({ name: input.name.trim(), description: input.description?.trim() ?? "" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToTemplate(data as SmartHomeKbPathTemplateRow, []);
}

export async function deleteSmartHomeKbPathTemplate(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("smart_home_kb_path_templates").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

async function replaceTemplateItems(
  supabase: ReturnType<typeof getSupabase>,
  templateId: string,
  articleIds: string[],
): Promise<SmartHomeKbPathTemplateItemRow[]> {
  const { error: deleteError } = await supabase
    .from("smart_home_kb_path_template_items")
    .delete()
    .eq("template_id", templateId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (articleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("smart_home_kb_path_template_items")
    .insert(
      articleIds.map((articleId, index) => ({
        template_id: templateId,
        article_id: articleId,
        sort_order: index,
      })),
    )
    .select("*");

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as SmartHomeKbPathTemplateItemRow[];
}

/** Nadpisuje pełną, uporządkowaną listę artykułów szablonu. */
export async function setSmartHomeKbPathTemplateArticles(
  templateId: string,
  articleIds: string[],
): Promise<SmartHomeKbPathTemplateItem[]> {
  const supabase = getSupabase();
  const rows = await replaceTemplateItems(supabase, templateId, articleIds);
  return rows.map(rowToTemplateItem);
}

export async function fetchSmartHomeKbClientPaths(clientId: string): Promise<SmartHomeKbClientPath[]> {
  const supabase = getSupabase();
  const { data: paths, error: pathsError } = await supabase
    .from("smart_home_kb_client_paths")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (pathsError) {
    throw new Error(pathsError.message);
  }

  const pathRows = (paths ?? []) as SmartHomeKbClientPathRow[];
  if (pathRows.length === 0) {
    return [];
  }

  const { data: items, error: itemsError } = await supabase
    .from("smart_home_kb_client_path_items")
    .select("*")
    .in(
      "path_id",
      pathRows.map((row) => row.id),
    )
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemRows = (items ?? []) as SmartHomeKbClientPathItemRow[];
  return pathRows.map((row) => rowToClientPath(row, itemRows));
}

export async function createSmartHomeKbClientPath(input: {
  clientId: string;
  name: string;
  description?: string;
  articleIds: string[];
  sourceTemplateId?: string | null;
}): Promise<SmartHomeKbClientPath> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_client_paths")
    .insert({
      client_id: input.clientId,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      source_template_id: input.sourceTemplateId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const path = data as SmartHomeKbClientPathRow;
  const itemRows =
    input.articleIds.length > 0
      ? await (async () => {
          const { data: inserted, error: insertError } = await supabase
            .from("smart_home_kb_client_path_items")
            .insert(
              input.articleIds.map((articleId, index) => ({
                path_id: path.id,
                article_id: articleId,
                sort_order: index,
              })),
            )
            .select("*");
          if (insertError) {
            throw new Error(insertError.message);
          }
          return (inserted ?? []) as SmartHomeKbClientPathItemRow[];
        })()
      : [];

  return rowToClientPath(path, itemRows);
}

/** Tworzy nową, niezależną ścieżkę klienta jako kopię szablonu (kopiuje tylko listę artykułów). */
export async function createSmartHomeKbClientPathFromTemplate(
  clientId: string,
  template: SmartHomeKbPathTemplate,
): Promise<SmartHomeKbClientPath> {
  return createSmartHomeKbClientPath({
    clientId,
    name: template.name,
    description: template.description,
    articleIds: template.items.map((item) => item.articleId),
    sourceTemplateId: template.id,
  });
}

export async function renameSmartHomeKbClientPath(
  id: string,
  input: { name: string; description?: string },
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("smart_home_kb_client_paths")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSmartHomeKbClientPath(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("smart_home_kb_client_paths").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

/** Nadpisuje pełną, uporządkowaną listę artykułów ścieżki klienta (zachowuje completed_at dla wspólnych artykułów). */
export async function setSmartHomeKbClientPathArticles(
  pathId: string,
  articleIds: string[],
): Promise<SmartHomeKbClientPathItem[]> {
  const supabase = getSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("smart_home_kb_client_path_items")
    .select("*")
    .eq("path_id", pathId);
  if (existingError) {
    throw new Error(existingError.message);
  }

  const completedByArticle = new Map(
    ((existing ?? []) as SmartHomeKbClientPathItemRow[]).map((row) => [row.article_id, row.completed_at]),
  );

  const { error: deleteError } = await supabase
    .from("smart_home_kb_client_path_items")
    .delete()
    .eq("path_id", pathId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (articleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("smart_home_kb_client_path_items")
    .insert(
      articleIds.map((articleId, index) => ({
        path_id: pathId,
        article_id: articleId,
        sort_order: index,
        completed_at: completedByArticle.get(articleId) ?? null,
      })),
    )
    .select("*");

  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as SmartHomeKbClientPathItemRow[]).map(rowToClientPathItem);
}

export async function setSmartHomeKbClientPathItemCompleted(
  itemId: string,
  completed: boolean,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("smart_home_kb_client_path_items")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", itemId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Powiązanie konta klienta (rola klient) z rekordem klienta — ustawiane z zakładki "Ścieżka szkoleniowa". */
export async function linkClientAccountToClient(profileId: string, clientId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("profiles").update({ client_id: clientId }).eq("id", profileId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function unlinkClientAccountFromClient(profileId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("profiles").update({ client_id: null }).eq("id", profileId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchClientAccountProfiles(): Promise<
  Array<{ id: string; name: string; email: string; clientId: string | null }>
> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, client_id")
    .eq("role", "klient")
    .order("first_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    (data ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      client_id: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim() || row.email,
    email: row.email,
    clientId: row.client_id,
  }));
}
