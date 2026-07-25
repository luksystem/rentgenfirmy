"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import {
  createProjectRevenueForecast,
  deleteProjectRevenueForecast,
  updateProjectRevenueForecast,
} from "@/lib/supabase/project-revenue-forecast-repository";
import {
  createProjectSettlementEntry,
  fetchProjectSettlementEntries,
} from "@/lib/supabase/project-settlement-repository";
import { addDaysIso, DEFAULT_AGREEMENT_VAT_RATE, type ProjectSettlementEntry } from "@/lib/settlements/types";
import {
  BUDGET_CONFIDENCE_LABELS,
  BUDGET_CONFIDENCE_LEVELS,
  currentMonthKey,
  type BudgetConfidenceLevel,
  type ProjectRevenueForecast,
} from "@/lib/budget-forecast/types";
import { formatMoney } from "@/lib/utils";
import type { Project } from "@/lib/types";

type Mode = "manual" | "import";

type ManualDraft = {
  projectId: string;
  date: string;
  amount: string;
  confidence: BudgetConfidenceLevel;
  notes: string;
};

/**
 * Współdzielony dialog pipeline: tworzenie (ręcznie albo pobranie z harmonogramu) i edycja
 * istniejącej pozycji. Używany w liście Pipeline, na Prognozie (szybkie dodawanie) i w Timesheet.
 */
