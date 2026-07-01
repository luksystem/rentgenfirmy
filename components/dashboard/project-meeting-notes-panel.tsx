"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { CollapsibleSection } from "@/components/dashboard/agreement-collapsible-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { RichHtml } from "@/components/ui/rich-html";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { isRichTextEmpty } from "@/lib/dashboard/meeting-notes-read";
import type { ProjectMeetingNote, ProjectMeetingNoteInput } from "@/lib/dashboard/meeting-note-types";
import {
  createProjectMeetingNote,
  deleteProjectMeetingNote,
  fetchProjectMeetingNotes,
  publishProjectMeetingNote,
  updateProjectMeetingNote,
} from "@/lib/supabase/project-meeting-note-repository";
import { cn, formatDate } from "@/lib/utils";

function emptyInput(): ProjectMeetingNoteInput {
  return {
    title: "",
    body: "",
    meetingAt: "",
    status: "draft",
  };
}

function noteToInput(note: ProjectMeetingNote): ProjectMeetingNoteInput {
  return {
    title: note.title,
    body: note.body,
    meetingAt: note.meetingAt ?? "",
    status: note.status,
  };
}

function noteSummary(note: ProjectMeetingNote) {
  const plain = note.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) {
    return "Brak treści";
  }
  return plain.length > 140 ? `${plain.slice(0, 140)}…` : plain;
}

