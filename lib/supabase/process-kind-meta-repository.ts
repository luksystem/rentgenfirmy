import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProcessItemKind } from "@/lib/process/types";
import {
  DEFAULT_PROCESS_ELEMENT_KIND_META,
  type ProcessElementKindMeta,
} from "@/lib/process/kind-meta";

type KindMetaRow = {
  kind: string;
  label: string;
  description: string;
  icon: string;
  supports_public_link: boolean;
  supports_internal_acceptance: boolean;
  sort_order: number;
  is_active: boolean;
};

function isProcessItemKind(value: string): value is ProcessItemKind {
  return value === "checklist" || value === "protocol" || value === "settlement" || value === "kanban";
}

function rowToKindMeta(row: KindMetaRow): ProcessElementKindMeta | null {
  if (!isProcessItemKind(row.kind)) {
    return null;
  }
  return {
    kind: row.kind,
    label: row.label,
    description: row.description,
    icon: row.icon,
    supportsPublicLink: row.supports_public_link,
    supportsInternalAcceptance: row.supports_internal_acceptance,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export async function fetchProcessElementKindMeta(
  supabase: SupabaseClient,
): Promise<ProcessElementKindMeta[]> {
  const { data, error } = await supabase
    .from("process_element_kind_meta")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return DEFAULT_PROCESS_ELEMENT_KIND_META;
  }

  const mapped = (data ?? [])
    .map((row) => rowToKindMeta(row as KindMetaRow))
    .filter((entry): entry is ProcessElementKindMeta => entry !== null);

  return mapped.length ? mapped : DEFAULT_PROCESS_ELEMENT_KIND_META;
}

export async function saveProcessElementKindMetaDescription(
  supabase: SupabaseClient,
  kind: ProcessItemKind,
  description: string,
) {
  const { error } = await supabase
    .from("process_element_kind_meta")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("kind", kind);

  if (error) {
    throw new Error(error.message);
  }
}
