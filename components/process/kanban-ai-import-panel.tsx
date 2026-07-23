"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { KanbanAiGeneratedTask } from "@/lib/ai/kanban-task-generator";
import {
  KANBAN_PRIORITY_LABELS,
  KANBAN_PRIORITIES,
  type KanbanAuthorSide,
  type KanbanPriority,
} from "@/lib/process/kanban-types";
import { createKanbanTask } from "@/lib/supabase/kanban-repository";
import { formatDate } from "@/lib/utils";

type DraftTask = KanbanAiGeneratedTask & {
  draftId: string;
  selected: boolean;
};

function toDraftTasks(tasks: KanbanAiGeneratedTask[]): DraftTask[] {
  return tasks.map((task) => ({
    ...task,
    draftId: crypto.randomUUID(),
    selected: true,
  }));
}

export function KanbanAiImportPanel({
  firstColumnId,
  firstColumnTitle,
  authorSide,
  authorName,
  onCreated,
  initialClientText,
  onConsumeInitialClientText,
}: {
  firstColumnId: string;
  firstColumnTitle: string;
  authorSide: KanbanAuthorSide;
  authorName: string;
  onCreated: () => Promise<void>;
  /** Notatka z checklisty etapu zamykającego — wstępnie wypełnia i otwiera panel raz. */
  initialClientText?: string;
  onConsumeInitialClientText?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [clientText, setClientText] = useState("");
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const draftsPreviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initialClientText) {
      return;
    }
    setClientText(initialClientText);
    setOpen(true);
    onConsumeInitialClientText?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientText]);

  const selectedCount = useMemo(
    () => drafts.filter((task) => task.selected && task.title.trim()).length,
    [drafts],
  );

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/process/kanban/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientText }),
      });
      const payload = (await response.json()) as {
        tasks?: KanbanAiGeneratedTask[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wygenerować tasków.");
      }
      if (!payload.tasks?.length) {
        throw new Error("AI nie zwróciło żadnych zadań.");
      }
      setDrafts(toDraftTasks(payload.tasks));
      setMessage(`Wygenerowano ${payload.tasks.length} propozycji — sprawdź przed dodaniem.`);
    } catch (generateError) {
      setError(
        generateError instanceof Error ? generateError.message : "Błąd generowania tasków.",
      );
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!drafts.length) {
      return;
    }
    draftsPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [drafts.length]);

  function updateDraft(draftId: string, patch: Partial<DraftTask>) {
    setDrafts((current) =>
      current.map((task) => (task.draftId === draftId ? { ...task, ...patch } : task)),
    );
  }

  function removeDraft(draftId: string) {
    setDrafts((current) => current.filter((task) => task.draftId !== draftId));
  }

  async function handleCreateSelected() {
    const selected = drafts.filter((task) => task.selected && task.title.trim());
    if (!selected.length) {
      setError("Zaznacz co najmniej jedno zadanie.");
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      for (const task of selected) {
        await createKanbanTask({
          columnId: firstColumnId,
          title: task.title.trim(),
          description: task.description.trim(),
          dueDate: /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : null,
          priority: task.priority,
          authorSide,
          authorName,
        });
      }
      setClientText("");
      setDrafts([]);
      setMessage(`Dodano ${selected.length} tasków do kolumny „${firstColumnTitle}".`);
      await onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Błąd tworzenia tasków.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid min-w-0 max-w-full shrink-0 gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          AI: wiadomość klienta → taski
        </span>
        <span className="text-xs text-muted">{open ? "Zwiń" : "Rozwiń"}</span>
      </button>

      {open ? (
        <div className="grid gap-3">
          <p className="text-xs text-muted">
            Wklej całą wiadomość od klienta — AI utworzy wpis na każdy fragment (także pytania i
            uwagi), z pełnym opisem ze źródła, bez dopisywania od siebie. Termin domyślnie za 14
            dni, jeśli klient nie poda daty. Wpisy trafią do pierwszej kolumny:{" "}
            <span className="font-medium text-foreground">{firstColumnTitle}</span>.
          </p>

          <Field label="Tekst od klienta">
            <textarea
              value={clientText}
              onChange={(event) => setClientText(event.target.value)}
              rows={6}
              placeholder="Np. Proszę o poprawę scen wjazdu, dodanie głośnika w łazience do końca miesiąca, a termostat w salonie ustawić za 2 tygodnie…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={generating || creating || !clientText.trim()}
              onClick={() => void handleGenerate()}
            >
              {generating ? "Generowanie…" : "Wygeneruj taski"}
            </Button>
            {drafts.length ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={creating || generating || !selectedCount}
                onClick={() => void handleCreateSelected()}
              >
                {creating
                  ? "Dodawanie…"
                  : `Dodaj ${selectedCount} do „${firstColumnTitle}"`}
              </Button>
            ) : null}
          </div>

          {drafts.length ? (
            <div
              ref={draftsPreviewRef}
              className="grid max-h-[min(55vh,520px)] gap-2 overflow-y-auto overscroll-y-contain pr-1"
            >
              {drafts.map((task) => (
                <div
                  key={task.draftId}
                  className="grid gap-2 rounded-lg border border-border/60 bg-surface/50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={task.selected}
                        onChange={(event) =>
                          updateDraft(task.draftId, { selected: event.target.checked })
                        }
                      />
                      Zadanie
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="ml-auto"
                      onClick={() => removeDraft(task.draftId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={task.title}
                    onChange={(event) => updateDraft(task.draftId, { title: event.target.value })}
                    placeholder="Tytuł taska"
                  />
                  <textarea
                    value={task.description}
                    onChange={(event) =>
                      updateDraft(task.draftId, { description: event.target.value })
                    }
                    rows={4}
                    placeholder="Opis — szczegóły z wiadomości klienta"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Termin">
                      <Input
                        type="date"
                        value={task.dueDate}
                        onChange={(event) =>
                          updateDraft(task.draftId, { dueDate: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Priorytet">
                      <Select
                        value={task.priority}
                        onChange={(event) =>
                          updateDraft(task.draftId, {
                            priority: event.target.value as KanbanPriority,
                          })
                        }
                      >
                        {KANBAN_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {KANBAN_PRIORITY_LABELS[priority]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <p className="text-xs text-muted">Termin: {formatDate(task.dueDate)}</p>
                </div>
              ))}
            </div>
          ) : null}

          {message ? <p className="text-xs text-emerald-400">{message}</p> : null}
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
