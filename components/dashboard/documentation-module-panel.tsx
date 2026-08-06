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
  switchboardCircuitNeedsReport,
  type SwitchboardCircuitStatus,
} from "@/lib/dashboard/switchboard-types";
import {
  DOCUMENTATION_MODULE_HANDLED_BADGE_CLASS,
  DOCUMENTATION_MODULE_LABELS,
  buildDocumentationModuleProgress,
  buildDocumentationModuleReportDescription,
  documentationModuleItemIsHandled,
  documentationModuleItemLabel,
  groupDocumentationModuleItemsBySection,
  type DocumentationModule,
  type DocumentationModuleItem,
  type DocumentationModuleItemHistoryEntry,
  type DocumentationModuleType,
} from "@/lib/dashboard/documentation-module-types";
import {
  PRZYCISKI_KOLOR_OPTIONS,
  PRZYCISKI_TYP_OPTIONS,
} from "@/lib/import/documentation-module-configs";
import {
  createManualDocumentationModuleItem,
  fetchDocumentationModuleItemHistory,
  fetchDocumentationModulesWithItems,
  linkDocumentationModuleItemEmployeeReport,
  markDocumentationModuleItemHandled,
  setDocumentationModuleCompletion,
  updateDocumentationModuleItemRawField,
  updateDocumentationModuleItemStatus,
  type DocumentationModuleWithItems,
} from "@/lib/supabase/documentation-module-repository";
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

function ItemCard({ item, onClick }: { item: DocumentationModuleItem; onClick: () => void }) {
  const rawEntries = Object.entries(item.rawFields).filter(([, value]) => value);
  const handled = documentationModuleItemIsHandled(item);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/10 p-3 text-left transition hover:border-accent/30",
        handled && "border-blue-500/30 bg-blue-500/5",
        item.isStale && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {item.source === "manual" ? <span>Dodane ręcznie</span> : null}
          {item.isStale ? <span>· zniknęło z ostatniego importu</span> : null}
          {item.note ? (
            <StickyNote className="h-3 w-3 shrink-0 text-amber-300" aria-label="Ma notatkę" />
          ) : null}
          {item.employeeReportId ? (
            <FileCheck className="h-3 w-3 shrink-0 text-emerald-400" aria-label="Zgłoszone do biura" />
          ) : null}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{documentationModuleItemLabel(item)}</p>
        {item.location ? <p className="truncate text-xs text-muted">{item.location}</p> : null}
        {rawEntries.length > 0 ? (
          <p className="mt-1 truncate text-[11px] text-muted">
            {rawEntries.map(([key, value]) => `${key}: ${value}`).join(" · ")}
          </p>
        ) : null}
        {item.note ? <p className="mt-1 truncate text-xs text-muted">{item.note}</p> : null}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium",
          handled ? DOCUMENTATION_MODULE_HANDLED_BADGE_CLASS : SWITCHBOARD_CIRCUIT_STATUS_BADGE_CLASS[item.status],
        )}
      >
        {handled ? "Ogarnięte" : SWITCHBOARD_CIRCUIT_STATUS_LABELS[item.status]}
      </span>
    </button>
  );
}

