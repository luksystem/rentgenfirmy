"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Link2, NotebookPen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ProjectMeetingNote } from "@/lib/dashboard/meeting-note-types";
import type { ProjectDocument } from "@/lib/documents/types";
import { fetchProjectDocuments } from "@/lib/supabase/project-document-repository";
import { fetchProjectMeetingNotes } from "@/lib/supabase/project-meeting-note-repository";
import { formatDateTime } from "@/lib/utils";
import { useProcessStore } from "@/store/process-store";

type ProcessNoteLinksBoardProps = {
  projectId: string;
  projectProcessItemId: string;
  actorName?: string;
};

export function ProcessNoteLinksBoard({
  projectId,
  projectProcessItemId,
  actorName,
}: ProcessNoteLinksBoardProps) {
  const links = useProcessStore(
    (state) => state.noteLinksByProject[projectId]?.[projectProcessItemId] ?? [],
  );
  const ensureNoteLinks = useProcessStore((state) => state.ensureNoteLinks);
  const linkDocumentToItem = useProcessStore((state) => state.linkDocumentToItem);
  const linkMeetingNoteToItem = useProcessStore((state) => state.linkMeetingNoteToItem);
  const createAndLinkMeetingNote = useProcessStore((state) => state.createAndLinkMeetingNote);
  const unlinkNoteLink = useProcessStore((state) => state.unlinkNoteLink);

  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [notes, setNotes] = useState<ProjectMeetingNote[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [linkingDocument, setLinkingDocument] = useState(false);
  const [linkingNote, setLinkingNote] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureNoteLinks(projectId);
  }, [projectId, ensureNoteLinks]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingLists(true);
      try {
        const [documentRows, noteRows] = await Promise.all([
          fetchProjectDocuments({ projectId }),
          fetchProjectMeetingNotes(projectId),
        ]);
        if (!cancelled) {
          setDocuments(documentRows);
          setNotes(noteRows);
        }
      } finally {
        if (!cancelled) {
          setLoadingLists(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const linkedDocumentIds = useMemo(
    () => new Set(links.filter((link) => link.documentId).map((link) => link.documentId as string)),
    [links],
  );
  const linkedNoteIds = useMemo(
    () =>
      new Set(links.filter((link) => link.meetingNoteId).map((link) => link.meetingNoteId as string)),
    [links],
  );

  const availableDocuments = documents.filter((document) => !linkedDocumentIds.has(document.id));
  const availableNotes = notes.filter((note) => !linkedNoteIds.has(note.id));

  const documentsById = useMemo(() => new Map(documents.map((document) => [document.id, document])), [
    documents,
  ]);
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  const noteLinks = links.filter((link) => link.meetingNoteId);
  const documentLinks = links.filter((link) => link.documentId);

  async function handleLinkDocument() {
    if (!selectedDocumentId) {
      return;
    }
    setLinkingDocument(true);
    setError(null);
    try {
      await linkDocumentToItem(projectId, projectProcessItemId, selectedDocumentId);
      setSelectedDocumentId("");
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Nie udało się podpiąć dokumentu.");
    } finally {
      setLinkingDocument(false);
    }
  }

  async function handleLinkNote() {
    if (!selectedNoteId) {
      return;
    }
    setLinkingNote(true);
    setError(null);
    try {
      await linkMeetingNoteToItem(projectId, projectProcessItemId, selectedNoteId);
      setSelectedNoteId("");
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Nie udało się podpiąć notatki.");
    } finally {
      setLinkingNote(false);
    }
  }

  async function handleCreateNote() {
    if (!newNoteTitle.trim() && !newNoteBody.trim()) {
      setError("Podaj tytuł lub treść notatki.");
      return;
    }
    setCreatingNote(true);
    setError(null);
    try {
      const created = await createAndLinkMeetingNote(
        projectId,
        projectProcessItemId,
        { title: newNoteTitle, body: newNoteBody, status: "draft" },
        actorName ?? "Zespół",
      );
      setNotes((current) => [created, ...current]);
      setNewNoteTitle("");
      setNewNoteBody("");
      setNewNoteOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Nie udało się utworzyć notatki.");
    } finally {
      setCreatingNote(false);
    }
  }

  async function handleUnlink(linkId: string) {
    setUnlinkingId(linkId);
    setError(null);
    try {
      await unlinkNoteLink(projectId, projectProcessItemId, linkId);
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : "Nie udało się odpiąć.");
    } finally {
      setUnlinkingId(null);
    }
  }

  const newDocumentHref = `/dokumenty/nowy?projectId=${encodeURIComponent(projectId)}`;

  return (
    <div className="grid gap-4">
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="rounded-xl border border-border/70 bg-surface-muted/25 p-3.5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <NotebookPen className="h-4 w-4 text-accent" />
          Notatki
        </p>

        {noteLinks.length > 0 ? (
          <div className="mt-2 grid gap-2">
            {noteLinks.map((link) => {
              const note = notesById.get(link.meetingNoteId as string);
              return (
                <div
                  key={link.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-surface-elevated/50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{note?.title || "Notatka"}</p>
                    {note?.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{note.body}</p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatDateTime(note?.createdAt ?? link.createdAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={unlinkingId === link.id}
                    onClick={() => void handleUnlink(link.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">Brak podpiętych notatek.</p>
        )}

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Podepnij istniejącą" className="min-w-[180px] flex-1">
            <Select
              value={selectedNoteId}
              onChange={(event) => setSelectedNoteId(event.target.value)}
              disabled={loadingLists || availableNotes.length === 0}
            >
              <option value="">
                {availableNotes.length === 0 ? "Brak dostępnych notatek" : "Wybierz notatkę…"}
              </option>
              {availableNotes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title || "Notatka bez tytułu"}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selectedNoteId || linkingNote}
            onClick={() => void handleLinkNote()}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Podepnij
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setNewNoteOpen((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nowa notatka
          </Button>
        </div>

        {newNoteOpen ? (
          <div className="mt-3 grid gap-2 rounded-lg border border-border/60 bg-surface-elevated/40 p-3">
            <Input
              value={newNoteTitle}
              onChange={(event) => setNewNoteTitle(event.target.value)}
              placeholder="Tytuł notatki"
            />
            <Textarea
              rows={3}
              value={newNoteBody}
              onChange={(event) => setNewNoteBody(event.target.value)}
              placeholder="Treść notatki…"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={creatingNote} onClick={() => void handleCreateNote()}>
                {creatingNote ? "Zapisywanie…" : "Zapisz i podepnij"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNewNoteOpen(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-surface-muted/25 p-3.5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4 text-accent" />
          Dokumenty
        </p>

        {documentLinks.length > 0 ? (
          <div className="mt-2 grid gap-2">
            {documentLinks.map((link) => {
              const document = documentsById.get(link.documentId as string);
              return (
                <div
                  key={link.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-surface-elevated/50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{document?.title ?? "Dokument"}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {document ? formatDateTime(document.createdAt) : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {document?.fileUrl ? (
                      <Button type="button" size="sm" variant="outline" asChild>
                        <a href={document.fileUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={unlinkingId === link.id}
                      onClick={() => void handleUnlink(link.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">Brak podpiętych dokumentów.</p>
        )}

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Podepnij istniejący" className="min-w-[180px] flex-1">
            <Select
              value={selectedDocumentId}
              onChange={(event) => setSelectedDocumentId(event.target.value)}
              disabled={loadingLists || availableDocuments.length === 0}
            >
              <option value="">
                {availableDocuments.length === 0 ? "Brak dostępnych dokumentów" : "Wybierz dokument…"}
              </option>
              {availableDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selectedDocumentId || linkingDocument}
            onClick={() => void handleLinkDocument()}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Podepnij
          </Button>
          <Button type="button" size="sm" variant="secondary" asChild>
            <a href={newDocumentHref} target="_blank" rel="noreferrer">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nowy dokument
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
