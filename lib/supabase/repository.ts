import { getSupabase } from "@/lib/supabase/client";
import {
  inputToProjectPayload,
  normalizeProjectCreatedAt,
  projectToCreateInsert,
  projectToInsert,
  interruptionToInsert,
  rowToInterruption,
  rowToProject,
} from "@/lib/supabase/mappers";
import type { Interruption, Project, ProjectInput } from "@/lib/types";

const currentUser = "Łukasz";

function withAudit(
  project: ProjectInput,
  existing?: Project,
): Pick<Project, "lastChangedBy" | "lastChangedAt" | "lastContactDate" | "createdAt"> {
  return {
    lastChangedAt: new Date().toISOString(),
    lastChangedBy: currentUser,
    lastContactDate:
      project.lastContactDate ??
      existing?.lastContactDate ??
      project.nextContactDate,
    createdAt: normalizeProjectCreatedAt(project.createdAt, existing?.createdAt),
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("last_changed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToProject);
}

export async function fetchInterruptions(): Promise<Interruption[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("interruptions")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToInterruption);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const supabase = getSupabase();
  const payload = inputToProjectPayload(input, withAudit(input));
  const { data, error } = await supabase
    .from("projects")
    .insert(projectToCreateInsert(payload))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProject(data);
}

export async function updateProjectRecord(
  id: string,
  input: ProjectInput,
  existing: Project,
): Promise<Project> {
  const supabase = getSupabase();
  const payload = inputToProjectPayload(input, withAudit(input, existing));
  const { data, error } = await supabase
    .from("projects")
    .update(projectToInsert(payload))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProject(data);
}

export async function updateProjectStage(id: string, stage: string): Promise<Project> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .update({
      stage,
      last_changed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProject(data);
}

export async function deleteProjectRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createInterruption(
  interruption: Omit<Interruption, "id">,
): Promise<Interruption> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("interruptions")
    .insert(interruptionToInsert(interruption))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToInterruption(data);
}

export async function updateInterruptionRecord(
  id: string,
  interruption: Omit<Interruption, "id">,
): Promise<Interruption> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("interruptions")
    .update(interruptionToInsert(interruption))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToInterruption(data);
}

export async function deleteInterruptionRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("interruptions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearAllData(): Promise<void> {
  const supabase = getSupabase();

  const { error: interruptionsError } = await supabase
    .from("interruptions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (interruptionsError) {
    throw new Error(interruptionsError.message);
  }

  const { error: projectsError } = await supabase
    .from("projects")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (projectsError) {
    throw new Error(projectsError.message);
  }
}
