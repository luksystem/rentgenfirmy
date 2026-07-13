"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskChecklistItem, TaskChecklistParent } from "@/lib/task-checklist/types";
import {
  createTaskChecklistItem,
  deleteTaskChecklistItem,
  fetchTaskChecklistItems,
  updateTaskChecklistItem,
} from "@/lib/supabase/task-checklist-repository";

export function TaskChecklistPanel({
  parent,
  disabled = false,
  className,
}: {
  parent: TaskChecklistParent | null;
  disabled?: boolean;
  className?: string;
}) {
  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!parent) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchTaskChecklistItems(parent);
      setItems(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać podzadań.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [parent]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function handleAdd() {
    if (!parent || !newTitle.trim() || disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const item = await createTaskChecklistItem({ parent, title: newTitle.trim() });
      setItems((current) => [...current, item]);
      setNewTitle("");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Nie udało się dodać podzadania.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(item: TaskChecklistItem) {
    if (disabled) return;
    setError(null);
    const nextCompleted = !item.isCompleted;
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, isCompleted: nextCompleted } : entry,
      ),
    );
    try {
      const updated = await updateTaskChecklistItem(item.id, { isCompleted: nextCompleted });
      setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
    } catch (toggleError) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isCompleted: item.isCompleted } : entry,
        ),
      );
      setError(toggleError instanceof Error ? toggleError.message : "Nie udało się zaktualizować podzadania.");
    }
  }

  async function handleDelete(item: TaskChecklistItem) {
    if (disabled) return;
    setError(null);
    const previous = items;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    try {
      await deleteTaskChecklistItem(item.id);
    } catch (deleteError) {
      setItems(previous);
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć podzadania.");
    }
  }

  if (!parent) {
    return (
      <section className={cn("rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2 text-sm text-muted", className)}>
        <p className="font-medium text-foreground/90">Podzadania pomocnicze</p>
        <p className="mt-1 text-xs">Zapisz element, aby dodać checklistę podzadań.</p>
      </section>
    );
  }

  const completedCount = items.filter((item) => item.isCompleted).length;

  return (
    <section className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-foreground">Podzadania pomocnicze</h3>
        {items.length ? (
          <span className="text-xs text-muted">
            {completedCount}/{items.length}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        Checklista wewnątrz zadania — nie pojawia się na liście zadań. Termin i kontekst pochodzą z zadania głównego.
      </p>

      {loading ? <p className="text-sm text-muted">Wczytywanie…</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-2 rounded-lg border border-border/50 px-2 py-1.5",
              item.isCompleted ? "bg-surface-muted/20" : "bg-transparent",
            )}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleToggle(item)}
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition",
                item.isCompleted
                  ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                  : "border-border/70 text-transparent hover:border-foreground/40",
              )}
              aria-label={item.isCompleted ? "Oznacz jako niewykonane" : "Oznacz jako wykonane"}
            >
              <Check className="h-3 w-3" />
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 text-sm",
                item.isCompleted ? "text-muted line-through" : "text-foreground",
              )}
            >
              {item.title}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleDelete(item)}
              className="shrink-0 rounded p-1 text-muted transition hover:bg-surface-muted/40 hover:text-rose-300"
              aria-label="Usuń podzadanie"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!loading && !items.length ? <p className="text-sm text-muted">Brak podzadań.</p> : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Nowe podzadanie…"
          disabled={disabled || submitting}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAdd();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || submitting || !newTitle.trim()}
          onClick={() => void handleAdd()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
