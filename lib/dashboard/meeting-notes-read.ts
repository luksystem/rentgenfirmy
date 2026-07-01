import type { ProjectMeetingNote } from "@/lib/dashboard/meeting-note-types";

const STORAGE_PREFIX = "rentgen-meeting-notes-read";

function storageKey(projectId: string) {
  return `${STORAGE_PREFIX}:${projectId}`;
}

export function getReadMeetingNoteIds(projectId: string): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function markMeetingNotesRead(projectId: string, noteIds: string[]) {
  if (typeof window === "undefined" || noteIds.length === 0) {
    return;
  }

  const existing = getReadMeetingNoteIds(projectId);
  for (const id of noteIds) {
    existing.add(id);
  }
  localStorage.setItem(storageKey(projectId), JSON.stringify([...existing]));
}

export function countUnreadMeetingNotes(projectId: string, notes: ProjectMeetingNote[]) {
  const readIds = getReadMeetingNoteIds(projectId);
  return notes.filter((note) => note.status === "published" && !readIds.has(note.id)).length;
}

export function isRichTextEmpty(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length === 0;
}
