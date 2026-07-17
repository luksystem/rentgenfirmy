"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { UpdateWeekPlanInput, WorkPlanView } from "@/lib/my-work/plan-types";
import { isTerminalWorkItemStatus, type WorkItemView } from "@/lib/my-work/types";
import { workItemProjectLabel } from "@/lib/my-work/display-labels";
import { cn, formatDate } from "@/lib/utils";

type EditablePlanItem = {
  workItemId: string;
  title: string;
  projectName: string | null;
  plannedDate: string;
};

function clampDateToRange(date: string, from: string, to: string) {
  if (date < from) return from;
  if (date > to) return to;
  return date;
}

export function MyWorkEditWeekPlanDialog({
  plan,
  availableTasks,
  open,
  onOpenChange,
  onSave,
}: {
  plan: WorkPlanView | null;
  availableTasks: WorkItemView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateWeekPlanInput) => Promise<void>;
}) {
  const [managerComment, setManagerComment] = useState("");
  const [items, setItems] = useState<EditablePlanItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !plan) {
      return;
    }
    setManagerComment(plan.managerComment);
    setItems(
      plan.items.map((entry) => ({
        workItemId: entry.workItemId,
        title: entry.workItem?.title ?? "Zadanie",
        projectName: entry.workItem?.projectName ?? null,
        plannedDate: entry.plannedDate,
      })),
    );
  }, [open, plan]);

  const selectedIds = useMemo(() => new Set(items.map((item) => item.workItemId)), [items]);

  const addableTasks = useMemo(
    () =>
      availableTasks.filter(
        (task) => !isTerminalWorkItemStatus(task.status) && !selectedIds.has(task.id),
      ),
    [availableTasks, selectedIds],
  );

  if (!plan) {
    return null;
  }

  const activePlan = plan;

  function refreshFromTasks() {
    setItems(
      availableTasks
        .filter((task) => !isTerminalWorkItemStatus(task.status))
        .map((task) => ({
          workItemId: task.id,
          title: task.title,
          projectName: task.projectName,
          plannedDate: clampDateToRange(
            task.dueDate ?? task.plannedEnd ?? activePlan.dateFrom,
            activePlan.dateFrom,
            activePlan.dateTo,
          ),
        })),
    );
  }

  function addTask(task: WorkItemView) {
    setItems((current) => [
      ...current,
      {
        workItemId: task.id,
        title: task.title,
        projectName: task.projectName,
        plannedDate: clampDateToRange(
          task.dueDate ?? task.plannedEnd ?? activePlan.dateFrom,
          activePlan.dateFrom,
          activePlan.dateTo,
        ),
      },
    ]);
  }

  async function handleSave(sendImmediately: boolean) {
    setSubmitting(true);
    try {
      await onSave({
        managerComment,
        items: items.map((item, index) => ({
          workItemId: item.workItemId,
          plannedDate: item.plannedDate,
          sortOrder: index * 10,
        })),
        sendImmediately,
      });
      onOpenChange(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zapisać planu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edytuj plan tygodnia</DialogTitle>
          <DialogDescription>
            {formatDate(plan.dateFrom)} – {formatDate(plan.dateTo)} · dostosuj pozycje, daty i
            komentarz. Zapis jako szkic lub wyślij ponownie do pracownika.
          </DialogDescription>
        </DialogHeader>

        <Field label="Komentarz managera">
          <Textarea
            value={managerComment}
            onChange={(event) => setManagerComment(event.target.value)}
            rows={2}
          />
        </Field>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Pozycje w planie ({items.length})</p>
          <Button type="button" variant="outline" size="sm" onClick={refreshFromTasks}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Odśwież ze zadań
          </Button>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/80 p-2">
          {!items.length ? (
            <p className="px-2 py-4 text-center text-sm text-muted">Brak pozycji w planie.</p>
          ) : (
            items.map((item) => {
              const projectLabel = workItemProjectLabel(item.projectName);
              const hasProject = Boolean(item.projectName?.trim());
              return (
              <div
                key={item.workItemId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-surface px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span
                    className={cn(
                      "block truncate text-xs",
                      hasProject ? "text-foreground/80" : "italic text-muted",
                    )}
                  >
                    {projectLabel}
                  </span>
                </div>
                <Input
                  type="date"
                  className="w-[150px]"
                  min={plan.dateFrom}
                  max={plan.dateTo}
                  value={item.plannedDate}
                  onChange={(event) => {
                    const value = event.target.value;
                    setItems((current) =>
                      current.map((entry) =>
                        entry.workItemId === item.workItemId
                          ? {
                              ...entry,
                              plannedDate: clampDateToRange(value, plan.dateFrom, plan.dateTo),
                            }
                          : entry,
                      ),
                    );
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((entry) => entry.workItemId !== item.workItemId),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
            })
          )}
        </div>

        {addableTasks.length ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Dodaj z zadań pracownika</p>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/80 p-2">
              {addableTasks.map((task) => {
                const projectLabel = workItemProjectLabel(task.projectName);
                const hasProject = Boolean(task.projectName?.trim());
                return (
                <button
                  key={task.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-muted/50"
                  onClick={() => addTask(task)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{task.title}</span>
                    <span
                      className={cn(
                        "block truncate text-xs",
                        hasProject ? "text-foreground/80" : "italic text-muted",
                      )}
                    >
                      {projectLabel}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-muted" />
                </button>
              );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Anuluj
          </Button>
          <Button variant="outline" onClick={() => void handleSave(false)} disabled={submitting}>
            {submitting ? "Zapisywanie…" : "Zapisz szkic"}
          </Button>
          <Button onClick={() => void handleSave(true)} disabled={submitting || !items.length}>
            {submitting ? "Wysyłanie…" : "Zapisz i wyślij"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
