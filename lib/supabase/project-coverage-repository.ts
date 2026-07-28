// Faza 6 (Cykl życia projektu) — docs/08 D19 §2a. Append-only: fetch + add, celowo brak update/delete
// (RLS na project_coverage_periods nie ma polityki UPDATE/DELETE — "nigdy edycja pierwotnej gwarancji").
import { getSupabase } from "@/lib/supabase/client";
import type { ProjectCoveragePeriod, ProjectCoveragePeriodInput } from "@/lib/project/coverage-types";
import type { ProjectCoveragePeriodRow } from "@/lib/supabase/database.types";

function rowToCoveragePeriod(row: ProjectCoveragePeriodRow): ProjectCoveragePeriod {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind as ProjectCoveragePeriod["kind"],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sourceRef: row.source_ref,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function fetchProjectCoveragePeriods(projectId: string): Promise<ProjectCoveragePeriod[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_coverage_periods")
    .select("*")
    .eq("project_id", projectId)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToCoveragePeriod);
}

/** INSERT nowego faktu pokrycia (przedłużenie/umowa serwisowa) — triggeruje natychmiastowe przeliczenie flow_status (migracja 228). */
export async function addProjectCoveragePeriod(
  projectId: string,
  input: ProjectCoveragePeriodInput,
  createdBy: string,
): Promise<ProjectCoveragePeriod> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_coverage_periods")
    .insert({
      project_id: projectId,
      kind: input.kind,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      source_ref: input.sourceRef ?? null,
      note: input.note ?? "",
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToCoveragePeriod(data);
}
