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
    reviewDate: row.review_date,
  }));
}

/** Faza 7 (D3/D26) — ustawienie/zmiana daty kontroli pozycji ROT (upsert po source_type+source_id). */
export async function setRotItemReviewDate(
  sourceType: RotSourceType,
  sourceId: string,
  reviewDate: string,
  actorId?: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("rot_item_reviews")
    .upsert(
      { source_type: sourceType, source_id: sourceId, review_date: reviewDate, set_by: actorId ?? null },
      { onConflict: "source_type,source_id" },
    );
  if (error) {
    throw new Error(error.message);
  }
}

/** Faza 7 (D3/D26) — usunięcie daty kontroli pozycji ROT. */
export async function clearRotItemReviewDate(sourceType: RotSourceType, sourceId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("rot_item_reviews")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) {
    throw new Error(error.message);
  }
}
