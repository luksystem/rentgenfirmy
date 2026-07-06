import type { ProcessItemLink } from "@/lib/process/types";
import { getSupabase } from "@/lib/supabase/client";

type ProcessItemLinkRow = {
  id: string;
  project_process_item_id: string;
  document_id: string | null;
  meeting_note_id: string | null;
  created_at: string;
};

function rowToProcessItemLink(row: ProcessItemLinkRow): ProcessItemLink {
  return {
    id: row.id,
    projectProcessItemId: row.project_process_item_id,
    documentId: row.document_id,
    meetingNoteId: row.meeting_note_id,
    createdAt: row.created_at,
  };
}

function isMissingTableError(message: string) {
  return message.toLowerCase().includes("does not exist");
}

/** Batch fetch — jedno zapytanie dla wszystkich elementów procesu projektu (bez N+1). */
export async function fetchProcessItemLinksForItems(
  projectProcessItemIds: string[],
): Promise<ProcessItemLink[]> {
  if (!projectProcessItemIds.length) {
    return [];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_item_links")
    .select("*")
    .in("project_process_item_id", projectProcessItemIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToProcessItemLink(row as ProcessItemLinkRow));
}

export async function linkDocumentToProcessItem(
  projectProcessItemId: string,
  documentId: string,
): Promise<ProcessItemLink> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_item_links")
    .insert({
      id: crypto.randomUUID(),
      project_process_item_id: projectProcessItemId,
      document_id: documentId,
      meeting_note_id: null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProcessItemLink(data as ProcessItemLinkRow);
}

export async function linkMeetingNoteToProcessItem(
  projectProcessItemId: string,
  meetingNoteId: string,
): Promise<ProcessItemLink> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_item_links")
    .insert({
      id: crypto.randomUUID(),
      project_process_item_id: projectProcessItemId,
      document_id: null,
      meeting_note_id: meetingNoteId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProcessItemLink(data as ProcessItemLinkRow);
}

export async function unlinkProcessItemLink(linkId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_process_item_links").delete().eq("id", linkId);

  if (error) {
    throw new Error(error.message);
  }
}
