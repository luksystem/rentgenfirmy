import type {
  DashboardContentSection,
  DashboardContentType,
  ProjectDashboardContent,
  ProjectDashboardContentInput,
} from "@/lib/dashboard/content-types";
import { getSupabase } from "@/lib/supabase/client";

type ContentRow = {
  id: string;
  project_id: string;
  section: string;
  content_type: string;
  title: string;
  url: string;
  description: string;
  position: number;
  created_at: string;
  updated_at: string;
};

function isSection(value: string): value is DashboardContentSection {
  return value === "links" || value === "files" || value === "instructions";
}

function isContentType(value: string): value is DashboardContentType {
  return ["link", "image", "video", "youtube", "file"].includes(value);
}

function rowToContent(row: ContentRow): ProjectDashboardContent {
  return {
    id: row.id,
    projectId: row.project_id,
    section: isSection(row.section) ? row.section : "links",
    contentType: isContentType(row.content_type) ? row.content_type : "link",
    title: row.title,
    url: row.url,
    description: row.description,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjectDashboardContent(
  projectId: string,
): Promise<ProjectDashboardContent[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_dashboard_content")
    .select("*")
    .eq("project_id", projectId)
    .order("section")
    .order("position", { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToContent(row as ContentRow));
}

export async function addProjectDashboardContent(
  projectId: string,
  input: ProjectDashboardContentInput,
) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: lastRow } = await supabase
    .from("project_dashboard_content")
    .select("position")
    .eq("project_id", projectId)
    .eq("section", input.section)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((lastRow as { position?: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("project_dashboard_content")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      section: input.section,
      content_type: input.contentType ?? "link",
      title: input.title.trim(),
      url: input.url.trim(),
      description: input.description?.trim() || "",
      position,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContent(data as ContentRow);
}

export async function deleteProjectDashboardContent(contentId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_dashboard_content").delete().eq("id", contentId);

  if (error) {
    throw new Error(error.message);
  }
}
