import type {
  ProjectSpecificationInput,
  ProjectSpecificationItem,
  SpecificationCatalogItem,
} from "@/lib/dashboard/specification-types";
import { getSupabase } from "@/lib/supabase/client";

type CatalogRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  position: number;
  is_active: boolean;
  created_at: string;
};

type SpecRow = {
  id: string;
  project_id: string;
  catalog_item_id: string | null;
  title: string;
  category: string;
  description: string;
  notes: string;
  position: number;
  created_at: string;
  updated_at: string;
};

function rowToCatalog(row: CatalogRow): SpecificationCatalogItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    position: row.position,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function rowToSpec(row: SpecRow): ProjectSpecificationItem {
  return {
    id: row.id,
    projectId: row.project_id,
    catalogItemId: row.catalog_item_id,
    title: row.title,
    category: row.category,
    description: row.description,
    notes: row.notes,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

let catalogCache: SpecificationCatalogItem[] | null = null;

export async function fetchSpecificationCatalog(force = false): Promise<SpecificationCatalogItem[]> {
  if (catalogCache && !force) {
    return catalogCache;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("specification_catalog_items")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  catalogCache = (data ?? []).map((row) => rowToCatalog(row as CatalogRow));
  return catalogCache;
}

export async function fetchProjectSpecificationItems(
  projectId: string,
): Promise<ProjectSpecificationItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_specification_items")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToSpec(row as SpecRow));
}

export async function addProjectSpecificationItem(
  projectId: string,
  input: ProjectSpecificationInput,
) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: lastRow } = await supabase
    .from("project_specification_items")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((lastRow as { position?: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("project_specification_items")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      catalog_item_id: input.catalogItemId ?? null,
      title: input.title.trim(),
      category: input.category.trim() || "Ogólne",
      description: input.description.trim(),
      notes: input.notes?.trim() || "",
      position,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSpec(data as SpecRow);
}

export async function updateProjectSpecificationItem(
  itemId: string,
  input: ProjectSpecificationInput,
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_specification_items")
    .update({
      catalog_item_id: input.catalogItemId ?? null,
      title: input.title.trim(),
      category: input.category.trim() || "Ogólne",
      description: input.description.trim(),
      notes: input.notes?.trim() || "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSpec(data as SpecRow);
}

export async function deleteProjectSpecificationItem(itemId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_specification_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export function invalidateSpecificationCatalogCache() {
  catalogCache = null;
}
