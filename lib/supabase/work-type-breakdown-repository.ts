// Faza 8 (/docs/role/05-spec-obciazenie.md §3.4, /docs/08 D31) — udział czasu na poprawki i
// dokończenia wg przyczyn. Miara procesu, nie ludzi — świadomie bez user_id (patrz CLAUDE.md
// "nie buduj rankingu osób").
import { getSupabase } from "@/lib/supabase/client";
import type {
  TimeEntryWorkCause,
  TimeEntryWorkNature,
} from "@/lib/time-tracking/types";

export type WorkTypeBreakdownRow = {
  projectId: string | null;
  projectName: string | null;
  month: string;
  workNature: TimeEntryWorkNature;
  workCause: TimeEntryWorkCause | null;
  totalMinutes: number;
  entryCount: number;
};

export async function fetchWorkTypeBreakdown(options?: {
  projectId?: string;
  month?: string;
}): Promise<WorkTypeBreakdownRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_work_type_breakdown", {
    p_project_id: options?.projectId ?? null,
    p_month: options?.month ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    month: row.month,
    workNature: row.work_nature as TimeEntryWorkNature,
    workCause: (row.work_cause as TimeEntryWorkCause | null) ?? null,
    totalMinutes: row.total_minutes,
    entryCount: row.entry_count,
  }));
}
