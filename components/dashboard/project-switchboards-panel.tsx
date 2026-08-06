"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck,
  MessageSquare,
  Plus,
  RotateCcw,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  StackedDialogContent,
} from "@/components/ui/dialog";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { ItemEscalationActions } from "@/components/process/item-escalation-actions";
import {
  SWITCHBOARD_CIRCUIT_STATUSES,
  SWITCHBOARD_CIRCUIT_STATUS_BADGE_CLASS,
  SWITCHBOARD_CIRCUIT_STATUS_DOT_CLASS,
  SWITCHBOARD_CIRCUIT_STATUS_LABELS,
  SWITCHBOARD_HANDLED_BADGE_CLASS,
  buildSwitchboardCircuitReportDescription,
  buildSwitchboardProgress,
  groupSwitchboardCircuitsBySection,
  switchboardCircuitIsHandled,
  switchboardCircuitLabel,
  switchboardCircuitNeedsReport,
  switchboardGroupDoneSummary,
  type Switchboard,
  type SwitchboardCircuit,
  type SwitchboardCircuitHistoryEntry,
  type SwitchboardCircuitStatus,
} from "@/lib/dashboard/switchboard-types";
import {
  createManualSwitchboardCircuit,
  fetchSwitchboardCircuitHistory,
  fetchSwitchboardsWithCircuits,
  linkSwitchboardCircuitEmployeeReport,
  markSwitchboardCircuitHandled,
  setSwitchboardCompletion,
  updateSwitchboardCircuitStatus,
  type SwitchboardWithCircuits,
} from "@/lib/supabase/switchboard-repository";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "notatki" | SwitchboardCircuitStatus;

const FILTER_ORDER: FilterKey[] = [
  "all",
  "problem",
  "wymaga_uwagi",
  "notatki",
  ...SWITCHBOARD_CIRCUIT_STATUSES.filter((status) => status !== "problem" && status !== "wymaga_uwagi"),
];

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Wszystkie",
  notatki: "Z notatką",
  ...SWITCHBOARD_CIRCUIT_STATUS_LABELS,
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CircuitCard({ circuit, onClick }: { circuit: SwitchboardCircuit; onClick: () => void }) {
  const handled = switchboardCircuitIsHandled(circuit);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/10 p-3 text-left transition hover:border-accent/30",
        handled && "border-blue-500/30 bg-blue-500/5",
        circuit.isStale && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>{switchboardCircuitLabel(circuit)}</span>
          {circuit.isStale ? <span>· zniknęło z ostatniego importu</span> : null}
          {circuit.note ? (
            <StickyNote className="h-3 w-3 shrink-0 text-amber-300" aria-label="Ma notatkę" />
          ) : null}
          {circuit.employeeReportId ? (
            <FileCheck className="h-3 w-3 shrink-0 text-emerald-400" aria-label="Zgłoszone do biura" />
          ) : null}
        </p>
        <p className="truncate text-sm font-medium text-foreground">
          {circuit.circuitDescription || circuit.circuitNo || circuit.location || "Bez opisu"}
        </p>
        {circuit.location && (circuit.circuitDescription || circuit.circuitNo) ? (
          <p className="truncate text-xs text-muted">{circuit.location}</p>
        ) : null}
        {circuit.note ? <p className="mt-1 truncate text-xs text-muted">{circuit.note}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            "rounded-full border px-2 py-1 text-[11px] font-medium",
            SWITCHBOARD_CIRCUIT_STATUS_BADGE_CLASS[circuit.status],
          )}
        >
          {SWITCHBOARD_CIRCUIT_STATUS_LABELS[circuit.status]}
        </span>
        {handled ? (
          <span className={cn("rounded-full border px-2 py-1 text-[11px] font-medium", SWITCHBOARD_HANDLED_BADGE_CLASS)}>
            Ogarnięte
          </span>
        ) : null}
      </div>
    </button>
  );
}

