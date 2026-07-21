import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AdminTimeCategory } from "@/lib/time-tracking/types";

export type { AdminTimeCategory };

export type AdminTimeCategoryInput = {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
  defaultBillable?: boolean;
  requiresProject?: boolean;
  code?: string;
};

type CategoryDbRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  default_billable: boolean;
  requires_project: boolean;
};

function mapRow(row: CategoryDbRow): AdminTimeCategory {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    color: row.color || "#64748b",
    icon: row.icon || "clock",
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order ?? 100,
    defaultBillable: Boolean(row.default_billable),
    requiresProject: Boolean(row.requires_project),
  };
}

function slugifyCode(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

/** Tabela time_categories nie jest w wygenerowanych typach Database. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function categoriesTable(): any {
  return getSupabaseAdmin().from("time_categories");
}

export async function listTimeCategoriesAdminServer(
  options?: { includeInactive?: boolean },
): Promise<AdminTimeCategory[]> {
  let query = categoriesTable().select("*").order("sort_order", { ascending: true });
  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as unknown as CategoryDbRow[]).map(mapRow);
}

export async function createTimeCategoryAdminServer(
  input: AdminTimeCategoryInput,
): Promise<AdminTimeCategory> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Nazwa kategorii jest wymagana.");
  }
  const codeBase = slugifyCode(input.code?.trim() || name) || `cat_${Date.now()}`;
  const now = new Date().toISOString();

  const { data, error } = await categoriesTable()
    .insert({
      code: codeBase,
      name,
      description: input.description?.trim() ?? "",
      color: input.color?.trim() || "#64748b",
      icon: input.icon?.trim() || "clock",
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 100,
      default_billable: input.defaultBillable ?? false,
      requires_project: input.requiresProject ?? false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      throw new Error("Kategoria o takim kodzie już istnieje — zmień nazwę.");
    }
    throw new Error(error.message);
  }

  return mapRow(data as unknown as CategoryDbRow);
}

export async function updateTimeCategoryAdminServer(
  id: string,
  input: AdminTimeCategoryInput,
): Promise<AdminTimeCategory> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Nazwa kategorii jest wymagana.");
  }

  const { data, error } = await categoriesTable()
    .update({
      name,
      description: input.description?.trim() ?? "",
      color: input.color?.trim() || "#64748b",
      icon: input.icon?.trim() || "clock",
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 100,
      default_billable: input.defaultBillable ?? false,
      requires_project: input.requiresProject ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data as unknown as CategoryDbRow);
}

export async function deactivateTimeCategoryAdminServer(id: string): Promise<void> {
  const { error } = await categoriesTable()
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