export function ProjectMeetingNotesPanel({
  projectId,
  mode,
  authorName,
  seedNotes,
  collapseNotes = false,
  onNotesViewed,
}: {
  projectId: string;
  mode: "team" | "client";
  authorName: string;
  seedNotes?: ProjectMeetingNote[];
  collapseNotes?: boolean;
  onNotesViewed?: (noteIds: string[]) => void;
}) {
  const [notes, setNotes] = useState<ProjectMeetingNote[]>(seedNotes ?? []);
  const [loading, setLoading] = useState(seedNotes === undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectMeetingNoteInput>(emptyInput());
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (seedNotes !== undefined) {
      setNotes(seedNotes);
      setLoading(false);
      return;
    }

    void fetchProjectMeetingNotes(projectId, { publishedOnly: mode === "client" })
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [mode, projectId, seedNotes]);

  const visibleNotes = useMemo(
    () =>
      mode === "client"
        ? notes.filter((note) => note.status === "published")
        : notes,
    [mode, notes],
  );

  const shouldCollapseNotes = mode === "client" || collapseNotes;

  useEffect(() => {
    if (!shouldCollapseNotes || visibleNotes.length === 0) {
      return;
    }
    onNotesViewed?.(visibleNotes.map((note) => note.id));
  }, [onNotesViewed, shouldCollapseNotes, visibleNotes]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyInput());
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(note: ProjectMeetingNote) {
    setEditingId(note.id);
    setForm(noteToInput(note));
    setError(null);
    setDialogOpen(true);
  }

  async function handleFormatWithAi() {
    if (isRichTextEmpty(form.body)) {
      setError("Wklej surowe notatki przed formatowaniem AI.");
      return;
    }

    setFormatting(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/format-meeting-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes: form.body }),
      });
      const payload = (await response.json()) as { formatted?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się sformatować notatek.");
      }
      if (payload.formatted) {
        setForm((current) => ({ ...current, body: payload.formatted ?? current.body }));
      }
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "Błąd formatowania AI.");
    } finally {
      setFormatting(false);
    }
  }

  async function handleSave(publish = false) {
    if (isRichTextEmpty(form.body)) {
      setError("Treść notatki jest wymagana.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: ProjectMeetingNoteInput = {
        ...form,
        status: publish ? "published" : form.status ?? "draft",
      };

      if (editingId) {
        const updated = await updateProjectMeetingNote(editingId, payload);
        setNotes((current) =>
          current.map((note) => (note.id === editingId ? updated : note)),
        );
      } else {
        const created = await createProjectMeetingNote(projectId, payload, authorName);
        setNotes((current) => [created, ...current]);
      }

      setDialogOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać notatki.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(noteId: string) {
    const updated = await publishProjectMeetingNote(noteId);
    setNotes((current) => current.map((note) => (note.id === noteId ? updated : note)));
  }

  async function handleDelete(noteId: string) {
    await deleteProjectMeetingNote(noteId);
    setNotes((current) => current.filter((note) => note.id !== noteId));
  }

  function renderNoteBody(note: ProjectMeetingNote) {
    return (
      <RichHtml
        html={note.body}
        variant="document"
        className="text-foreground/90"
        fallback="Brak treści"
      />
    );
  }

  function renderNoteCard(note: ProjectMeetingNote) {
    const meta = [
      note.authorName,
      note.meetingAt ? `spotkanie ${formatDate(note.meetingAt)}` : null,
      note.publishedAt ? `opublikowano ${formatDate(note.publishedAt.slice(0, 10))}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    if (shouldCollapseNotes) {
      return (
        <CollapsibleSection
          key={note.id}
          title={note.title || "Notatka ze spotkania"}
          summary={[meta, noteSummary(note)].filter(Boolean).join(" · ")}
          defaultExpanded={false}
        >
          {renderNoteBody(note)}
        </CollapsibleSection>
      );
    }

    return (
      <article
        key={note.id}
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-surface-muted/15 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words font-medium text-foreground">
                {note.title || "Notatka ze spotkania"}
              </p>
              {mode === "team" ? (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    note.status === "published"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-border/70 bg-surface-muted/40 text-muted",
                  )}
                >
                  {note.status === "published" ? "Opublikowana" : "Szkic"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted">{meta}</p>
          </div>
          {mode === "team" ? (
            <div className="flex shrink-0 flex-wrap gap-1">
              {note.status === "draft" ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => void handlePublish(note.id)}>
                  Opublikuj
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={() => openEdit(note)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => void handleDelete(note.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
        <div className="mt-3">{renderNoteBody(note)}</div>
      </article>
    );
  }

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {mode === "client"
            ? "Podsumowania spotkań udostępnione przez zespół."
            : "Notatki ze spotkań — opublikuj, aby klient zobaczył je na dashboardzie."}
        </p>
        {mode === "team" ? (
          <Button type="button" size="sm" onClick={openCreate}>
            Nowa notatka
          </Button>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-muted">Ładowanie notatek…</p> : null}

      {!loading && visibleNotes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
          {mode === "client"
            ? "Brak opublikowanych notatek ze spotkań."
            : "Brak notatek. Dodaj pierwszą notatkę ze spotkania z klientem lub wykonawcą."}
        </p>
      ) : null}

      <div className="grid gap-3">{visibleNotes.map((note) => renderNoteCard(note))}</div>

      {mode === "team" ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edytuj notatkę" : "Nowa notatka ze spotkania"}</DialogTitle>
              <DialogDescription>
                Wklej surowe zapiski i użyj AI — powstanie czytelna treść z nagłówkami, listami i
                pogrubieniami. Opublikowana notatka będzie zwinięta na dashboardzie klienta.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Field label="Tytuł">
                <Input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="np. Spotkanie z klientem — ustalenia instalacji"
                />
              </Field>
              <Field label="Data spotkania">
                <Input
                  type="date"
                  value={form.meetingAt ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, meetingAt: event.target.value }))
                  }
                />
              </Field>
              <Field label="Treść">
                <RichTextarea
                  value={form.body}
                  onChange={(body) => setForm((current) => ({ ...current, body }))}
                  rows={12}
                  placeholder="Wklej notatki ze spotkania…"
                />
              </Field>
              {form.body.trim() && !isRichTextEmpty(form.body) ? (
                <div className="rounded-xl border border-border/70 bg-surface-muted/10 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Podgląd dla klienta
                  </p>
                  <RichHtml html={form.body} variant="document" fallback="Brak treści" />
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={formatting || isRichTextEmpty(form.body)}
                onClick={() => void handleFormatWithAi()}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {formatting ? "Formatowanie…" : "Sformatuj z AI"}
              </Button>
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" disabled={saving} onClick={() => void handleSave(false)}>
                  {saving ? "Zapisywanie…" : "Zapisz szkic"}
                </Button>
                <Button type="button" disabled={saving} onClick={() => void handleSave(true)}>
                  Opublikuj dla klienta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
