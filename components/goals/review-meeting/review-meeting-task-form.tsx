"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  addGoalInitiative,
  addGoalLink,
  updateGoalInitiativeStatus,
} from "@/lib/supabase/goal-repository";
import { addMeetingAction } from "@/lib/supabase/goal-review-meeting-repository";
import { createKanbanTask } from "@/lib/supabase/kanban-repository";
import { useAuthStore } from "@/store/auth-store";
import { useKanbanCacheStore } from "@/store/kanban-cache-store";

export function ReviewMeetingTaskForm({
  meetingId,
  goalId,
  itemId,
  projectId,
  onCreated,
}: {
  meetingId: string;
  goalId: string;
  itemId: string;
  projectId: string | null;
  onCreated: () => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const ensureAllBoards = useKanbanCacheStore((s) => s.ensureAllBoards);
  const allBoards = useKanbanCacheStore((s) => s.allBoards);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [alsoKanban, setAlsoKanban] = useState(false);
  const [columnId, setColumnId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (alsoKanban) {
      void ensureAllBoards();
    }
  }, [alsoKanban, ensureAllBoards]);

  const boards = (allBoards ?? []).filter((board) =>
    projectId ? board.projectId === projectId : true,
  );

  const columns = boards.flatMap((board) =>
    board.columns.map((column) => ({
      id: column.id,
      label: `${board.projectName ?? "Projekt"} · ${column.title}`,
    })),
  );

  useEffect(() => {
    if (!alsoKanban) return;
    if (columnId && columns.some((c) => c.id === columnId)) return;
    setColumnId(columns[0]?.id ?? "");
  }, [alsoKanban, columns, columnId]);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Podaj tytuł zadania.");
      return;
    }
    if (alsoKanban && !columnId) {
      setError("Wybierz kolumnę Kanban albo odznacz tworzenie zadania.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const initiative = await addGoalInitiative({
        goalId,
        kind: "task",
        title: trimmed,
        description,
        source: "manual",
      });

      let kanbanTaskId: string | null = null;
      if (alsoKanban && columnId) {
        const task = await createKanbanTask({
          columnId,
          title: trimmed,
          description,
          authorSide: "team",
          authorName: profile ? getUserDisplayName(profile) : "Zespół",
        });
        kanbanTaskId = task.id;
        await addGoalLink({
          goalId,
          linkedType: "kanban_task",
          linkedId: task.id,
        });
        await updateGoalInitiativeStatus(initiative.id, "converted", task.id);
      }

      await addMeetingAction({
        meetingId,
        goalId,
        itemId,
        initiativeId: initiative.id,
        kanbanTaskId,
        title: trimmed,
        createdBy: profile?.id ?? null,
      });

      setTitle("");
      setDescription("");
      setAlsoKanban(false);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć zadania.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Dodaj zadanie do celu
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted/20 p-3">
      <Field label="Tytuł zadania">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Co trzeba zrobić?" />
      </Field>
      <Field label="Opis (opcjonalnie)">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Szczegóły, termin, kontekst…"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={alsoKanban}
          onChange={(e) => setAlsoKanban(e.target.checked)}
        />
        Utwórz też zadanie Kanban (powiązane z celem)
      </label>
      {alsoKanban ? (
        <Field label="Kolumna Kanban">
          <Select value={columnId} onChange={(e) => setColumnId(e.target.value)}>
            <option value="">Wybierz kolumnę…</option>
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Zapisz
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => setOpen(false)}
        >
          Anuluj
        </Button>
      </div>
    </div>
  );
}
