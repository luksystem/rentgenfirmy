import { getSupabase } from "@/lib/supabase/client";
import type { ProjectRevenueForecastRow } from "@/lib/supabase/database.types";
import {
  projectRevenueForecastToInsertRow,
  projectRevenueForecastToUpdateRow,
  rowToProjectRevenueForecast,
} from "@/lib/supabase/budget-forecast-mappers";
import type {
  ProjectRevenueForecast,
  ProjectRevenueForecastInput,
  ProjectRevenueForecastWithProject,
} from "@/lib/budget-forecast/types";

export async function fetchProjectRevenueForecasts(projectId: string): Promise<ProjectRevenueForecast[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_revenue_forecasts")
    .select("*")
    .eq("project_id", projectId)
    .order("expected_month", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectRevenueForecastRow[]).map(rowToProjectRevenueForecast);
}

export async function fetchAllProjectRevenueForecastsWithProjectNames(): Promise<
  ProjectRevenueForecastWithProject[]
> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_revenue_forecasts")
    .select("*, projects(name, client_id)")
    .order("expected_month", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as Array<
    ProjectRevenueForecastRow & { projects?: { name: string; client_id: string | null } | null }
  >;

  return rows.map((row) => ({
    ...rowToProjectRevenueForecast(row),
    projectName: row.projects?.name ?? "—",
    clientId: row.projects?.client_id ?? null,
  }));
}

export async function fetchProjectRevenueForecastsInRange(
  fromMonth: string,
  toMonth: string,
): Promise<ProjectRevenueForecast[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_revenue_forecasts")
    .select("*")
    .gte("expected_month", fromMonth)
    .lte("expected_month", toMonth);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectRevenueForecastRow[]).map(rowToProjectRevenueForecast);
}

export async function createProjectRevenueForecast(
  input: ProjectRevenueForecastInput,
): Promise<ProjectRevenueForecast> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_revenue_forecasts")
    .insert(projectRevenueForecastToInsertRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectRevenueForecast(data as ProjectRevenueForecastRow);
}

export async function updateProjectRevenueForecast(
  id: string,
  patch: Partial<ProjectRevenueForecast>,
): Promise<ProjectRevenueForecast> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_revenue_forecasts")
    .update(projectRevenueForecastToUpdateRow(patch))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectRevenueForecast(data as ProjectRevenueForecastRow);
}

export async function deleteProjectRevenueForecast(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_revenue_forecasts").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
