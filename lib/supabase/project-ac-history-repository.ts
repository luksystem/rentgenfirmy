import type { ProjectAcHistoryItem, ProjectAcLink } from "@/lib/dashboard/ac-history-types";
import { getSupabase } from "@/lib/supabase/client";

function isMissingTableError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("could not find") ||
    normalized.includes("schema cache")
  );
}

export async function fetchProjectAcLink(projectId: string): Promise<ProjectAcLink[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_ac_link")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    projectId: row.project_id,
    acProjectId: row.ac_project_id,
    acZip: row.ac_zip,
    acProjectName: row.ac_project_name,
    matchScore: row.match_score,
    importedAt: row.imported_at,
  }));
}

export async function fetchProjectAcHistory(projectId: string): Promise<ProjectAcHistoryItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_ac_history_items")
    .select("*")
    .eq("project_id", projectId)
    .order("ac_created_on", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    kind: row.kind === "task" || row.kind === "subtask" ? row.kind : "comment",
    acId: row.ac_id,
    acTaskId: row.ac_task_id,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    isCompleted: row.is_completed,
    attachmentNames: row.attachment_names ?? [],
    acCreatedOn: row.ac_created_on,
    acCompletedOn: row.ac_completed_on,
  }));
}
