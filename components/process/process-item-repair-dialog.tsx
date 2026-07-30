"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/input";
import { PROCESS_ITEM_KIND_LABELS, type ProcessItemKind, type ProjectProcessItem } from "@/lib/process/types";
import { fetchKanbanBoardByItemId } from "@/lib/supabase/kanban-repository";
import { formatDateTime } from "@/lib/utils";
import { useProcessStore } from "@/store/process-store";

type TemplateItemOption = {
  id: string;
  kind: ProcessItemKind;
  title: string;
  stageTitle: string;
  milestoneTitle: string;
};

export function ProcessItemRepairDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fetchOrphanedProcessItems = useProcessStore((state) => state.fetchOrphanedProcessItems);
  const reassignOrphanedProcessItem = useProcessStore((state) => state.reassignOrphanedProcessItem);
  const deleteOrphanedProcessItem = useProcessStore((state) => state.deleteOrphanedProcessItem);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orphans, setOrphans] = useState<ProjectProcessItem[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateItemOption[]>([]);
  const [kanbanTaskCounts, setKanbanTaskCounts] = useState<Record<string, number>>({});
  const [selectedTarget, setSelectedTarget] = useState<Record<string, string>>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const result = await fetchOrphanedProcessItems(projectId);
        if (cancelled) return;
        setOrphans(result.orphans);
        setTemplateItems(result.templateItems);

        const kanbanOrphans = result.orphans.filter((item) => item.kind === "kanban");
        const counts = await Promise.all(
          kanbanOrphans.map(async (item) => {
            const board = await fetchKanbanBoardByItemId(item.id);
            return [item.id, board?.tasks.length ?? 0] as const;
          }),
        );
        if (!cancelled) {
          setKanbanTaskCounts(Object.fromEntries(counts));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, fetchOrphanedProcessItems]);

  async function handleConnect(orphanId: string) {
    const targetId = selectedTarget[orphanId];
    if (!targetId) {
      setError("Wybierz element docelowy.");
      return;
    }
    setConnectingId(orphanId);
    setError(null);
    try {
      await reassignOrphanedProcessItem(projectId, orphanId, targetId);
      setOrphans((current) => current.filter((item) => item.id !== orphanId));
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Nie udało się podłączyć elementu.");
    } finally {
      setConnectingId(null);
    }
  }

  async function handleDelete(orphan: ProjectProcessItem) {
    const taskCount = kanbanTaskCounts[orphan.id] ?? 0;
    const confirmed = window.confirm(
      orphan.kind === "kanban" && taskCount > 0
        ? `Usunąć ten element na stałe wraz z tablicą kanban (${taskCount} zadań)? Tej operacji nie można cofnąć.`
        : "Usunąć ten element na stałe? Tej operacji nie można cofnąć.",
    );
    if (!confirmed) {
      return;
    }
    setDeletingId(orphan.id);
    setError(null);
    try {
      await deleteOrphanedProcessItem(projectId, orphan.id);
      setOrphans((current) => current.filter((item) => item.id !== orphan.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć elementu.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Napraw dopasowanie elementu</DialogTitle>
          <DialogDescription>
            Elementy poniżej mają dane (checklistę, tablicę kanban), ale ich miejsce w szablonie
            procesu już nie istnieje — zwykle po usunięciu i dodaniu elementu w innym miejscu w
            edytorze szablonu. Podłącz je do aktualnego miejsca w szablonie, żeby zachować dane.
          </DialogDescription>
        </DialogHeader>

        {loading ? <p className="text-sm text-muted">Ładowanie…</p> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {!loading && !orphans.length ? (
          <p className="text-sm text-muted">Brak osieroconych elementów w tym projekcie.</p>
        ) : null}

        <div className="grid gap-3">
          {orphans.map((orphan) => {
            const candidates = templateItems.filter((item) => item.kind === orphan.kind);
            return (
              <div key={orphan.id} className="grid gap-2 rounded-xl border border-border/70 bg-surface/40 p-3">
                <p className="text-sm font-medium text-foreground">
                  {orphan.lastKnownTitle
                    ? [orphan.lastKnownStageTitle, orphan.lastKnownMilestoneTitle, orphan.lastKnownTitle]
                        .filter(Boolean)
                        .join(" → ")
                    : PROCESS_ITEM_KIND_LABELS[orphan.kind]}
                  {orphan.kind === "kanban" ? ` — ${kanbanTaskCounts[orphan.id] ?? 0} zadań` : ""}
                </p>
                <p className="text-xs text-muted">
                  {orphan.lastKnownTitle ? `${PROCESS_ITEM_KIND_LABELS[orphan.kind]} · ` : ""}
                  Ostatnia aktualizacja: {formatDateTime(orphan.updatedAt)}
                </p>
                {candidates.length ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label="Podłącz do" className="min-w-[16rem] flex-1">
                      <Select
                        value={selectedTarget[orphan.id] ?? ""}
                        onChange={(event) =>
                          setSelectedTarget((current) => ({ ...current, [orphan.id]: event.target.value }))
                        }
                      >
                        <option value="">Wybierz element…</option>
                        {candidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.stageTitle} → {candidate.milestoneTitle} → {candidate.title}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Button
                      type="button"
                      size="sm"
                      disabled={connectingId === orphan.id || !selectedTarget[orphan.id]}
                      onClick={() => void handleConnect(orphan.id)}
                    >
                      {connectingId === orphan.id ? "Podłączanie…" : "Podłącz"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400">
                    Brak elementów tego samego typu w aktualnym szablonie.
                  </p>
                )}
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === orphan.id}
                    onClick={() => void handleDelete(orphan)}
                  >
                    {deletingId === orphan.id ? "Usuwanie…" : "Usuń na stałe"}
                  </Button>
                  <p className="mt-1 text-[11px] text-muted">
                    Usuwa element i jego dane bezpowrotnie — na własną odpowiedzialność, gdy nie ma
                    do czego go podłączyć.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
