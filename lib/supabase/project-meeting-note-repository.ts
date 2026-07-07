import type {
  MeetingNoteStatus,
  ProjectMeetingNote,
  ProjectMeetingNoteInput,
} from "@/lib/dashboard/meeting-note-types";
import { normalizeMeetingNoteInput } from "@/lib/dashboard/meeting-note-types";
import { getSupabase } from "@/lib/supabase/client";

type MeetingNoteRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  meeting_at: string | null;
  author_name: string;
  status: string;
  published_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

function isStatus(value: string): value is MeetingNoteStatus {
  return value === "draft" || value === "published";
}

export function rowToMeetingNote(row: MeetingNoteRow): ProjectMeetingNote {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    meetingAt: row.meeting_at,
    authorName: row.author_name,
    status: isStatus(row.status) ? row.status : "draft",
    publishedAt: row.published_at,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjectMeetingNotes(
  projectId: string,
  options?: { publishedOnly?: boolean },
): Promise<ProjectMeetingNote[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("project_meeting_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (options?.publishedOnly) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToMeetingNote(row as MeetingNoteRow));
}

export async function createProjectMeetingNote(
  projectId: string,
  input: ProjectMeetingNoteInput,
  authorName: string,
) {
  const normalized = normalizeMeetingNoteInput(input);
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: lastRow } = await supabase
    .from("project_meeting_notes")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((lastRow as { position?: number } | null)?.position ?? -1) + 1;
  const status = normalized.status ?? "draft";
  const publishedAt = status === "published" ? now : null;

  const { data, error } = await supabase
    .from("project_meeting_notes")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      title: normalized.title || "Notatka ze spotkania",
      body: normalized.body,
      meeting_at: normalized.meetingAt,
      author_name: authorName.trim() || "Zespół",
      status,
      published_at: publishedAt,
      position,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToMeetingNote(data as MeetingNoteRow);
}

export async function updateProjectMeetingNote(noteId: string, input: ProjectMeetingNoteInput) {
  const normalized = normalizeMeetingNoteInput(input);
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("project_meeting_notes")
    .select("status, published_at")
    .eq("id", noteId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const nextStatus = normalized.status ?? (existing?.status as MeetingNoteStatus | undefined) ?? "draft";
  const publishedAt =
    nextStatus === "published"
      ? (existing?.published_at as string | null) ?? now
      : null;

  const { data, error } = await supabase
    .from("project_meeting_notes")
    .update({
      title: normalized.title || "Notatka ze spotkania",
      body: normalized.body,
      meeting_at: normalized.meetingAt,
      status: nextStatus,
      published_at: publishedAt,
      updated_at: now,
    })
    .eq("id", noteId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToMeetingNote(data as MeetingNoteRow);
}

export async function publishProjectMeetingNote(noteId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_meeting_notes")
    .update({
      status: "published",
      published_at: now,
      updated_at: now,
    })
    .eq("id", noteId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToMeetingNote(data as MeetingNoteRow);
}

export async function deleteProjectMeetingNote(noteId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_meeting_notes").delete().eq("id", noteId);

  if (error) {
    throw new Error(error.message);
  }
}
