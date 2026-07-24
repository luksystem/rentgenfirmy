"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { createProjectRevenueForecast } from "@/lib/supabase/project-revenue-forecast-repository";
import { fetchProjectSettlementEntries } from "@/lib/supabase/project-settlement-repository";
import type { ProjectSettlementEntry } from "@/lib/settlements/types";
import { currentMonthKey } from "@/lib/budget-forecast/types";
import { formatMoney } from "@/lib/utils";
import type { Project } from "@/lib/types";

export function BudgetPipelineImportDialog({
  open,
  onOpenChange,
  projects,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onImported: () => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scheduleEntries, setScheduleEntries] = useState<ProjectSettlementEntry[]>([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<string>>(new Set());
  const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({});

  const [additionalTotal, setAdditionalTotal] = useState(0);
  const [additionalCount, setAdditionalCount] = useState(0);
  const [includeAdditional, setIncludeAdditional] = useState(false);
  const [additionalDate, setAdditionalDate] = useState(`${currentMonthKey().slice(0, 7)}-01`);

  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProjectId(projects[0]?.id ?? "");
  }, [open, projects]);

  useEffect(() => {
    if (!open || !projectId) {
      setScheduleEntries([]);
      setAdditionalTotal(0);
      setAdditionalCount(0);
      return;
    }

    setLoading(true);
    setError(null);
    void fetchProjectSettlementEntries(projectId)
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
        setAdditionalTotal(additional.reduce((sum, e) => sum + e.amountGross, 0));
        setAdditionalCount(additional.length);
        setIncludeAdditional(false);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Nie udało się wczytać rozliczeń."))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  function toggleSchedule(id: string) {
    setSelectedScheduleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const toCreate = scheduleEntries.filter((e) => selectedScheduleIds.has(e.id));
      for (const entry of toCreate) {
        await createProjectRevenueForecast({
          projectId,
          expectedDate: scheduleDates[entry.id] ?? currentMonthKey(),
          amountGross: entry.amountGross,
          confidence: "ok",
          notes: entry.title ? `Z harmonogramu: ${entry.title}` : "Z harmonogramu spłat",
        });
      }
      if (includeAdditional && additionalTotal > 0) {
        await createProjectRevenueForecast({
          projectId,
          expectedDate: additionalDate,
          amountGross: additionalTotal,
          confidence: "ok",
          notes: `Zaakceptowane oferty/zmiany projektowe (suma ${additionalCount} poz.)`,
        });
      }
      onImported();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaimportować pozycji.");
    } finally {
      setImporting(false);
    }
  }

  const nothingToImport = scheduleEntries.length === 0 && additionalTotal <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pobierz z harmonogramu</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Projekt">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>

          {error ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {loading ? (
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
                  {scheduleEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-border accent-blue-500"
                        checked={selectedScheduleIds.has(entry.id)}
                        onChange={() => toggleSchedule(entry.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{entry.title || "Rata harmonogramu"}</p>
                        <p className="text-xs text-muted">{formatMoney(entry.amountGross)}</p>
                      </div>
                      <Input
                        type="date"
                        className="h-9 w-36"
                        value={scheduleDates[entry.id] ?? ""}
                        disabled={!selectedScheduleIds.has(entry.id)}
                        onChange={(e) => setScheduleDates((prev) => ({ ...prev, [entry.id]: e.target.value }))}
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
                      {additionalCount === 1 ? "pozycja" : "pozycji"}, suma {formatMoney(additionalTotal)} (jedna
                      dodatkowa pozycja pipeline, do ewentualnego podziału później)
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
              importing ||
              loading ||
              (selectedScheduleIds.size === 0 && !(includeAdditional && additionalTotal > 0))
            }
          >
            {importing ? "Importowanie..." : "Pobierz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
