"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Eye,
  FileText,
  Link2,
  NotebookPen,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { RichHtml } from "@/components/ui/rich-html";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { isRichTextEmpty } from "@/lib/dashboard/meeting-notes-read";
import type { ProjectMeetingNote, ProjectMeetingNoteInput } from "@/lib/dashboard/meeting-note-types";
import type { ProjectDocument } from "@/lib/documents/types";
import type { ProcessItemLink } from "@/lib/process/types";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import { fetchProjectDocuments } from "@/lib/supabase/project-document-repository";
import {
  fetchProjectMeetingNotes,
  publishProjectMeetingNote,
  updateProjectMeetingNote,
} from "@/lib/supabase/project-meeting-note-repository";
import { cn, formatDateTime } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

function emptyNoteInput(): ProjectMeetingNoteInput {
  return { title: "", body: "", meetingAt: "", status: "draft" };
}

function noteToInput(note: ProjectMeetingNote): ProjectMeetingNoteInput {
  return {
    title: note.title,
    body: note.body,
    meetingAt: note.meetingAt ?? "",
    status: note.status,
  };
}

// Referencja musi być stabilna między renderami — nowa tablica `[]` przy każdym wywołaniu
// selektora Zustand powoduje nieskończoną pętlę renderów pod React 18 (useSyncExternalStore
// przy każdym commicie widzi "inny" snapshot i natychmiast planuje kolejny render).
const EMPTY_NOTE_LINKS: ProcessItemLink[] = [];

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
  const projectClientId = useAppStore(
    (state) => state.projects.find((entry) => entry.id === projectId)?.clientId ?? null,
  );
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    setReturnUrl(`${window.location.pathname}${window.location.search}`);
  }, []);

  const links = useProcessStore(
    (state) => state.noteLinksByProject[projectId]?.[projectProcessItemId] ?? EMPTY_NOTE_LINKS,
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
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<ProjectMeetingNoteInput>(emptyNoteInput());
  const [savingNote, setSavingNote] = useState(false);
  const [formattingNote, setFormattingNote] = useState(false);
  const [publishingNoteId, setPublishingNoteId] = useState<string | null>(null);
  const [noteFormError, setNoteFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureNoteLinks(projectId);
  }, [projectId, ensureNoteLinks]);

  const refreshLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const [documentRows, noteRows] = await Promise.all([
        fetchProjectDocuments({ projectId }),
        fetchProjectMeetingNotes(projectId),
      ]);
      setDocuments(documentRows);
      setNotes(noteRows);
    } finally {
      setLoadingLists(false);
    }
  }, [projectId]);

  useListAutoRefresh(refreshLists);

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

  function openNewNoteDialog() {
    setEditingNoteId(null);
    setNoteForm(emptyNoteInput());
    setNoteFormError(null);
    setNoteDialogOpen(true);
  }

  function openNoteDialog(note: ProjectMeetingNote) {
    setEditingNoteId(note.id);
    setNoteForm(noteToInput(note));
    setNoteFormError(null);
    setNoteDialogOpen(true);
  }

  async function handleFormatNoteWithAi() {
    if (isRichTextEmpty(noteForm.body)) {
      setNoteFormError("Wklej surowe notatki przed formatowaniem AI.");
      return;
    }

    setFormattingNote(true);
    setNoteFormError(null);
    try {
      const response = await fetch("/api/ai/format-meeting-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes: noteForm.body }),
      });
      const payload = (await response.json()) as { formatted?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się sformatować notatek.");
      }
      if (payload.formatted) {
        setNoteForm((current) => ({ ...current, body: payload.formatted ?? current.body }));
      }
    } catch (formatError) {
      setNoteFormError(formatError instanceof Error ? formatError.message : "Błąd formatowania AI.");
    } finally {
      setFormattingNote(false);
    }
  }

  async function handleSaveNote(publish = false) {
    if (isRichTextEmpty(noteForm.body)) {
      setNoteFormError("Treść notatki jest wymagana.");
      return;
    }

    setSavingNote(true);
    setNoteFormError(null);
    try {
      const payload: ProjectMeetingNoteInput = {
        ...noteForm,
        status: publish ? "published" : noteForm.status ?? "draft",
      };

      if (editingNoteId) {
        const updated = await updateProjectMeetingNote(editingNoteId, payload);
        setNotes((current) => current.map((note) => (note.id === editingNoteId ? updated : note)));
      } else {
        const created = await createAndLinkMeetingNote(
          projectId,
          projectProcessItemId,
          payload,
          actorName ?? "Zespół",
        );
        setNotes((current) => [created, ...current]);
      }

      setNoteDialogOpen(false);
    } catch (saveError) {
      setNoteFormError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać notatki.");
    } finally {
      setSavingNote(false);
    }
  }

  async function handlePublishNote(noteId: string) {
    setPublishingNoteId(noteId);
    try {
      const updated = await publishProjectMeetingNote(noteId);
      setNotes((current) => current.map((note) => (note.id === noteId ? updated : note)));
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Nie udało się opublikować notatki.");
    } finally {
      setPublishingNoteId(null);
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

  const newDocumentHref = `/dokumenty/nowy?projectId=${encodeURIComponent(projectId)}${
    projectClientId ? `&clientId=${encodeURIComponent(projectClientId)}` : ""
  }${returnUrl ? `&returnTo=${encodeURIComponent(returnUrl)}` : ""}`;

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
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    disabled={!note}
                    onClick={() => note && openNoteDialog(note)}
                  >
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-foreground underline-offset-2 hover:underline">
                        {note?.title || "Notatka"}
                      </span>
                      {note ? (
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            note.status === "published"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border-border/70 bg-surface-muted/40 text-muted",
                          )}
                        >
                          {note.status === "published" ? "Opublikowana" : "Szkic"}
                        </span>
                      ) : null}
                    </span>
                    {note?.body ? (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                        {note.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "Brak treści"}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {formatDateTime(note?.createdAt ?? link.createdAt)}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {note ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        title="Podgląd / edycja"
                        onClick={() => openNoteDialog(note)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {note && note.status === "draft" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        title="Opublikuj dla klienta"
                        disabled={publishingNoteId === note.id}
                        onClick={() => void handlePublishNote(note.id)}
                      >
                        <Send className="h-3.5 w-3.5 text-accent" />
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
          <Button type="button" size="sm" variant="secondary" onClick={openNewNoteDialog}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nowa notatka
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          Notatki opublikowane widzi klient w zakładce „Notatki”.
        </p>
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
                  {document?.fileUrl ? (
                    <a
                      href={document.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-medium text-foreground underline-offset-2 hover:underline">
                        {document.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">{formatDateTime(document.createdAt)}</p>
                    </a>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{document?.title ?? "Dokument"}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {document ? formatDateTime(document.createdAt) : ""}
                      </p>
                    </div>
                  )}
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
            <a href={newDocumentHref}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nowy dokument
            </a>
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          Dokumenty podpięte tutaj są widoczne w zakładce „Dokumenty” klienta.
        </p>
      </div>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNoteId ? "Notatka" : "Nowa notatka"}</DialogTitle>
            <DialogDescription>
              Wklej surowe zapiski i użyj AI — powstanie czytelna treść z nagłówkami, listami i
              pogrubieniami. Opublikowana notatka trafia do zakładki „Notatki” klienta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Tytuł">
              <Input
                value={noteForm.title}
                onChange={(event) => setNoteForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="np. Notatka z etapu procesu"
              />
            </Field>
            <Field label="Data spotkania (opcjonalnie)">
              <Input
                type="date"
                value={noteForm.meetingAt ?? ""}
                onChange={(event) =>
                  setNoteForm((current) => ({ ...current, meetingAt: event.target.value }))
                }
              />
            </Field>
            <Field label="Treść">
              <RichTextarea
                value={noteForm.body}
                onChange={(body) => setNoteForm((current) => ({ ...current, body }))}
                rows={10}
                placeholder="Wklej notatki…"
              />
            </Field>
            {noteForm.body.trim() && !isRichTextEmpty(noteForm.body) ? (
              <div className="rounded-xl border border-border/70 bg-surface-muted/10 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Podgląd dla klienta
                </p>
                <RichHtml html={noteForm.body} variant="document" fallback="Brak treści" />
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={formattingNote || isRichTextEmpty(noteForm.body)}
              onClick={() => void handleFormatNoteWithAi()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {formattingNote ? "Formatowanie…" : "Sformatuj z AI"}
            </Button>
            {noteFormError ? <p className="text-sm text-rose-400">{noteFormError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" disabled={savingNote} onClick={() => void handleSaveNote(false)}>
                {savingNote ? "Zapisywanie…" : "Zapisz szkic"}
              </Button>
              <Button type="button" disabled={savingNote} onClick={() => void handleSaveNote(true)}>
                Opublikuj dla klienta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