function CircuitStatusDialog({
  circuit,
  switchboardName,
  open,
  onOpenChange,
  authorName,
  authorId,
  onSaved,
}: {
  circuit: SwitchboardCircuit | null;
  switchboardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName: string;
  authorId: string | null;
  onSaved: (updated: SwitchboardCircuit) => void;
}) {
  const [status, setStatus] = useState<SwitchboardCircuitStatus>("nie_ruszone");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<SwitchboardCircuit | null>(null);
  const [history, setHistory] = useState<SwitchboardCircuitHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [handledDialogOpen, setHandledDialogOpen] = useState(false);
  const [handledReason, setHandledReason] = useState("");
  const [handledError, setHandledError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !circuit) return;
    setStatus(circuit.status);
    setNote(circuit.note ?? "");
    setError(null);
    setLatest(circuit);
    setHandledDialogOpen(false);
    setHandledReason("");
    setHandledError(null);
    setHistoryLoading(true);
    fetchSwitchboardCircuitHistory(circuit.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [open, circuit]);

  if (!circuit) return null;

  const suggestsReport = switchboardCircuitNeedsReport(status);
  const current = latest ?? circuit;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSwitchboardCircuitStatus(circuit!.id, {
        status,
        note,
        updatedById: authorId,
        updatedByName: authorName,
      });
      setLatest(updated);
      onSaved(updated);
      setHistory((current) => [
        {
          id: `local-${Date.now()}`,
          circuitId: circuit!.id,
          previousStatus: circuit!.status,
          newStatus: updated.status,
          note: updated.note,
          changedById: authorId,
          changedByName: authorName,
          changedAt: new Date().toISOString(),
        },
        ...current,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać statusu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkHandled(note: string) {
    const updated = await markSwitchboardCircuitHandled(circuit!.id, {
      note,
      actorId: authorId,
      actorName: authorName,
    });
    setLatest(updated);
    onSaved(updated);
  }

  async function handleConfirmMarkHandled() {
    if (!handledReason.trim()) {
      setHandledError("Podaj krótki komentarz.");
      return;
    }
    try {
      await handleMarkHandled(handledReason.trim());
      setHandledDialogOpen(false);
      setHandledReason("");
      setHandledError(null);
    } catch (err) {
      setHandledError(err instanceof Error ? err.message : "Nie udało się zapisać.");
    }
  }

  const alreadyHandled = Boolean(current.handledAt);
  // Przy Problemie nie ma skrotu do "Ogarniete" — trzeba realnie eskalowac (Zglos do
  // biura/zapotrzebowanie), tak samo jak na checklistach.
  const canMarkHandledManually = status !== "problem";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{switchboardCircuitLabel(circuit)}</DialogTitle>
            <DialogDescription>
              {[circuit.circuitDescription, circuit.location].filter(Boolean).join(" · ") || "Brak opisu"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              {SWITCHBOARD_CIRCUIT_STATUSES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
                    status === value
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-surface-muted/20 text-muted hover:border-accent/30",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", SWITCHBOARD_CIRCUIT_STATUS_DOT_CLASS[value])} />
                    {SWITCHBOARD_CIRCUIT_STATUS_LABELS[value]}
                  </span>
                  {status === value ? <Check className="h-4 w-4 text-accent" /> : null}
                </button>
              ))}
            </div>

            <Field label="Notatka (opcjonalnie)">
              <Textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Cokolwiek warto zapisać przy tej pozycji…"
              />
            </Field>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Zapisywanie…" : "Zapisz status"}
              </Button>
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Zamknij
              </Button>
            </div>

            <div className="rounded-xl border border-dashed border-border/80 bg-surface-muted/15 p-3">
              {alreadyHandled ? (
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Ogarnięte
                  {current.handledByName ? ` przez ${current.handledByName}` : ""}
                  {current.handledAt ? `, ${formatDateTime(current.handledAt)}` : ""}
                  {current.handledNote ? ` — ${current.handledNote}` : ""}
                </p>
              ) : (
                <>
                  {suggestsReport ? (
                    <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      {status === "problem"
                        ? "Ta pozycja ma zgłoszony problem — zgłoś ją, żeby ktoś to zobaczył."
                        : "Ta pozycja wymaga uwagi biura — zgłoś ją, żeby ktoś to zobaczył."}
                    </p>
                  ) : null}
                  {canMarkHandledManually ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mb-2 w-full sm:w-auto"
                      onClick={() => {
                        setHandledError(null);
                        setHandledReason("");
                        setHandledDialogOpen(true);
                      }}
                    >
                      <CheckCheck className="mr-2 h-3.5 w-3.5" />
                      Ogarnięte
                    </Button>
                  ) : null}
                  <ItemEscalationActions
                    projectId={circuit.projectId}
                    itemTitle={switchboardCircuitLabel(circuit)}
                    itemDescription={buildSwitchboardCircuitReportDescription(switchboardName, {
                      zugNo: circuit.zugNo,
                      zugSubNo: circuit.zugSubNo,
                      circuitDescription: circuit.circuitDescription,
                      location: circuit.location,
                      note,
                    })}
                    onReportCreated={({ target, recordId }) => {
                      void linkSwitchboardCircuitEmployeeReport(circuit.id, { target, recordId }).then(() => {
                        setLatest((prev) =>
                          prev ? { ...prev, employeeReportTarget: target, employeeReportId: recordId } : prev,
                        );
                      });
                    }}
                    onHandled={(handledNote) => void handleMarkHandled(handledNote)}
                  />
                </>
              )}
            </div>

            <div className="grid gap-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Clock className="h-3.5 w-3.5" />
                Historia zmian
              </p>
              {historyLoading ? (
                <p className="text-xs text-muted">Ładowanie…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-muted">Brak zapisanych zmian.</p>
              ) : (
                <div className="grid max-h-40 gap-1 overflow-y-auto">
                  {history.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/60 bg-surface-muted/10 px-2.5 py-1.5 text-xs">
                      <span className="text-foreground">{SWITCHBOARD_CIRCUIT_STATUS_LABELS[entry.newStatus]}</span>
                      <span className="text-muted"> — {entry.changedByName || "import"} · {formatDateTime(entry.changedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={handledDialogOpen} onOpenChange={setHandledDialogOpen}>
        <StackedDialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Oznacz jako ogarnięte</DialogTitle>
            <DialogDescription>
              Status pozycji zostaje bez zmian — to informacja, że sprawa jest obsłużona i nie musi
              dalej straszyć na liście.
            </DialogDescription>
          </DialogHeader>
          <Field label="Komentarz">
            <Textarea
              value={handledReason}
              onChange={(event) => {
                setHandledReason(event.target.value);
                if (handledError) setHandledError(null);
              }}
              rows={2}
              placeholder="Np. Sprawdzone na miejscu, nie wymaga dalszych działań."
            />
          </Field>
          {handledError ? <p className="text-xs text-rose-400">{handledError}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setHandledDialogOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!handledReason.trim()}
              onClick={() => void handleConfirmMarkHandled()}
            >
              Potwierdź
            </Button>
          </div>
        </StackedDialogContent>
      </Dialog>
    </>
  );
}

function AddCircuitDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { sectionName: string; zugNo: string; circuitDescription: string; location: string }) => Promise<void>;
}) {
  const [sectionName, setSectionName] = useState("");
  const [zugNo, setZugNo] = useState("");
  const [circuitDescription, setCircuitDescription] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSectionName("");
      setZugNo("");
      setCircuitDescription("");
      setLocation("");
      setError(null);
    }
  }, [open]);

  async function handleSave() {
    if (!circuitDescription.trim() && !zugNo.trim()) {
      setError("Podaj przynajmniej opis albo numer zuga.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ sectionName, zugNo, circuitDescription, location });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać pozycji.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj pozycję ręcznie</DialogTitle>
          <DialogDescription>
            Coś dograne na budowie, czego nie było w oryginalnym pliku. Pozycja zostanie zachowana na
            przyszły eksport do Excela.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Sekcja (opcjonalnie)">
            <Input value={sectionName} onChange={(event) => setSectionName(event.target.value)} />
          </Field>
          <Field label="Zug (opcjonalnie)">
            <Input value={zugNo} onChange={(event) => setZugNo(event.target.value)} />
          </Field>
          <Field label="Opis">
            <Input value={circuitDescription} onChange={(event) => setCircuitDescription(event.target.value)} />
          </Field>
          <Field label="Lokalizacja (pomieszczenie)">
            <Input value={location} onChange={(event) => setLocation(event.target.value)} />
          </Field>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Zapisywanie…" : "Dodaj pozycję"}
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SwitchboardHeaderBar({
  switchboard,
  circuits,
  onComplete,
  onReopen,
  onAddCircuit,
  completing,
}: {
  switchboard: Switchboard;
  circuits: SwitchboardCircuit[];
  onComplete: () => void;
  onReopen: () => void;
  onAddCircuit: () => void;
  completing: boolean;
}) {
  const progress = buildSwitchboardProgress(circuits);
  const isComplete = Boolean(switchboard.completedAt);
  // Legenda zajmuje 2-3 wiersze zawiniętych chipów — na mobile domyślnie zwinięta, żeby lista
  // pozycji dostała jak najwięcej ekranu. Na desktopie zawsze widoczna.
  const [legendOpen, setLegendOpen] = useState(false);

  // Świadomie NIE sticky: przypięty nagłówek sprawiał, że na mobile wyglądało to jak "przewija
  // się tylko lista pod spodem", zamiast naturalnego przewijania całej zawartości jednym gestem.
  return (
    <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
      <button
        type="button"
        onClick={() => setLegendOpen((value) => !value)}
        className="flex items-center justify-between text-left text-[11px] text-muted md:hidden"
      >
        Legenda statusów
        <span className="text-accent">{legendOpen ? "Ukryj" : "Pokaż"}</span>
      </button>
      <div className={cn("flex-wrap items-center gap-2", legendOpen ? "flex" : "hidden", "md:flex")}>
        {SWITCHBOARD_CIRCUIT_STATUSES.map((status) => (
          <span key={status} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className={cn("h-2.5 w-2.5 rounded-full", SWITCHBOARD_CIRCUIT_STATUS_DOT_CLASS[status])} />
            {SWITCHBOARD_CIRCUIT_STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {progress.total > 0 ? (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted/40">
          {SWITCHBOARD_CIRCUIT_STATUSES.map((status) => {
            const count = progress.counts[status];
            if (!count) return null;
            return (
              <span
                key={status}
                className={SWITCHBOARD_CIRCUIT_STATUS_DOT_CLASS[status]}
                style={{ width: `${(count / progress.total) * 100}%` }}
                title={`${SWITCHBOARD_CIRCUIT_STATUS_LABELS[status]}: ${count}`}
              />
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {progress.doneCount}/{progress.total} gotowe (podłączone i sprawdzone lub ogarnięte) (
          {progress.total > 0 ? Math.round(progress.doneRatio * 100) : 0}%)
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onAddCircuit}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Dodaj pozycję
          </Button>

          {isComplete ? (
            <>
              <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Zakończone przez {switchboard.completedByName} · {switchboard.completedAt ? formatDateTime(switchboard.completedAt) : ""}
              </p>
              <Button type="button" size="sm" variant="ghost" disabled={completing} onClick={onReopen}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Cofnij
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" disabled={completing} onClick={onComplete}>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Wpinanie rozdzielni zakończone
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectSwitchboardsPanel({
  projectId,
  authorName,
  authorId,
  onToggleComplete,
}: {
  projectId: string;
  authorName: string;
  authorId: string | null;
  /** Odzwierciedla zakończenie/cofnięcie w elemencie procesu, gdy ten panel jest osadzony w
   *  elemencie typu "arkusz_dokumentacji" (sheetType: "rw_zugi"). */
  onToggleComplete?: (completed: boolean) => void;
}) {
  const [boards, setBoards] = useState<SwitchboardWithCircuits[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSwitchboardId, setActiveSwitchboardId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedCircuit, setSelectedCircuit] = useState<SwitchboardCircuit | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchSwitchboardsWithCircuits(projectId);
      setBoards(data);
      setActiveSwitchboardId((current) => current ?? data[0]?.switchboard.id ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Nie udało się wczytać rozdzielnic.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeBoard = useMemo(
    () => boards.find((b) => b.switchboard.id === activeSwitchboardId) ?? null,
    [boards, activeSwitchboardId],
  );

  const filteredCircuits = useMemo(() => {
    const circuits = activeBoard?.circuits ?? [];
    if (filter === "all") return circuits;
    if (filter === "notatki") return circuits.filter((c) => c.note && c.note.trim().length > 0);
    return circuits.filter((c) => c.status === filter);
  }, [activeBoard, filter]);

  const filterCounts = useMemo(() => {
    const circuits = activeBoard?.circuits ?? [];
    const counts: Partial<Record<FilterKey, number>> = {
      all: circuits.length,
      notatki: circuits.filter((c) => c.note && c.note.trim().length > 0).length,
    };
    for (const status of SWITCHBOARD_CIRCUIT_STATUSES) {
      counts[status] = circuits.filter((c) => c.status === status).length;
    }
    return counts;
  }, [activeBoard]);

  const sections = useMemo(
    () => groupSwitchboardCircuitsBySection(activeBoard?.circuits ?? []),
    [activeBoard],
  );

  // Grupy Zug startują zwinięte (sekcje nie) — inicjalizujemy raz na rozdzielnicę, nie przy
  // każdym odświeżeniu danych (np. po zapisaniu statusu), żeby nie kasować ręcznego rozwinięcia.
  const initializedBoardsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const boardId = activeBoard?.switchboard.id;
    if (!boardId || initializedBoardsRef.current.has(boardId)) return;
    initializedBoardsRef.current.add(boardId);

    const zugKeys = new Set<string>();
    for (const section of sections) {
      const sectionKey = `section::${section.sectionName ?? ""}`;
      for (const entry of section.entries) {
        if (entry.kind === "zug") zugKeys.add(`zug::${sectionKey}::${entry.zugNo}`);
      }
    }
    setCollapsedGroups((current) => new Set([...current, ...zugKeys]));
  }, [activeBoard?.switchboard.id, sections]);

  function toggleGroup(key: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleCircuitSaved(updated: SwitchboardCircuit) {
    setBoards((current) =>
      current.map((board) =>
        board.switchboard.id !== updated.switchboardId
          ? board
          : { ...board, circuits: board.circuits.map((c) => (c.id === updated.id ? updated : c)) },
      ),
    );
    setSelectedCircuit(updated);
  }

  async function handleComplete() {
    if (!activeBoard) return;
    const progress = buildSwitchboardProgress(activeBoard.circuits);
    const confirmMessage =
      progress.total > 0 && progress.doneCount < progress.total
        ? `${progress.total - progress.doneCount} pozycji nie jest jeszcze gotowych ` +
          `(podłączone i sprawdzone albo ogarnięte). Na pewno oznaczyć wpinanie jako zakończone?`
        : "Na pewno oznaczyć wpinanie rozdzielni jako zakończone?";
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setCompleting(true);
    setCompleteError(null);
    try {
      const updated = await setSwitchboardCompletion(projectId, activeBoard.switchboard.id);
      setBoards((current) =>
        current.map((board) =>
          board.switchboard.id === updated.id ? { ...board, switchboard: updated } : board,
        ),
      );
      onToggleComplete?.(true);
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "Nie udało się zapisać zakończenia.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleReopen() {
    if (!activeBoard) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const updated = await setSwitchboardCompletion(projectId, activeBoard.switchboard.id, { reopen: true });
      setBoards((current) =>
        current.map((board) =>
          board.switchboard.id === updated.id ? { ...board, switchboard: updated } : board,
        ),
      );
      onToggleComplete?.(false);
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "Nie udało się cofnąć zakończenia.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleAddCircuit(input: {
    sectionName: string;
    zugNo: string;
    circuitDescription: string;
    location: string;
  }) {
    if (!activeBoard) return;
    const created = await createManualSwitchboardCircuit(activeBoard.switchboard.id, projectId, {
      sectionName: input.sectionName,
      zugNo: input.zugNo,
      circuitDescription: input.circuitDescription,
      location: input.location,
      createdByName: authorName,
    });
    setBoards((current) =>
      current.map((board) =>
        board.switchboard.id !== created.switchboardId
          ? board
          : { ...board, circuits: [...board.circuits, created] },
      ),
    );
  }

  return (
    <div className="grid min-w-0 max-w-full gap-3">
      {boards.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {boards.map((board) => (
            <button
              key={board.switchboard.id}
              type="button"
              onClick={() => setActiveSwitchboardId(board.switchboard.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                activeSwitchboardId === board.switchboard.id
                  ? "border-accent/50 bg-accent/10 text-foreground"
                  : "border-border/70 text-muted hover:text-foreground",
              )}
            >
              {board.switchboard.name}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-muted">Ładowanie…</p> : null}
      {loadError ? <p className="text-sm text-rose-400">{loadError}</p> : null}

      {!loading && boards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-surface-muted/10 p-4 text-sm text-muted">
          Brak zaimportowanych rozdzielnic. Wgraj plik dokumentacji technicznej projektu w zakładce
          Dokumentacja, żeby zacząć oznaczać statusy podłączenia na miejscu, zamiast w Excelu.
        </p>
      ) : null}

      {activeBoard ? (
        <>
          <SwitchboardHeaderBar
            switchboard={activeBoard.switchboard}
            circuits={activeBoard.circuits}
            onComplete={() => void handleComplete()}
            onReopen={() => void handleReopen()}
            onAddCircuit={() => setAddOpen(true)}
            completing={completing}
          />
          {completeError ? <p className="text-sm text-rose-400">{completeError}</p> : null}

          <MobileFiltersPanel activeCount={filter !== "all" ? 1 : 0} onClear={() => setFilter("all")} title="Status">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_ORDER.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    filter === key
                      ? "border-accent/50 bg-accent/10 text-foreground"
                      : "border-border/70 text-muted hover:text-foreground",
                  )}
                >
                  {key === "notatki" ? <MessageSquare className="h-3 w-3" /> : null}
                  {FILTER_LABELS[key]} ({filterCounts[key] ?? 0})
                </button>
              ))}
            </div>
          </MobileFiltersPanel>

          {filter !== "all" ? (
            filteredCircuits.length === 0 ? (
              <p className="text-sm text-muted">Brak pozycji dla tego filtra.</p>
            ) : (
              <div className="grid gap-2">
                {filteredCircuits.map((circuit) => (
                  <CircuitCard key={circuit.id} circuit={circuit} onClick={() => setSelectedCircuit(circuit)} />
                ))}
              </div>
            )
          ) : (
            <div className="grid gap-3">
              {sections.map((section) => {
                const sectionKey = `section::${section.sectionName ?? ""}`;
                const sectionCollapsed = collapsedGroups.has(sectionKey);
                const sectionCircuits = section.entries.flatMap((entry) =>
                  entry.kind === "zug" ? entry.circuits : [entry.circuit],
                );
                const sectionSummary = switchboardGroupDoneSummary(sectionCircuits);

                return (
                  <div key={sectionKey} className="grid gap-2">
                    {section.sectionName ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(sectionKey)}
                        className="flex items-center gap-1.5 text-left text-sm font-semibold text-foreground"
                      >
                        {sectionCollapsed ? (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                        {section.sectionName}
                        <span className="font-normal text-muted">
                          — {sectionSummary.done}/{sectionSummary.total} gotowe
                        </span>
                      </button>
                    ) : null}

                    {!sectionCollapsed ? (
                      <div className="grid gap-2 pl-1">
                        {section.entries.map((entry, entryIndex) => {
                          if (entry.kind === "loose") {
                            return (
                              <CircuitCard
                                key={entry.circuit.id}
                                circuit={entry.circuit}
                                onClick={() => setSelectedCircuit(entry.circuit)}
                              />
                            );
                          }

                          const zugKey = `zug::${sectionKey}::${entry.zugNo}`;
                          const zugCollapsed = collapsedGroups.has(zugKey);
                          const zugSummary = switchboardGroupDoneSummary(entry.circuits);

                          return (
                            <div key={`${zugKey}-${entryIndex}`} className="rounded-xl border border-border/60 bg-surface-muted/5 p-2">
                              <button
                                type="button"
                                onClick={() => toggleGroup(zugKey)}
                                className="flex w-full items-center gap-1.5 px-1 py-1 text-left text-sm font-medium text-foreground"
                              >
                                {zugCollapsed ? (
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {entry.zugNo}
                                <span className="font-normal text-muted">
                                  — {zugSummary.done}/{zugSummary.total} gotowe
                                </span>
                              </button>
                              {!zugCollapsed ? (
                                <div className="mt-2 grid gap-2">
                                  {entry.circuits.map((circuit) => (
                                    <CircuitCard
                                      key={circuit.id}
                                      circuit={circuit}
                                      onClick={() => setSelectedCircuit(circuit)}
                                    />
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      <CircuitStatusDialog
        circuit={selectedCircuit}
        switchboardName={activeBoard?.switchboard.name ?? ""}
        open={Boolean(selectedCircuit)}
        onOpenChange={(open) => {
          if (!open) setSelectedCircuit(null);
        }}
        authorName={authorName}
        authorId={authorId}
        onSaved={handleCircuitSaved}
      />

      <AddCircuitDialog open={addOpen} onOpenChange={setAddOpen} onSave={handleAddCircuit} />
    </div>
  );
}
