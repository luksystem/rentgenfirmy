import { getSupabase } from "@/lib/supabase/client";
import type {
  ResourceDictionaryItemInsert,
  ResourceDictionaryItemRow,
  ResourceDictionaryItemUpdate,
} from "@/lib/supabase/database.types";
import type { DictionaryItem, DictionaryItemInput, DictionaryKey } from "@/lib/resource-plan/dictionary-types";

function rowToItem(row: ResourceDictionaryItemRow): DictionaryItem {
  return {
    id: row.id,
    dictionaryKey: row.dictionary_key as DictionaryKey,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToInsert(input: DictionaryItemInput): ResourceDictionaryItemInsert {
  return {
    dictionary_key: input.dictionaryKey,
    name: input.name.trim(),
    description: input.description.trim(),
    color: input.color,
    icon: input.icon,
    is_active: input.isActive,
    sort_order: input.sortOrder,
    metadata: input.metadata ?? {},
  };
}

function inputToUpdate(input: Partial<DictionaryItemInput>): ResourceDictionaryItemUpdate {
  const update: ResourceDictionaryItemUpdate = {};
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.description !== undefined) update.description = input.description.trim();
  if (input.color !== undefined) update.color = input.color;
  if (input.icon !== undefined) update.icon = input.icon;
  if (input.isActive !== undefined) update.is_active = input.isActive;
  if (input.sortOrder !== undefined) update.sort_order = input.sortOrder;
  if (input.metadata !== undefined) update.metadata = input.metadata;
  update.updated_at = new Date().toISOString();
  return update;
}

/** Pobiera wszystkie słowniki (wszystkie klucze, wszystkie pozycje — także nieaktywne, do zarządzania w ustawieniach). */
export async function fetchAllDictionaryItems(): Promise<DictionaryItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_dictionary_items")
    .select("*")
    .order("dictionary_key", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToItem);
}

/** Pobiera tylko aktywne pozycje danego słownika — do użycia w selectach/planowaniu. */
export async function fetchActiveDictionaryItems(dictionaryKey: DictionaryKey): Promise<DictionaryItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_dictionary_items")
    .select("*")
    .eq("dictionary_key", dictionaryKey)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToItem);
}

export async function createDictionaryItem(input: DictionaryItemInput): Promise<DictionaryItem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_dictionary_items")
    .insert(inputToInsert(input))
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToItem(data);
}

export async function updateDictionaryItem(
  id: string,
  input: Partial<DictionaryItemInput>,
): Promise<DictionaryItem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_dictionary_items")
    .update(inputToUpdate(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToItem(data);
}

export async function deleteDictionaryItem(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("resource_dictionary_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderDictionaryItems(
  items: { id: string; sortOrder: number }[],
): Promise<void> {
  const supabase = getSupabase();
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      supabase
        .from("resource_dictionary_items")
        .update({ sort_order: sortOrder, updated_at: new Date().toISOString() })
        .eq("id", id),
    ),
  );
}
