"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  createTaskFromSource,
  fetchBoardTaskOwner,
  fetchTaskTargets,
  type BoardTaskOwner,
  type TaskTarget,
} from "@/lib/supabase/task-from-source-repository";

/**
 * D43 — „Utwórz zadanie” z ustalenia albo ze zmiany projektowej.
 *
 * Picker listuje ELEMENTY kanbanowe projektu, nie istniejące tablice: tablice są materializowane
 * leniwie, więc „tablica jeszcze nie istnieje” to najczęstszy przypadek, a nie błąd. Cele z etapu
 * bieżącego stoją na górze i pierwszy z nich jest preselektowany — zgodnie z decyzją właściciela
 * „priorytetowo z tego etapu, ale może też z innego”.
 *
 * Właściciel zadania NIE jest tu wybierany. Wynika z etapu wybranej tablicy przez macierz ról
 * (D42) i jest pokazywany, żeby manager wiedział, komu to spadnie — ale bez pickera osoby, bo
 * osoba nie jest atrybutem zadania, tylko konsekwencją obsady.
 */
export function TaskFromSourceDialog({
  open,
  onOpenChange,
  projectId,
  authorName,
  defaultTitle,
  defaultDescription,
  sourceAgreementId,
  sourceChangeRequestId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  authorName: string;
  defaultTitle: string;
  defaultDescription?: string;
  sourceAgreementId?: string | null;
  sourceChangeRequestId?: string | null;
  onCreated?: () => void;
}) {
  const [targets, setTargets] = useState<TaskTarget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [owner, setOwner] = useState<BoardTaskOwner | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setDescription(defaultDescription ?? "");
    setError(null);
    setLoading(true);

    let cancelled = false;
    void fetchTaskTargets(projectId)
      .then((rows) => {
        if (cancelled) return;
        setTargets(rows);
        setSelectedId(rows[0]?.projectProcessItemId ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Nie udało się wczytać tablic.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectId, defaultTitle, defaultDescription]);

  const selected = useMemo(
    () => targets.find((target) => target.projectProcessItemId === selectedId) ?? null,
    [targets, selectedId],
  );

  // Właściciela da się pokazać dopiero, gdy tablica istnieje — dla niezmaterializowanych
  // pokazujemy to wprost zamiast udawać, że nie wiadomo.
  useEffect(() => {
    if (!selected?.boardId) {
      setOwner(null);
      return;
    }
    let cancelled = false;
    void fetchBoardTaskOwner(selected.boardId)
      .then((row) => {
        if (!cancelled) setOwner(row);
      })
      .catch(() => {
        if (!cancelled) setOwner(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.boardId]);

  async function handleCreate() {
    if (!selected || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createTaskFromSource({
        target: selected,
        title: title.trim(),
        description: description.trim(),
        authorName,
        sourceAgreementId: sourceAgreementId ?? null,
        sourceChangeRequestId: sourceChangeRequestId ?? null,
      });
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć zadania.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Utwórz zadanie</DialogTitle>
          <DialogDescription>
            Zadanie trafi do pierwszej kolumny wybranej tablicy. Odpowiedzialny wynika z etapu tej
            tablicy — nie wybiera się go tutaj.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Tytuł zadania">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>

          <Field label="Opis">
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <div className="grid gap-1.5">
            <p className="text-sm font-medium text-foreground">Tablica</p>
            {loading ? (
              <p className="text-xs text-muted">Wczytywanie tablic projektu…</p>
            ) : targets.length === 0 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Ten projekt nie ma żadnego elementu kanbanowego — nie ma gdzie utworzyć zadania.
              </p>
            ) : (
              <div className="grid max-h-56 gap-1 overflow-y-auto pr-1">
                {targets.map((target) => (
                  <label
                    key={target.projectProcessItemId}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 bg-surface/40 px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10"
                  >
                    <input
                      type="radio"
                      name="task-target"
                      className="mt-1 h-3.5 w-3.5"
                      checked={selectedId === target.projectProcessItemId}
                      onChange={() => setSelectedId(target.projectProcessItemId)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-foreground">{target.itemTitle}</span>
                        {target.isActiveStage ? (
                          <Badge tone="active" className="text-[10px]">
                            etap bieżący
                          </Badge>
                        ) : null}
                        {!target.boardId ? (
                          <span
                            className="text-[10px] text-muted"
                            title="Tablica powstanie przy tworzeniu zadania."
                          >
                            (tablica zostanie utworzona)
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {target.stageTitle ?? "Etap nieustalony"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Odpowiedzialny pokazany, nie wybierany. Trzy różne stany, bo naprawia się je gdzie indziej. */}
          {selected ? (
            <p className="rounded-lg border border-border/60 bg-surface/30 px-3 py-2 text-xs">
              <span className="text-muted">Odpowiedzialny: </span>
              {!selected.boardId ? (
                <span className="text-muted">ustali się po utworzeniu tablicy</span>
              ) : owner?.responsibleName ? (
                <>
                  <span className="font-medium text-foreground">{owner.responsibleName}</span>
                  <span className="text-muted"> ({owner.roleName})</span>
                  {owner.slotSource === "fallback" ? (
                    <span className="text-amber-300"> — zastępczo</span>
                  ) : null}
                </>
              ) : owner?.stageId ? (
                <span className="font-medium text-rose-300">
                  brak obsady — zadanie powstanie bez przypisania
                </span>
              ) : (
                <span className="font-medium text-amber-300">
                  tablica nie należy do żadnego etapu — zadanie powstanie bez przypisania
                </span>
              )}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving || !selected || !title.trim()}
            >
              {saving ? "Tworzenie…" : "Utwórz zadanie"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
