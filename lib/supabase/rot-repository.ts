// Faza 4 (ROT jako widok) — docs/08 D2/D9/D12/D13/D14.
import { getSupabase } from "@/lib/supabase/client";
import type { RotCategory, RotItem, RotSourceType } from "@/lib/rot/types";
import type { RotStatus } from "@/lib/process/kanban-types";

export async function fetchRotItems(): Promise<RotItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_rot_items");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    sourceType: row.source_type as RotSourceType,
    sourceId: row.source_id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    rotStatus: row.rot_status as RotStatus,
    category: (row.category as RotCategory | null) ?? null,
    detail: row.detail,
    openedAt: row.opened_at,
    daysOpen: row.days_open,
  }));
}
