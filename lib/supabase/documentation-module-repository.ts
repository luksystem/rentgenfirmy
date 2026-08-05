import type { ParsedDocumentationModule } from "@/lib/import/documentation-module-parser";
import type {
  DocumentationModule,
  DocumentationModuleItem,
  DocumentationModuleItemHistoryEntry,
  DocumentationModuleType,
} from "@/lib/dashboard/documentation-module-types";
import type { SwitchboardCircuitStatus } from "@/lib/dashboard/switchboard-types";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ModuleRow = Database["public"]["Tables"]["documentation_modules"]["Row"];
type ModuleItemRow = Database["public"]["Tables"]["documentation_module_items"]["Row"];
type ModuleItemHistoryRow = Database["public"]["Tables"]["documentation_module_item_history"]["Row"];

export type DocumentationModuleWithItems = {
  module: DocumentationModule;
  items: DocumentationModuleItem[];
};

function rowToModule(row: ModuleRow): DocumentationModule {
  return {
    id: row.id,
    projectId: row.project_id,
    moduleType: row.module_type as DocumentationModuleType,
    name: row.name,
    position: row.position,
    lastImportedAt: row.last_imported_at,
    completedAt: row.completed_at,
    completedById: row.completed_by_id,
    completedByName: row.completed_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToItem(row: ModuleItemRow): DocumentationModuleItem {
  return {
    id: row.id,
    moduleId: row.module_id,
    projectId: row.project_id,
    rowIndex: row.row_index,
    mergeKey: row.merge_key,
    sectionName: row.section_name,
    label: row.label,
    location: row.location,
    description: row.description,
    rawFields: (row.raw_fields ?? {}) as Record<string, string>,
    status: row.status as SwitchboardCircuitStatus,
    note: row.note,
    isStale: row.is_stale,
    source: (row.source as "import" | "manual") ?? "import",
    employeeReportTarget: row.employee_report_target as "agreement" | "change_request" | null,
    employeeReportId: row.employee_report_id,
    updatedById: row.updated_by_id,
    updatedByName: row.updated_by_name,
    handledAt: row.handled_at,
    handledById: row.handled_by_id,
    handledByName: row.handled_by_name,
    handledNote: row.handled_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToHistoryEntry(row: ModuleItemHistoryRow): DocumentationModuleItemHistoryEntry {
  return {
    id: row.id,
    itemId: row.item_id,
    previousStatus: row.previous_status as SwitchboardCircuitStatus | null,
    newStatus: row.new_status as SwitchboardCircuitStatus,
    note: row.note,
    changedById: row.changed_by_id,
    changedByName: row.changed_by_name,
    changedAt: row.changed_at,
  };
}

export async function fetchDocumentationModulesWithItems(
  projectId: string,
  moduleType: DocumentationModuleType,
): Promise<DocumentationModuleWithItems[]> {
  const supabase = getSupabase();
  const { data: moduleRows, error: moduleError } = await supabase
    .from("documentation_modules")
    .select("*")
    .eq("project_id", projectId)
    .eq("module_type", moduleType)
    .order("position", { ascending: true });
  if (moduleError) throw new Error(moduleError.message);

  const modules = ((moduleRows ?? []) as ModuleRow[]).map(rowToModule);
  if (modules.length === 0) return [];

  // project_id na items jest denormalizowane, ale filtrujemy po module_id — moduleType może
  // teoretycznie mieć wiele instancji (np. RACK: SWITCH + AUDIOSERVER), a project_id sam w sobie
  // obejmowałby też pozycje innych typów modułów w tym samym projekcie.
  const { data: itemRows, error: itemError } = await supabase
    .from("documentation_module_items")
    .select("*")
    .in(
      "module_id",
      modules.map((module) => module.id),
    )
    .order("row_index", { ascending: true });
  if (itemError) throw new Error(itemError.message);

  const itemsByModule = new Map<string, DocumentationModuleItem[]>();
  for (const row of (itemRows ?? []) as ModuleItemRow[]) {
    const item = rowToItem(row);
    const list = itemsByModule.get(item.moduleId) ?? [];
    list.push(item);
    itemsByModule.set(item.moduleId, list);
  }

  return modules.map((module) => ({ module, items: itemsByModule.get(module.id) ?? [] }));
}

/**
 * Importuje sparsowany moduł: znajduje lub tworzy `documentation_modules` po
 * (project_id, module_type, name), scala pozycje po `merge_key` — nowe biorą status/notatkę z
 * pliku, istniejące zachowują to, co już ustawiono w aplikacji (ten sam wzorzec co
 * `importParsedSwitchboards`). `editableFieldLabels` (np. Przyciski: Typ/Kolor) dodatkowo NIE są
 * nadpisywane w `raw_fields` dla istniejących pozycji — po pierwszym imporcie Rentgen jest dla
 * nich źródłem prawdy, nie plik.
 */
export async function importParsedDocumentationModule(
  projectId: string,
  parsed: ParsedDocumentationModule,
  editableFieldLabels: string[] = [],
): Promise<{ moduleId: string; importedCount: number; staleCount: number }> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const moduleName = parsed.moduleName;

  const { data: existing, error: existingError } = await supabase
    .from("documentation_modules")
    .select("id, position")
    .eq("project_id", projectId)
    .eq("module_type", parsed.moduleType)
    .eq("name", moduleName)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  let moduleId = existing?.id ?? null;

  if (!moduleId) {
    const { data: maxPositionRow } = await supabase
      .from("documentation_modules")
      .select("position")
      .eq("project_id", projectId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPosition = ((maxPositionRow as { position?: number } | null)?.position ?? -1) + 1;

    const { data: created, error: createError } = await supabase
      .from("documentation_modules")
      .insert({
        project_id: projectId,
        module_type: parsed.moduleType,
        name: moduleName,
        position: nextPosition,
        last_imported_at: now,
      })
      .select("id")
      .single();
    if (createError) throw new Error(createError.message);
    moduleId = created.id;
  } else {
    const { error: touchError } = await supabase
      .from("documentation_modules")
      .update({ last_imported_at: now, updated_at: now })
      .eq("id", moduleId);
    if (touchError) throw new Error(touchError.message);
  }

  const { data: existingItems, error: existingItemsError } = await supabase
    .from("documentation_module_items")
    .select("id, merge_key, raw_fields, source")
    .eq("module_id", moduleId);
  if (existingItemsError) throw new Error(existingItemsError.message);

  const existingByKey = new Map(
    (existingItems ?? []).map((row) => [row.merge_key, row as { id: string; raw_fields: Record<string, string> }]),
  );
  const importedKeys = new Set(parsed.items.map((item) => item.mergeKey));

  const descriptiveFields = (item: (typeof parsed.items)[number]) => {
    const existing = existingByKey.get(item.mergeKey);
    // Pola z `editableFieldLabels` przetrwały import: jeśli w bazie już jest wartość dla danego
    // klucza, plik jej nie nadpisuje (Rentgen jest źródłem prawdy po pierwszym imporcie).
    const rawFields = { ...item.rawFields };
    if (existing) {
      for (const label of editableFieldLabels) {
        const existingValue = existing.raw_fields?.[label];
        if (existingValue !== undefined) rawFields[label] = existingValue;
      }
    }

    return {
      module_id: moduleId as string,
      project_id: projectId,
      row_index: item.rowIndex,
      merge_key: item.mergeKey,
      section_name: item.sectionName,
      label: item.label,
      location: item.location,
      description: item.description,
      raw_fields: rawFields,
      is_stale: false,
      updated_at: now,
    };
  };

  const newItems = parsed.items.filter((item) => !existingByKey.has(item.mergeKey));
  if (newItems.length > 0) {
    const { error: insertError } = await supabase.from("documentation_module_items").insert(
      newItems.map((item) => ({
        ...descriptiveFields(item),
        status: item.status,
        note: item.note,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }

  const itemsToUpdate = parsed.items.filter((item) => existingByKey.has(item.mergeKey));
  if (itemsToUpdate.length > 0) {
    const { error: upsertError } = await supabase
      .from("documentation_module_items")
      .upsert(itemsToUpdate.map(descriptiveFields), { onConflict: "module_id,merge_key" });
    if (upsertError) throw new Error(upsertError.message);
  }

  // Ręcznie dodane pozycje nigdy nie mają odpowiednika w pliku (inny sposób powstania
  // merge_key), więc bez tego wyjątku KAŻDY import oznaczałby je jako "zniknęły z pliku".
  const staleIds = (existingItems ?? [])
    .filter(
      (row) => (row as { source?: string }).source !== "manual" && !importedKeys.has(row.merge_key),
    )
    .map((row) => row.id);
  if (staleIds.length > 0) {
    const { error: staleError } = await supabase
      .from("documentation_module_items")
      .update({ is_stale: true, updated_at: now })
      .in("id", staleIds);
    if (staleError) throw new Error(staleError.message);
  }

  return { moduleId: moduleId as string, importedCount: parsed.items.length, staleCount: staleIds.length };
}

/**
 * Dodaje pozycję ręcznie z poziomu Rentgena (nie z importu pliku). `merge_key` dostaje prefiks
 * "manual:" + losowy fragment, żeby NIGDY nie kolidował z kluczem wygenerowanym przez parser
 * pliku przy późniejszym imporcie.
 */
export async function createManualDocumentationModuleItem(
  moduleId: string,
  projectId: string,
  input: {
    sectionName?: string | null;
    label?: string | null;
    location?: string | null;
    description?: string | null;
    createdByName: string;
  },
): Promise<DocumentationModuleItem> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: maxRow } = await supabase
    .from("documentation_module_items")
    .select("row_index")
    .eq("module_id", moduleId)
    .order("row_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextRowIndex = ((maxRow as { row_index?: number } | null)?.row_index ?? 0) + 1;

  const { data, error } = await supabase
    .from("documentation_module_items")
    .insert({
      module_id: moduleId,
      project_id: projectId,
      row_index: nextRowIndex,
      merge_key: `manual:${crypto.randomUUID()}`,
      section_name: input.sectionName?.trim() || null,
      label: input.label?.trim() || null,
      location: input.location?.trim() || null,
      description: input.description?.trim() || null,
      status: "nie_ruszone",
      source: "manual",
      updated_by_name: input.createdByName.trim() || "Instalator",
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToItem(data as ModuleItemRow);
}

/** Edytuje pojedyncze pole w `raw_fields` (np. Typ/Kolor na Przyciskach) bezpośrednio z aplikacji. */
export async function updateDocumentationModuleItemRawField(
  itemId: string,
  fieldLabel: string,
  value: string,
): Promise<DocumentationModuleItem> {
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("documentation_module_items")
    .select("raw_fields")
    .eq("id", itemId)
    .single();
  if (existingError) throw new Error(existingError.message);

  const rawFields = { ...((existing?.raw_fields as Record<string, string>) ?? {}), [fieldLabel]: value };

  const { data, error } = await supabase
    .from("documentation_module_items")
    .update({ raw_fields: rawFields, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToItem(data as ModuleItemRow);
}

export async function updateDocumentationModuleItemStatus(
  itemId: string,
  input: {
    status: SwitchboardCircuitStatus;
    note: string | null;
    updatedById: string | null;
    updatedByName: string;
  },
): Promise<DocumentationModuleItem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("documentation_module_items")
    .update({
      status: input.status,
      note: input.note?.trim() || null,
      updated_by_id: input.updatedById,
      updated_by_name: input.updatedByName.trim() || "Instalator",
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToItem(data as ModuleItemRow);
}

export async function linkDocumentationModuleItemEmployeeReport(
  itemId: string,
  input: { target: "agreement" | "change_request"; recordId: string },
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("documentation_module_items")
    .update({
      employee_report_target: input.target,
      employee_report_id: input.recordId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}

/** "Ogarnięte" — niezależne od statusu montażu, ustawiane po zgłoszeniu do biura/zapotrzebowania
 *  albo ręcznie. Status i historia zmian statusu zostają bez zmian. */
export async function markDocumentationModuleItemHandled(
  itemId: string,
  input: { note: string; actorId: string | null; actorName: string },
): Promise<DocumentationModuleItem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("documentation_module_items")
    .update({
      handled_at: new Date().toISOString(),
      handled_by_id: input.actorId,
      handled_by_name: input.actorName.trim() || "Zespół",
      handled_note: input.note.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToItem(data as ModuleItemRow);
}

export async function fetchDocumentationModuleItemHistory(
  itemId: string,
): Promise<DocumentationModuleItemHistoryEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("documentation_module_item_history")
    .select("*")
    .eq("item_id", itemId)
    .order("changed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ModuleItemHistoryRow[]).map(rowToHistoryEntry);
}

/**
 * Archiwizuje zakończenie (lub cofnięcie) modułu i — przy zakończeniu — powiadamia osobę
 * odpowiedzialną za etap. Idzie przez API (nie zapis bezpośredni z przeglądarki), żeby "kto
 * zakończył" pochodziło z sesji serwera — ten sam wzorzec co `setSwitchboardCompletion`.
 */
export async function setDocumentationModuleCompletion(
  projectId: string,
  moduleId: string,
  input: { reopen?: boolean } = {},
): Promise<DocumentationModule> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/documentation-modules/${encodeURIComponent(moduleId)}/complete`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reopen: Boolean(input.reopen) }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? "Nie udało się zapisać statusu zakończenia.");
  }
  return rowToModule(payload.module as ModuleRow);
}
