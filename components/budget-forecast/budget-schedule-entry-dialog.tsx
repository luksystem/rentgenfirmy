"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  deleteProjectSettlementEntry,
  updateProjectSettlementEntry,
} from "@/lib/supabase/project-settlement-repository";
import {
  addDaysIso,
  DEFAULT_AGREEMENT_VAT_RATE,
  normalizeAgreementVatRate,
  type ProjectSettlementEntry,
} from "@/lib/settlements/types";
import type { AgreementVatRate } from "@/lib/dashboard/agreement-cost";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

/**
 * Edycja raty harmonogramu spłat (kind='schedule') bezpośrednio z Timesheet w Pipeline.
 * Te same pola co formularz edycji w rozliczeniach projektu (project-settlements-panel.tsx) —
 * zapis idzie do tej samej tabeli, więc zmiana jest widoczna też na karcie klienta.
 */
export function BudgetScheduleEntryDialog({
  open,
  onOpenChange,
  entry,
  projectName,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ProjectSettlementEntry | null;
  projectName?: string;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [net, setNet] = useState<number | null>(null);
  const [vatRate, setVatRate] = useState<AgreementVatRate>(DEFAULT_AGREEMENT_VAT_RATE);
  const [gross, setGross] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const projects = useAppStore((state) => state.projects);
  const process = useProcessStore((state) =>
    entry ? (state.projectProcesses[entry.projectId] ?? null) : null,
  );
  const getTemplateByProjectType = useProcessStore((state) => state.getTemplateByProjectType);
  const ensureProjectProcess = useProcessStore((state) => state.ensureProjectProcess);
  const [stageInfoLoading, setStageInfoLoading] = useState(false);

  useEffect(() => {
    if (!open || !entry) return;
    setError(null);
    setTitle(entry.title);
    setNet(entry.amountNet);
    setVatRate(normalizeAgreementVatRate(entry.vatRate));
    setGross(entry.amountGross);
    setEntryDate(entry.entryDate ?? "");
    setDueDate(entry.dueDate ?? "");
    setNotes(entry.notes);
  }, [open, entry]);

  useEffect(() => {
    if (!open || !entry?.processStageId) return;
    const project = projects.find((p) => p.id === entry.projectId);
    if (!project) return;
    setStageInfoLoading(true);
    void ensureProjectProcess(entry.projectId, project.type).finally(() => setStageInfoLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry?.projectId, entry?.processStageId]);

  const template =
    entry && process
      ? resolveAnchoredProcessTemplate(process, getTemplateByProjectType(projects.find((p) => p.id === entry.projectId)?.type ?? ""))
      : null;
  const linkedStage = entry?.processStageId
    ? (template?.stages.find((s) => s.id === entry.processStageId) ?? null)
    : null;
  const stageDate = linkedStage
    ? (linkedStage.milestones.map((m) => process?.milestoneDates[m.id]).find((d) => d) ?? null)
    : null;

  function applyStageDate() {
    if (!stageDate) return;
    setEntryDate(stageDate);
    setDueDate(addDaysIso(stageDate, 14));
  }

  async function handleSave() {
    if (!entry) return;
    setSaving(true);
    setError(null);
    try {
      await updateProjectSettlementEntry(entry.id, {
        kind: "schedule",
        source: entry.source,
        sourceId: entry.sourceId,
        processStageId: entry.processStageId,
        title,
        amountNet: net ?? 0,
        vatRate,
        amountGross: gross ?? undefined,
        entryDate: entryDate || null,
        dueDate: dueDate || null,
        invoiceNumber: entry.invoiceNumber,
        externalRef: entry.externalRef,
        notes,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać raty harmonogramu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProjectSettlementEntry(entry.id);
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć raty harmonogramu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rata harmonogramu spłat{projectName ? ` — ${projectName}` : ""}</DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="mb-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4">
          <Field label="Tytuł">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <AgreementCostFields
            net={net}
            vatRate={vatRate}
            onChange={(value) => {
              setNet(value.proposedCostNet);
              setVatRate(value.proposedCostVatRate);
              setGross(value.proposedCostGross);
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data przewidywanej spłaty">
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setEntryDate(next);
                  if (next) setDueDate(addDaysIso(next, 14));
                }}
              />
            </Field>
            <Field label="Data płatności (+14 dni domyślnie)">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>

          {entry?.processStageId ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2">
              {stageInfoLoading ? (
                <p className="text-xs text-muted">Sprawdzam datę etapu...</p>
              ) : stageDate ? (
                <>
                  <p className="text-xs text-muted">
                    Etap „{linkedStage?.title}” ma ustaloną datę: {formatDate(stageDate)}
                  </p>
                  <Button type="button" variant="secondary" size="sm" onClick={applyStageDate}>
                    Ustaw z daty etapu
                  </Button>
                </>
              ) : (
                <p className="text-xs text-amber-400">
                  Etap „{linkedStage?.title ?? "?"}” nie ma jeszcze ustalonej daty — nie można pobrać terminu.
                  Data raty pozostaje bez zmian, dopóki nie ustawisz jej ręcznie.
                </p>
              )}
            </div>
          ) : null}

          <Field label="Notatka">
            <Textarea value={notes} rows={2} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
            <Trash2 className="h-4 w-4" />
            Usuń
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving || !title.trim() || net == null}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