function ItemStatusDialog({
  item,
  moduleType,
  moduleLabel,
  open,
  onOpenChange,
  authorName,
  authorId,
  onSaved,
}: {
  item: DocumentationModuleItem | null;
  moduleType: DocumentationModuleType;
  moduleLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName: string;
  authorId: string | null;
  onSaved: (updated: DocumentationModuleItem) => void;
}) {
  const [status, setStatus] = useState<SwitchboardCircuitStatus>("nie_ruszone");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<DocumentationModuleItem | null>(null);
  const [history, setHistory] = useState<DocumentationModuleItemHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [handledDialogOpen, setHandledDialogOpen] = useState(false);
  const [handledReason, setHandledReason] = useState("");
  const [handledError, setHandledError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setStatus(item.status);
    setNote(item.note ?? "");
    setError(null);
    setLatest(item);
    setHandledDialogOpen(false);
    setHandledReason("");
    setHandledError(null);
    setHistoryLoading(true);
    fetchDocumentationModuleItemHistory(item.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [open, item]);

  if (!item) return null;

  const current = latest ?? item;
  const suggestsReport = switchboardCircuitNeedsReport(status);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDocumentationModuleItemStatus(item!.id, {
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
          itemId: item!.id,
          previousStatus: item!.status,
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

  async function handleFieldChange(fieldLabel: string, value: string) {
    setSavingField(fieldLabel);
    try {
      const updated = await updateDocumentationModuleItemRawField(item!.id, fieldLabel, value);
      setLatest(updated);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać pola.");
    } finally {
      setSavingField(null);
    }
  }

  async function handleMarkHandled(note: string) {
    const updated = await markDocumentationModuleItemHandled(item!.id, {
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
  const rawEntries = Object.entries(current.rawFields);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{documentationModuleItemLabel(item)}</DialogTitle>
            <DialogDescription>
              {[item.description, item.location].filter(Boolean).join(" · ") || "Brak opisu"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {moduleType === "przyciski" ? (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Typ">
                  <select
                    className="w-full rounded-lg border border-border bg-surface-muted/20 px-2.5 py-2 text-sm text-foreground"
                    value={current.rawFields["Typ"] ?? ""}
                    disabled={savingField === "Typ"}
                    onChange={(event) => void handleFieldChange("Typ", event.target.value)}
                  >
                    <option value="">—</option>
                    {PRZYCISKI_TYP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Kolor">
                  <select
                    className="w-full rounded-lg border border-border bg-surface-muted/20 px-2.5 py-2 text-sm text-foreground"
                    value={current.rawFields["Kolor"] ?? ""}
                    disabled={savingField === "Kolor"}
                    onChange={(event) => void handleFieldChange("Kolor", event.target.value)}
                  >
                    <option value="">—</option>
                    {PRZYCISKI_KOLOR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : rawEntries.length > 0 ? (
              <div className="grid gap-1 rounded-lg border border-border/60 bg-surface-muted/10 p-2.5 text-xs">
                {rawEntries.map(([key, value]) => (
                  <p key={key}>
                    <span className="text-muted">{key}: </span>
                    <span className="text-foreground">{value}</span>
                  </p>
                ))}
              </div>
            ) : null}

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
                    projectId={item.projectId}
                    itemTitle={documentationModuleItemLabel(item)}
                    itemDescription={buildDocumentationModuleReportDescription(moduleLabel, {
                      label: item.label,
                      description: item.description,
                      location: item.location,
                      note,
                    })}
                    onReportCreated={({ target, recordId }) => {
                      void linkDocumentationModuleItemEmployeeReport(item.id, { target, recordId }).then(() => {
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

function AddItemDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { sectionName: string; label: string; location: string; description: string }) => Promise<void>;
}) {
  const [sectionName, setSectionName] = useState("");
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSectionName("");
      setLabel("");
      setLocation("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  async function handleSave() {
    if (!label.trim() && !description.trim()) {
      setError("Podaj przynajmniej etykietę albo opis pozycji.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ sectionName, label, location, description });
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
          <Field label="Etykieta / nr">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} />
          </Field>
          <Field label="Opis">
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
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

function ModuleHeaderBar({
  mod,
  items,
  onComplete,
  onReopen,
  onAddItem,
  completing,
}: {
  mod: DocumentationModule;
  items: DocumentationModuleItem[];
  onComplete: () => void;
  onReopen: () => void;
  onAddItem: () => void;
  completing: boolean;
}) {
  const progress = buildDocumentationModuleProgress(items);
  const isComplete = Boolean(mod.completedAt);
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
          <Button type="button" size="sm" variant="outline" onClick={onAddItem}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Dodaj pozycję
          </Button>

          {isComplete ? (
            <>
              <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Zakończone przez {mod.completedByName} · {mod.completedAt ? formatDateTime(mod.completedAt) : ""}
              </p>
              <Button type="button" size="sm" variant="ghost" disabled={completing} onClick={onReopen}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Cofnij
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" disabled={completing} onClick={onComplete}>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Zakończone
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentationModulePanel({
  projectId,
  moduleType,
  authorName,
  authorId,
  onToggleComplete,
}: {
  projectId: string;
  moduleType: DocumentationModuleType;
  authorName: string;
  authorId: string | null;
  /** Odzwierciedla zakończenie/cofnięcie w elemencie procesu, gdy ten panel jest osadzony w
   *  elemencie typu "arkusz_dokumentacji". Dla modułów z kilkoma podmodułami (RACK: SWITCH +
   *  AUDIOSERVER) wywoływane z `true` dopiero, gdy WSZYSTKIE są zakończone. */
  onToggleComplete?: (completed: boolean) => void;
}) {
  const [modules, setModules] = useState<DocumentationModuleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedItem, setSelectedItem] = useState<DocumentationModuleItem | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const moduleLabel = DOCUMENTATION_MODULE_LABELS[moduleType];

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchDocumentationModulesWithItems(projectId, moduleType);
      setModules(data);
      setActiveModuleId((current) => current ?? data[0]?.module.id ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Nie udało się wczytać danych.");
    } finally {
      setLoading(false);
    }
  }, [projectId, moduleType]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeEntry = useMemo(
    () => modules.find((m) => m.module.id === activeModuleId) ?? null,
    [modules, activeModuleId],
  );

  const filteredItems = useMemo(() => {
    const items = activeEntry?.items ?? [];
    if (filter === "all") return items;
    if (filter === "notatki") return items.filter((i) => i.note && i.note.trim().length > 0);
    return items.filter((i) => i.status === filter);
  }, [activeEntry, filter]);

  const filterCounts = useMemo(() => {
    const items = activeEntry?.items ?? [];
    const counts: Partial<Record<FilterKey, number>> = {
      all: items.length,
      notatki: items.filter((i) => i.note && i.note.trim().length > 0).length,
    };
    for (const status of SWITCHBOARD_CIRCUIT_STATUSES) {
      counts[status] = items.filter((i) => i.status === status).length;
    }
    return counts;
  }, [activeEntry]);

  const sections = useMemo(
    () => groupDocumentationModuleItemsBySection(activeEntry?.items ?? []),
    [activeEntry],
  );

  // Sekcje startują zwinięte — inicjalizujemy raz na moduł, nie przy każdym odświeżeniu danych.
  const initializedModulesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const moduleId = activeEntry?.module.id;
    if (!moduleId || initializedModulesRef.current.has(moduleId)) return;
    initializedModulesRef.current.add(moduleId);

    const keys = sections
      .filter((section) => section.sectionName)
      .map((section) => `section::${section.sectionName ?? ""}`);
    setCollapsedSections((current) => new Set([...current, ...keys]));
  }, [activeEntry?.module.id, sections]);

  function toggleSection(key: string) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleItemSaved(updated: DocumentationModuleItem) {
    setModules((current) =>
      current.map((entry) =>
        entry.module.id !== updated.moduleId
          ? entry
          : { ...entry, items: entry.items.map((i) => (i.id === updated.id ? updated : i)) },
      ),
    );
    setSelectedItem(updated);
  }

  async function handleAddItem(input: { sectionName: string; label: string; location: string; description: string }) {
    if (!activeEntry) return;
    const created = await createManualDocumentationModuleItem(activeEntry.module.id, projectId, {
      sectionName: input.sectionName,
      label: input.label,
      location: input.location,
      description: input.description,
      createdByName: authorName,
    });
    setModules((current) =>
      current.map((entry) =>
        entry.module.id !== created.moduleId ? entry : { ...entry, items: [...entry.items, created] },
      ),
    );
  }

  async function handleComplete() {
    if (!activeEntry) return;
    const progress = buildDocumentationModuleProgress(activeEntry.items);
    if (
      !window.confirm(
        progress.total > 0 && progress.doneCount < progress.total
          ? `${progress.total - progress.doneCount} pozycji nie jest jeszcze gotowych ` +
              `(podłączone i sprawdzone albo ogarnięte). Na pewno oznaczyć moduł jako zakończony?`
          : "Na pewno oznaczyć moduł jako zakończony?",
      )
    ) {
      return;
    }
    setCompleting(true);
    setCompleteError(null);
    try {
      const updated = await setDocumentationModuleCompletion(projectId, activeEntry.module.id);
      let allComplete = false;
      setModules((current) => {
        const next = current.map((entry) =>
          entry.module.id === updated.id ? { ...entry, module: updated } : entry,
        );
        allComplete = next.every((entry) => Boolean(entry.module.completedAt));
        return next;
      });
      if (allComplete) onToggleComplete?.(true);
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "Nie udało się zapisać zakończenia.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleReopen() {
    if (!activeEntry) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const updated = await setDocumentationModuleCompletion(projectId, activeEntry.module.id, { reopen: true });
      setModules((current) =>
        current.map((entry) => (entry.module.id === updated.id ? { ...entry, module: updated } : entry)),
      );
      onToggleComplete?.(false);
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "Nie udało się cofnąć zakończenia.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="grid min-w-0 max-w-full gap-3">
      {modules.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {modules.map((entry) => (
            <button
              key={entry.module.id}
              type="button"
              onClick={() => setActiveModuleId(entry.module.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                activeModuleId === entry.module.id
                  ? "border-accent/50 bg-accent/10 text-foreground"
                  : "border-border/70 text-muted hover:text-foreground",
              )}
            >
              {entry.module.name}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-muted">Ładowanie…</p> : null}
      {loadError ? <p className="text-sm text-rose-400">{loadError}</p> : null}

      {!loading && modules.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-surface-muted/10 p-4 text-sm text-muted">
          Brak zaimportowanych danych „{moduleLabel}”. Wgraj plik dokumentacji technicznej projektu w
          zakładce Dokumentacja, żeby zacząć oznaczać statusy zamiast w Excelu.
        </p>
      ) : null}

      {activeEntry ? (
        <>
          <ModuleHeaderBar
            mod={activeEntry.module}
            items={activeEntry.items}
            onComplete={() => void handleComplete()}
            onReopen={() => void handleReopen()}
            onAddItem={() => setAddOpen(true)}
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
            filteredItems.length === 0 ? (
              <p className="text-sm text-muted">Brak pozycji dla tego filtra.</p>
            ) : (
              <div className="grid gap-2">
                {filteredItems.map((item) => (
                  <ItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                ))}
              </div>
            )
          ) : (
            <div className="grid gap-3">
              {sections.map((section) => {
                const sectionKey = `section::${section.sectionName ?? ""}`;
                const sectionCollapsed = collapsedSections.has(sectionKey);
                const doneCount = section.items.filter(
                  (i) => i.status === "podlaczone_i_sprawdzone" || documentationModuleItemIsHandled(i),
                ).length;

                return (
                  <div key={sectionKey} className="grid gap-2">
                    {section.sectionName ? (
                      <button
                        type="button"
                        onClick={() => toggleSection(sectionKey)}
                        className="flex items-center gap-1.5 text-left text-sm font-semibold text-foreground"
                      >
                        {sectionCollapsed ? (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                        {section.sectionName}
                        <span className="font-normal text-muted">
                          — {doneCount}/{section.items.length} gotowe
                        </span>
                      </button>
                    ) : null}

                    {!sectionCollapsed ? (
                      <div className="grid gap-2 pl-1">
                        {section.items.map((item) => (
                          <ItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      <ItemStatusDialog
        item={selectedItem}
        moduleType={moduleType}
        moduleLabel={moduleLabel}
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        authorName={authorName}
        authorId={authorId}
        onSaved={handleItemSaved}
      />

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} onSave={handleAddItem} />
    </div>
  );
}
