export const MEETING_NOTE_STATUSES = ["draft", "published"] as const;

export type MeetingNoteStatus = (typeof MEETING_NOTE_STATUSES)[number];

export type ProjectMeetingNote = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  meetingAt: string | null;
  authorName: string;
  status: MeetingNoteStatus;
  publishedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMeetingNoteInput = {
  title: string;
  body: string;
  meetingAt?: string | null;
  status?: MeetingNoteStatus;
};

export function normalizeMeetingNoteInput(input: ProjectMeetingNoteInput): ProjectMeetingNoteInput {
  return {
    title: input.title.trim(),
    body: input.body.trim(),
    meetingAt: input.meetingAt?.trim() || null,
    status: input.status,
  };
}

export function isRecentPublishedMeetingNote(note: ProjectMeetingNote, withinDays = 14) {
  if (note.status !== "published" || !note.publishedAt) {
    return false;
  }

  const publishedAt = new Date(note.publishedAt).getTime();
  if (!Number.isFinite(publishedAt)) {
    return false;
  }

  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  return publishedAt >= cutoff;
}
