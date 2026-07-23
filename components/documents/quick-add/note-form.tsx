"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { RichHtml } from "@/components/ui/rich-html";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { isRichTextEmpty } from "@/lib/dashboard/meeting-notes-read";
import type { ProjectMeetingNoteInput } from "@/lib/dashboard/meeting-note-types";
import { createProjectMeetingNote } from "@/lib/supabase/project-meeting-note-repository";

function emptyInput(): ProjectMeetingNoteInput {
  return { title: "", body: "", meetingAt: "", status: "draft" };
}

export function NoteQuickCreateForm({
  projectId,
  authorName,
  onCreated,
}: {
  projectId: string;
  authorName: string;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<ProjectMeetingNoteInput>(emptyInput());
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSave(publish: boolean) {
    if (isRichTextEmpty(form.body)) {
      setError("Treść notatki jest wymagana.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createProjectMeetingNote(
        projectId,
        { ...form, status: publish ? "published" : "draft" },
        authorName,
      );
      onCreated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać notatki.");
    } finally {
      setSaving(false);
    }
  }

  return (
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
          onChange={(event) => setForm((current) => ({ ...current, meetingAt: event.target.value }))}
        />
      </Field>
      <Field label="Treść">
        <RichTextarea
          value={form.body}
          onChange={(body) => setForm((current) => ({ ...current, body }))}
          rows={10}
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
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void handleSave(true)}>
          Opublikuj dla klienta
        </Button>
      </div>
    </div>
  );
}
