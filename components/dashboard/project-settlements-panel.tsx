"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Link2, Mail, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { ProjectHourBudgetCard } from "@/components/time-tracking/project-hour-budget-card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  addDaysIso,
  buildSettlementSummary,
  DEFAULT_AGREEMENT_VAT_RATE,
  normalizeAgreementVatRate,
  SETTLEMENT_KIND_LABELS,
  SETTLEMENT_SOURCE_LABELS,
  type ProjectSettlementEntry,
  type ProjectSettlementEntryInput,
  type SettlementKind,
} from "@/lib/settlements/types";
import type { ProjectHourBudgetSummary } from "@/lib/time-tracking/project-hour-budget";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { useProcessStore } from "@/store/process-store";
import { useProjectSettlementStore } from "@/store/project-settlement-store";
import { useAppStore } from "@/store/app-store";

const KIND_SECTIONS: SettlementKind[] = ["charge", "sales_invoice", "payment", "schedule"];

export function ProjectSettlementsPanel({
  projectId,
  actorName,
  readOnly = false,
  publicDashboardToken,
  clientEmail,
  clientName,
}: {
  projectId: string;
  actorName: string;
  readOnly?: boolean;
  publicDashboardToken?: string;
  clientEmail?: string | null;
  clientName?: string;
}) {
  const bundle = useProjectSettlementStore((state) => state.byProject[projectId]);
  const loading = useProjectSettlementStore((state) => state.loadingProjects[projectId]);
  const ensureSettlements = useProjectSettlementStore((state) => state.ensureSettlements);
  const addEntry = useProjectSettlementStore((state) => state.addEntry);
  const updateEntry = useProjectSettlementStore((state) => state.updateEntry);
  const removeEntry = useProjectSettlementStore((state) => state.removeEntry);

  const projects = useAppStore((state) => state.projects);
  const project = projects.find((entry) => entry.id === projectId);
  const process = useProcessStore((state) => state.projectProcesses[projectId] ?? null);
  const template = useProcessStore((state) =>
    project ? state.getTemplateByProjectType(project.type) ?? null : null,
  );
  const ensureProjectProcess = useProcessStore((state) => state.ensureProjectProcess);

  const anchored = process && template ? resolveAnchoredProcessTemplate(process, template) : template;
  const stages = anchored?.stages ?? [];

  const entries = bundle?.entries ?? [];
  const settings = bundle?.settings;
  const summary = useMemo(() => buildSettlementSummary(entries), [entries]);

  const [editing, setEditing] = useState<ProjectSettlementEntry | null>(null);
  const [creatingKind, setCreatingKind] = useState<SettlementKind | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hourBudget, setHourBudget] = useState<ProjectHourBudgetSummary | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const publicSettlementsUrl = publicDashboardToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/przestrzen/${publicDashboardToken}?projectId=${encodeURIComponent(projectId)}&tab=settlements`
    : null;

  useEffect(() => {
    void ensureSettlements(projectId, {
      force: !readOnly,
      sync: !readOnly,
      showLoading: !bundle,
    }).catch(() => undefined);
  }, [bundle, ensureSettlements, projectId, readOnly]);

  useEffect(() => {
    if (!project) return;
    void ensureProjectProcess(projectId, project.type).catch(() => undefined);
  }, [ensureProjectProcess, project, projectId]);

  useEffect(() => {
    if (!settings?.hourlyEnabled || readOnly) {
      setHourBudget(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/time-entries`, {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          hourBudget?: ProjectHourBudgetSummary | null;
        };
        if (!cancelled && response.ok) {
          setHourBudget(payload.hourBudget ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setHourBudget(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, readOnly, settings?.hourlyEnabled, entries.length]);

  async function handleRefresh() {
    setError(null);
    try {
      await ensureSettlements(projectId, { force: true, sync: true, showLoading: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się odświeżyć rozliczeń.");
    }
  }

  async function handleSave(input: ProjectSettlementEntryInput, entryId?: string) {
    setError(null);
    setBusyId(entryId ?? "new");
    try {
      if (entryId) {
        await updateEntry(projectId, entryId, input);
      } else {
        await addEntry(projectId, input, actorName);
      }
      setEditing(null);
      setCreatingKind(null);
      await ensureSettlements(projectId, { force: true, sync: true, showLoading: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać pozycji.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(entryId: string) {
    if (readOnly) return;
    if (!window.confirm("Usunąć tę pozycję rozliczenia?")) return;
    setBusyId(entryId);
    setError(null);
    try {
      await removeEntry(projectId, entryId);
      await ensureSettlements(projectId, { force: true, sync: true, showLoading: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć pozycji.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSendEmail() {
    if (readOnly) return;
    setEmailSending(true);
    setEmailMessage(null);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/settlements/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: clientEmail,
          publicUrl: publicSettlementsUrl,
        }),
      });
      const payload = (await response.json()) as { error?: string; skipped?: boolean; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać e-maila.");
      }
      setEmailMessage(
        payload.skipped
          ? payload.message ?? "Wysyłka pominięta (brak konfiguracji e-mail lub wyłączone w ustawieniach)."
          : "Raport rozliczenia wysłany do klienta.",
      );
    } catch (err) {
      setEmailMessage(err instanceof Error ? err.message : "Błąd wysyłki e-mail.");
    } finally {
      setEmailSending(false);
    }
  }

  async function copyPublicLink() {
    if (!publicSettlementsUrl) return;
    await navigator.clipboard.writeText(publicSettlementsUrl);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading && !bundle) {
    return <p className="text-sm text-muted">Ładowanie rozliczeń…</p>;
  }

  const balanceTone =
    summary.balanceNet > 0.009
      ? "danger"
      : summary.balanceNet < -0.009
        ? "success"
        : "neutral";
  const scheduleTone =
    Math.abs(summary.scheduleCoverageNet) < 0.5
      ? "success"
      : summary.scheduleCoverageNet < 0
        ? "danger"
        : "warning";

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Podsumowania w netto. Harmonogram uwzględnia kwoty z VAT (brutto w pozycjach).
        </p>
        {!readOnly ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => void handleRefresh()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Odśwież źródła
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Do zapłaty (netto)"
          value={summary.chargesNet}
          hint={`${summary.chargesCount} należności · brutto ${formatMoney(summary.chargesGross)}`}
        />
        <SummaryCard
          label="Zafakturowano (netto)"
          value={summary.invoicedNet}
          hint={`${summary.invoicesCount} faktur`}
        />
        <SummaryCard
          label="Zapłacono (netto)"
          value={summary.paidNet}
          hint={`${summary.paymentsCount} spłat · brutto ${formatMoney(summary.paidGross)}`}
          tone="success"
        />
        <SummaryCard
          label="Pozostało do rozliczenia"
          value={summary.balanceNet}
          hint="Należności − spłaty (netto)"
          tone={balanceTone}
          emphasize
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Planowane wpływy vs spłaty"
          value={summary.balanceNet}
          hint={
            Math.abs(summary.balanceNet) < 0.5
              ? "Zgadza się — spłaty pokrywają należności"
              : summary.balanceNet > 0
                ? "Brakuje spłat względem planu należności"
                : "Spłaty przewyższają należności"
          }
          tone={balanceTone}
        />
        <SummaryCard
          label="Harmonogram vs należności"
          value={summary.scheduleCoverageNet}
          hint={
            Math.abs(summary.scheduleCoverageNet) < 0.5
              ? "Harmonogram w pełni pokrywa należności (netto)"
              : summary.scheduleCoverageNet < 0
                ? `W harmonogramie brakuje ${formatMoney(Math.abs(summary.scheduleCoverageNet))} netto`
                : `Harmonogram ma nadwyżkę ${formatMoney(summary.scheduleCoverageNet)} netto`
          }
          tone={scheduleTone}
        />
      </div>

      {settings?.hourlyEnabled ? (
        <section className="grid gap-2">
          <h3 className="page-section-subtitle text-sm">Zużycie godzin (czas pracy)</h3>
          {hourBudget ? (
            <ProjectHourBudgetCard budget={hourBudget} />
          ) : (
            <p className="text-sm text-muted">
              Brak pól godzin w kontrakcie albo brak wpisów czasu — zdefiniuj budżet godzin w projekcie
              (pola kontraktu) i rejestruj czas w zakładce Czas pracy.
            </p>
          )}
        </section>
      ) : null}

      {!readOnly || publicSettlementsUrl ? (
        <section className="grid gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-4">
          <h3 className="page-section-subtitle text-sm">Wyślij rozliczenie / link publiczny</h3>
          <p className="text-xs text-muted">
            Raport dla klienta: planowane wpływy, spłaty, saldo i harmonogram.
            {clientName ? ` Odbiorca: ${clientName}.` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {!readOnly ? (
              <Button
                type="button"
                onClick={() => void handleSendEmail()}
                disabled={emailSending || !clientEmail}
              >
                <Mail className="mr-1 h-4 w-4" />
                {emailSending ? "Wysyłanie…" : "Wyślij e-mail"}
              </Button>
            ) : null}
            {publicSettlementsUrl ? (
              <Button type="button" variant="secondary" onClick={() => void copyPublicLink()}>
                <Link2 className="mr-1 h-4 w-4" />
                {linkCopied ? "Skopiowano" : "Kopiuj link publiczny"}
                <Copy className="ml-1 h-3.5 w-3.5 opacity-60" />
              </Button>
            ) : null}
          </div>
          {emailMessage ? <p className="text-sm text-muted">{emailMessage}</p> : null}
          {!clientEmail && !readOnly ? (
            <p className="text-xs text-amber-300">Uzupełnij e-mail klienta, aby wysłać raport.</p>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {KIND_SECTIONS.map((kind) => {
        const sectionEntries = entries.filter((entry) => entry.kind === kind);
        return (
          <section key={kind} className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="page-section-subtitle text-sm">{SETTLEMENT_KIND_LABELS[kind]}</h3>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setCreatingKind(kind);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Dodaj
                </Button>
              ) : null}
            </div>

            {creatingKind === kind ? (
              <EntryForm
                kind={kind}
                stages={stages}
                milestoneDates={process?.milestoneDates ?? {}}
                busy={busyId === "new"}
                onCancel={() => setCreatingKind(null)}
                onSave={(input) => void handleSave(input)}
              />
            ) : null}

            {sectionEntries.length === 0 && creatingKind !== kind ? (
              <p className="text-sm text-muted">Brak pozycji.</p>
            ) : (
              <ul className="grid gap-2">
                {sectionEntries.map((entry) =>
                  editing?.id === entry.id ? (
                    <EntryForm
                      key={entry.id}
                      kind={entry.kind}
                      initial={entry}
                      stages={stages}
                      milestoneDates={process?.milestoneDates ?? {}}
                      busy={busyId === entry.id}
                      onCancel={() => setEditing(null)}
                      onSave={(input) => void handleSave(input, entry.id)}
                    />
                  ) : (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{entry.title}</p>
                        <p className="text-xs text-muted">
                          {SETTLEMENT_SOURCE_LABELS[entry.source]}
                          {entry.isAuto ? " · auto" : ""}
                          {entry.processStageId
                            ? ` · etap ${stages.find((s) => s.id === entry.processStageId)?.title ?? entry.processStageId}`
                            : ""}
                          {entry.invoiceNumber ? ` · nr ${entry.invoiceNumber}` : ""}
                          {entry.entryDate ? ` · przewidywana ${formatDate(entry.entryDate)}` : ""}
                          {entry.dueDate ? ` · płatność ${formatDate(entry.dueDate)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="text-right text-sm tabular-nums">
                          <p className="text-foreground">netto {formatMoney(entry.amountNet)}</p>
                          <p className="text-xs text-muted">
                            VAT {entry.vatRate}% · brutto {formatMoney(entry.amountGross)}
                          </p>
                        </div>
                        {!readOnly ? (
                          <div className="flex gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busyId === entry.id}
                              onClick={() => {
                                setCreatingKind(null);
                                setEditing(entry);
                              }}
                              aria-label="Edytuj"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busyId === entry.id}
                              onClick={() => void handleDelete(entry.id)}
                              aria-label="Usuń"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  emphasize = false,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "neutral" | "success" | "danger" | "warning";
  emphasize?: boolean;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : tone === "danger"
        ? "border-rose-500/40 bg-rose-500/10"
        : tone === "warning"
          ? "border-amber-500/40 bg-amber-500/10"
          : emphasize
            ? "border-accent/40 bg-accent/5"
            : "border-border/70 bg-surface";
  const valueClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-rose-300"
        : tone === "warning"
          ? "text-amber-200"
          : "text-foreground";

  return (
    <div className={cn("rounded-2xl border px-4 py-3", toneClass)}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", valueClass)}>
        {formatMoney(value)}
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function EntryForm({
  kind,
  initial,
  stages,
  milestoneDates,
  busy,
  onCancel,
  onSave,
}: {
  kind: SettlementKind;
  initial?: ProjectSettlementEntry;
  stages: Array<{ id: string; title: string; milestones: Array<{ id: string }> }>;
  milestoneDates: Record<string, string | null>;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: ProjectSettlementEntryInput) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? defaultTitle(kind));
  const [net, setNet] = useState<number | null>(initial?.amountNet ?? null);
  const [vatRate, setVatRate] = useState(
    normalizeAgreementVatRate(initial?.vatRate ?? DEFAULT_AGREEMENT_VAT_RATE),
  );
  const [gross, setGross] = useState<number | null>(initial?.amountGross ?? null);
  const [processStageId, setProcessStageId] = useState(initial?.processStageId ?? "");
  const [entryDate, setEntryDate] = useState(
    initial?.entryDate ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ??
      addDaysIso(initial?.entryDate ?? new Date().toISOString().slice(0, 10), 14),
  );
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoiceNumber ?? "");
  const [externalRef, setExternalRef] = useState(initial?.externalRef ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function stagePredictedDate(stageId: string): string | null {
    const stage = stages.find((entry) => entry.id === stageId);
    if (!stage) return null;
    for (const milestone of stage.milestones) {
      const date = milestoneDates[milestone.id];
      if (date) return date.slice(0, 10);
    }
    return null;
  }

  function applyStage(stageId: string) {
    setProcessStageId(stageId);
    const predicted = stagePredictedDate(stageId);
    if (predicted) {
      setEntryDate(predicted);
      setDueDate(addDaysIso(predicted, 14));
    }
    const stage = stages.find((entry) => entry.id === stageId);
    if (stage && !initial) {
      setTitle(`Spłata — ${stage.title}`);
    }
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/80 bg-surface-muted/40 p-3">
      <Field label="Tytuł">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
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
      {kind === "schedule" ? (
        <Field label="Etap procesu">
          <Select
            value={processStageId}
            onChange={(event) => applyStage(event.target.value)}
          >
            <option value="">— wybierz etap —</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.title}
                {stagePredictedDate(stage.id)
                  ? ` (data: ${formatDate(stagePredictedDate(stage.id)!)})`
                  : " (brak daty etapu)"}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={
            kind === "schedule" ? "Data przewidywanej spłaty (z etapu)" : "Data"
          }
        >
          <Input
            type="date"
            value={entryDate}
            onChange={(event) => {
              const next = event.target.value;
              setEntryDate(next);
              if (kind === "schedule" && next) {
                setDueDate(addDaysIso(next, 14));
              }
            }}
          />
        </Field>
        {(kind === "sales_invoice" || kind === "schedule") && (
          <Field label={kind === "schedule" ? "Data płatności (+14 dni domyślnie)" : "Termin płatności"}>
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
        )}
        {kind === "sales_invoice" ? (
          <>
            <Field label="Numer faktury">
              <Input
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
              />
            </Field>
            <Field label="Ref. księgowy (opcjonalnie)">
              <Input
                value={externalRef}
                placeholder="ID z programu księgowego"
                onChange={(event) => setExternalRef(event.target.value)}
              />
            </Field>
          </>
        ) : null}
      </div>
      <Field label="Notatka">
        <Textarea value={notes} rows={2} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy || !title.trim() || net == null}
          onClick={() =>
            onSave({
              kind,
              source: initial?.source ?? (kind === "charge" ? "manual" : "none"),
              sourceId: initial?.sourceId ?? null,
              processStageId: processStageId || null,
              title,
              amountNet: net ?? 0,
              vatRate,
              amountGross: gross ?? undefined,
              entryDate: entryDate || null,
              dueDate: dueDate || null,
              invoiceNumber,
              externalRef,
              notes,
            })
          }
        >
          {busy ? "Zapisywanie…" : "Zapisz"}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}

function defaultTitle(kind: SettlementKind) {
  switch (kind) {
    case "charge":
      return "Należność ręczna";
    case "sales_invoice":
      return "Faktura sprzedażowa";
    case "payment":
      return "Spłata";
    case "schedule":
      return "Przewidywana spłata";
    default:
      return "Pozycja";
  }
}
