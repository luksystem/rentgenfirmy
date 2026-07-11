import type {
  ProjectSpecificationInput,
  ProjectSpecificationItem,
  SpecificationCatalogInput,
  SpecificationCatalogItem,
} from "@/lib/dashboard/specification-types";
import { normalizeCatalogFunctionalityItems, seedCatalogFunctionalityItems } from "@/lib/client-functionality/catalog-seeds";
import { normalizeCatalogAcceptanceItems, seedCatalogAcceptanceItems } from "@/lib/internal-acceptance/catalog-seeds";
import { getSupabase } from "@/lib/supabase/client";

type CatalogRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  position: number;
  is_active: boolean;
  internal_acceptance_items?: unknown;
  client_functionality_items?: unknown;
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
    internalAcceptanceItems: seedCatalogAcceptanceItems(
      row.name,
      normalizeCatalogAcceptanceItems(row.internal_acceptance_items),
    ),
    clientFunctionalityItems: seedCatalogFunctionalityItems(
      row.name,
      normalizeCatalogFunctionalityItems(row.client_functionality_items),
    ),
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
  let { data, error } = await supabase
    .from("specification_catalog_items")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error?.message?.includes("client_functionality_items")) {
    const fallback = await supabase
      .from("specification_catalog_items")
      .select("id, name, category, description, position, is_active, internal_acceptance_items, created_at")
      .eq("is_active", true)
      .order("position", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

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

export async function createSpecificationCatalogItem(input: SpecificationCatalogInput) {
  const supabase = getSupabase();

  const { data: lastRow } = await supabase
    .from("specification_catalog_items")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = input.position ?? ((lastRow as { position?: number } | null)?.position ?? 0) + 10;

  const { data, error } = await supabase
    .from("specification_catalog_items")
    .insert({
      id: crypto.randomUUID(),
      name: input.name.trim() || "Nowa pozycja",
      category: input.category.trim() || "Ogólne",
      description: input.description.trim(),
      position,
      is_active: true,
      internal_acceptance_items: [],
      client_functionality_items: [],
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  invalidateSpecificationCatalogCache();
  return rowToCatalog(data as CatalogRow);
}

export async function deleteSpecificationCatalogItem(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("specification_catalog_items")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  invalidateSpecificationCatalogCache();
}

export async function updateSpecificationCatalogItem(
  id: string,
  input: Pick<SpecificationCatalogItem, "name" | "category" | "description" | "position" | "isActive">,
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("specification_catalog_items")
    .update({
      name: input.name.trim(),
      category: input.category.trim() || "Ogólne",
      description: input.description.trim(),
      position: input.position,
      is_active: input.isActive,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  invalidateSpecificationCatalogCache();
  return rowToCatalog(data as CatalogRow);
}

export async function saveSpecificationCatalogAcceptanceItems(
  id: string,
  items: SpecificationCatalogItem["internalAcceptanceItems"],
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("specification_catalog_items")
    .update({
      internal_acceptance_items: items,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  invalidateSpecificationCatalogCache();
  return rowToCatalog(data as CatalogRow);
}

export async function saveSpecificationCatalogFunctionalityItems(
  id: string,
  items: SpecificationCatalogItem["clientFunctionalityItems"],
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("specification_catalog_items")
    .update({
      client_functionality_items: items,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  invalidateSpecificationCatalogCache();
  return rowToCatalog(data as CatalogRow);
}

export async function fetchSpecificationCatalogAcceptanceMap(): Promise<
  Record<string, SpecificationCatalogItem["internalAcceptanceItems"]>
> {
  const catalog = await fetchSpecificationCatalog(true);
  return Object.fromEntries(catalog.map((entry) => [entry.id, entry.internalAcceptanceItems]));
}