export function BudgetPipelineEntryDialog({
  open,
  onOpenChange,
  projects,
  entry,
  defaultProjectId,
  defaultDate,
  actorName,
  onSaved,
  onDeleted,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  /** null = tworzenie nowej pozycji, obiekt = edycja istniejącej (tylko tryb ręczny). */
  entry: ProjectRevenueForecast | null;
  defaultProjectId?: string;
  defaultDate?: string;
  /** Wymagane, gdy checkbox "dodaj do harmonogramu" jest dostępny — zapisywane jako autor raty. */
  actorName: string;
  onSaved: (entry: ProjectRevenueForecast) => void;
  onDeleted?: (id: string) => void;
  /** Wywoływane po imporcie z harmonogramu lub dodaniu bezpośrednio jako rata harmonogramu
   * (mogło powstać kilka pozycji naraz albo powstał wiersz innego typu niż ProjectRevenueForecast). */
  onImported?: () => void;
}) {
  const isEdit = Boolean(entry);
  const [mode, setMode] = useState<Mode>("manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addToSchedule, setAddToSchedule] = useState(false);

  const [manual, setManual] = useState<ManualDraft>({
    projectId: "",
    date: currentMonthKey(),
    amount: "",
    confidence: "medium",
    notes: "",
  });

  const [importProjectId, setImportProjectId] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [scheduleEntries, setScheduleEntries] = useState<ProjectSettlementEntry[]>([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<string>>(new Set());
  const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({});
  const [additionalTotal, setAdditionalTotal] = useState(0);
  const [additionalCount, setAdditionalCount] = useState(0);
  const [includeAdditional, setIncludeAdditional] = useState(false);
  const [additionalDate, setAdditionalDate] = useState(currentMonthKey());

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMode("manual");
    setAddToSchedule(false);
    if (entry) {
      setManual({
        projectId: entry.projectId,
        date: entry.expectedDate.slice(0, 10),
        amount: String(entry.amountNet),
        confidence: entry.confidence,
        notes: entry.notes,
      });
    } else {
      setManual({
        projectId: defaultProjectId ?? projects[0]?.id ?? "",
        date: defaultDate ?? currentMonthKey(),
        amount: "",
        confidence: "medium",
        notes: "",
      });
      setImportProjectId(defaultProjectId ?? projects[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry]);

  useEffect(() => {
    if (!open || isEdit || mode !== "import" || !importProjectId) return;
    setImportLoading(true);
    setError(null);
    void fetchProjectSettlementEntries(importProjectId)
      .then((allEntries) => {
        const schedule = allEntries.filter((e) => e.kind === "schedule");
        const additional = allEntries.filter(
          (e) => e.kind === "charge" && (e.source === "offer" || e.source === "change_request"),
        );
        setScheduleEntries(schedule);
        setSelectedScheduleIds(new Set(schedule.map((e) => e.id)));
        setScheduleDates(
          Object.fromEntries(schedule.map((e) => [e.id, (e.entryDate ?? currentMonthKey()).slice(0, 10)])),
        );
        setAdditionalTotal(additional.reduce((sum, e) => sum + e.amountNet, 0));
        setAdditionalCount(additional.length);
        setIncludeAdditional(false);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Nie udało się wczytać rozliczeń."))
      .finally(() => setImportLoading(false));
  }, [open, isEdit, mode, importProjectId]);

  function toggleSchedule(id: string) {
    setSelectedScheduleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveManual() {
    if (!manual.projectId) return;
    setSaving(true);
    setError(null);
    try {
      if (!entry && addToSchedule) {
        const amountNet = Number(manual.amount) || 0;
        await createProjectSettlementEntry(
          manual.projectId,
          {
            kind: "schedule",
            source: "manual",
            title: manual.notes.trim() || "Rata harmonogramu (dodana ręcznie)",
            amountNet,
            vatRate: DEFAULT_AGREEMENT_VAT_RATE,
            entryDate: manual.date,
            dueDate: addDaysIso(manual.date, 14),
          },
          actorName,
        );
        onImported?.();
        onOpenChange(false);
        return;
      }

      const saved = entry
        ? await updateProjectRevenueForecast(entry.id, {
            expectedDate: manual.date,
            amountNet: Number(manual.amount) || 0,
            confidence: manual.confidence,
            notes: manual.notes.trim(),
          })
        : await createProjectRevenueForecast({
            projectId: manual.projectId,
            expectedDate: manual.date,
            amountNet: Number(manual.amount) || 0,
            confidence: manual.confidence,
            notes: manual.notes.trim(),
          });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać pozycji.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProjectRevenueForecast(entry.id);
      onDeleted?.(entry.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć pozycji.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    setSaving(true);
    setError(null);
    try {
      const toCreate = scheduleEntries.filter((e) => selectedScheduleIds.has(e.id));
      for (const scheduleEntry of toCreate) {
        await createProjectRevenueForecast({
          projectId: importProjectId,
          expectedDate: scheduleDates[scheduleEntry.id] ?? currentMonthKey(),
          amountNet: scheduleEntry.amountNet,
          confidence: "ok",
          notes: scheduleEntry.title ? `Z harmonogramu: ${scheduleEntry.title}` : "Z harmonogramu spłat",
        });
      }
      if (includeAdditional && additionalTotal > 0) {
        await createProjectRevenueForecast({
          projectId: importProjectId,
          expectedDate: additionalDate,
          amountNet: additionalTotal,
          confidence: "ok",
          notes: `Zaakceptowane oferty/zmiany projektowe (suma ${additionalCount} poz.)`,
        });
      }
      onImported?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaimportować pozycji.");
    } finally {
      setSaving(false);
    }
  }

  const nothingToImport = scheduleEntries.length === 0 && additionalTotal <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edytuj spodziewany wpływ" : "Nowy spodziewany wpływ"}</DialogTitle>
        </DialogHeader>

        {!isEdit ? (
          <div className="mb-2 flex gap-1 rounded-lg border border-border/70 p-1">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              variant={mode === "manual" ? "default" : "ghost"}
              onClick={() => setMode("manual")}
            >
              Wpisz ręcznie
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              variant={mode === "import" ? "default" : "ghost"}
              onClick={() => setMode("import")}
            >
              Pobierz z harmonogramu
            </Button>
          </div>
        ) : null}

        {error ? (
          <p className="mb-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {isEdit || mode === "manual" ? (
          <>
            <div className="grid gap-4">
              <Field label="Projekt">
                <Select
                  value={manual.projectId}
                  disabled={isEdit}
                  onChange={(e) => setManual({ ...manual, projectId: e.target.value })}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data">
                  <Input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} />
                </Field>
                <Field label="Kwota netto (zł)">
                  <Input
                    type="number"
                    step="0.01"
                    value={manual.amount}
                    onChange={(e) => setManual({ ...manual, amount: e.target.value })}
                  />
                </Field>
              </div>

              {!isEdit ? (
                <label className="flex items-start gap-3 rounded-xl border border-border/70 px-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-blue-500"
                    checked={addToSchedule}
                    onChange={(e) => setAddToSchedule(e.target.checked)}
                  />
                  <span className="text-sm text-foreground">
                    Dodaj do harmonogramu spłat klienta
                    <span className="block text-xs text-muted">
                      Zamiast prognozy powstanie realna rata harmonogramu, widoczna też w rozliczeniach
                      projektu. Bez pewności — liczy się w 100% jak reszta harmonogramu.
                    </span>
                  </span>
                </label>
              ) : null}

              {!addToSchedule ? (
                <Field label="Pewność">
                  <Select
                    value={manual.confidence}
                    onChange={(e) => setManual({ ...manual, confidence: e.target.value as BudgetConfidenceLevel })}
                  >
                    {BUDGET_CONFIDENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {BUDGET_CONFIDENCE_LABELS[level]}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              <Field label={addToSchedule ? "Tytuł raty (opcjonalnie)" : "Notatki (opcjonalnie)"}>
                <Input value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} />
              </Field>
            </div>

            <DialogFooter className="sm:justify-between">
              {isEdit ? (
                <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                  Anuluj
                </Button>
                <Button type="button" onClick={() => void handleSaveManual()} disabled={saving || !manual.projectId}>
                  {saving ? "Zapisywanie..." : addToSchedule ? "Dodaj do harmonogramu" : "Zapisz"}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="grid gap-4">
              <Field label="Projekt">
                <Select value={importProjectId} onChange={(e) => setImportProjectId(e.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {importLoading ? (
                <p className="text-sm text-muted">Wczytywanie rozliczeń projektu...</p>
              ) : nothingToImport ? (
                <p className="text-sm text-muted">
                  Ten projekt nie ma harmonogramu spłat ani zaakceptowanych ofert/zmian projektowych do pobrania.
                </p>
              ) : (
                <>
                  {scheduleEntries.length > 0 ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-medium text-foreground">Harmonogram spłat</p>
                      {scheduleEntries.map((scheduleEntry) => (
                        <div
                          key={scheduleEntry.id}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 rounded border-border accent-blue-500"
                            checked={selectedScheduleIds.has(scheduleEntry.id)}
                            onChange={() => toggleSchedule(scheduleEntry.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">
                              {scheduleEntry.title || "Rata harmonogramu"}
                            </p>
                            <p className="text-xs text-muted">{formatMoney(scheduleEntry.amountNet)} netto</p>
                          </div>
                          <Input
                            type="date"
                            className="h-9 w-36"
                            value={scheduleDates[scheduleEntry.id] ?? ""}
                            disabled={!selectedScheduleIds.has(scheduleEntry.id)}
                            onChange={(e) =>
                              setScheduleDates((prev) => ({ ...prev, [scheduleEntry.id]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {additionalTotal > 0 ? (
                    <div className="grid gap-2 rounded-xl border border-border/70 px-3 py-3">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-blue-500"
                          checked={includeAdditional}
                          onChange={(e) => setIncludeAdditional(e.target.checked)}
                        />
                        <span className="text-sm text-foreground">
                          Dołącz zaakceptowane oferty/zmiany projektowe — {additionalCount}{" "}
                          {additionalCount === 1 ? "pozycja" : "pozycji"}, suma {formatMoney(additionalTotal)}{" "}
                          (jedna dodatkowa pozycja pipeline, do ewentualnego podziału później)
                        </span>
                      </label>
                      {includeAdditional ? (
                        <Field label="Data tej pozycji" className="ml-7">
                          <Input
                            type="date"
                            value={additionalDate}
                            onChange={(e) => setAdditionalDate(e.target.value)}
                          />
                        </Field>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                type="button"
                onClick={() => void handleImport()}
                disabled={
                  saving ||
                  importLoading ||
                  (selectedScheduleIds.size === 0 && !(includeAdditional && additionalTotal > 0))
                }
              >
                {saving ? "Importowanie..." : "Pobierz"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
