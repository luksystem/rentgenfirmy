"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  buildSettlementSummary,
  DEFAULT_AGREEMENT_VAT_RATE,
  normalizeAgreementVatRate,
  SETTLEMENT_KIND_LABELS,
  SETTLEMENT_SOURCE_LABELS,
  type ProjectSettlementEntry,
  type ProjectSettlementEntryInput,
  type SettlementKind,
} from "@/lib/settlements/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { useProjectSettlementStore } from "@/store/project-settlement-store";

const KIND_SECTIONS: SettlementKind[] = ["charge", "sales_invoice", "payment", "schedule"];

export function ProjectSettlementsPanel({
  projectId,
  actorName,
  readOnly = false,
}: {
  projectId: string;
  actorName: string;
  readOnly?: boolean;
}) {
  const bundle = useProjectSettlementStore((state) => state.byProject[projectId]);
  const loading = useProjectSettlementStore((state) => state.loadingProjects[projectId]);
  const ensureSettlements = useProjectSettlementStore((state) => state.ensureSettlements);
  const addEntry = useProjectSettlementStore((state) => state.addEntry);
  const updateEntry = useProjectSettlementStore((state) => state.updateEntry);
  const removeEntry = useProjectSettlementStore((state) => state.removeEntry);

  const entries = bundle?.entries ?? [];
  const summary = useMemo(() => buildSettlementSummary(entries), [entries]);

  const [editing, setEditing] = useState<ProjectSettlementEntry | null>(null);
  const [creatingKind, setCreatingKind] = useState<SettlementKind | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Publiczny seed trafia do store przez useLayoutEffect rodzica — nie nadpisuj go force-fetchem.
    void ensureSettlements(projectId, { sync: !readOnly }).catch(() => undefined);
  }, [ensureSettlements, projectId, readOnly]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć pozycji.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !bundle) {
    return <p className="text-sm text-muted">Ładowanie rozliczeń…</p>;
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Do zapłaty"
          net={summary.chargesNet}
          gross={summary.chargesGross}
          hint={`${summary.chargesCount} należności`}
        />
        <SummaryCard
          label="Zafakturowano"
          net={summary.invoicedNet}
          gross={summary.invoicedGross}
          hint={`${summary.invoicesCount} faktur`}
        />
        <SummaryCard
          label="Zapłacono"
          net={summary.paidNet}
          gross={summary.paidGross}
          hint={`${summary.paymentsCount} spłat`}
        />
        <SummaryCard
          label="Saldo"
          net={null}
          gross={summary.balanceGross}
          hint="Do zapłaty − zapłacono"
          emphasize
        />
      </div>

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      {KIND_SECTIONS.map((kind) => {
        const sectionEntries = entries.filter((entry) => entry.kind === kind);
        return (
          <section key={kind} className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {SETTLEMENT_KIND_LABELS[kind]}
              </h3>
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
                          {entry.invoiceNumber ? ` · nr ${entry.invoiceNumber}` : ""}
                          {entry.entryDate ? ` · ${formatDate(entry.entryDate)}` : ""}
                          {entry.dueDate ? ` · termin ${formatDate(entry.dueDate)}` : ""}
                          {entry.externalRef ? ` · ref ${entry.externalRef}` : ""}
                        </p>
                        {entry.notes ? (
                          <p className="mt-1 text-xs text-muted">{entry.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="text-right text-sm tabular-nums">
                          <p className="text-foreground">
                            brutto {formatMoney(entry.amountGross)}
                          </p>
                          <p className="text-xs text-muted">
                            netto {formatMoney(entry.amountNet)} · VAT {entry.vatRate}%
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
  net,
  gross,
  hint,
  emphasize = false,
}: {
  label: string;
  net: number | null;
  gross: number;
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        emphasize ? "border-accent/40 bg-accent/5" : "border-border/70 bg-surface",
      )}
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {formatMoney(gross)}
      </p>
      {net != null ? (
        <p className="text-xs text-muted">netto {formatMoney(net)}</p>
      ) : null}
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function EntryForm({
  kind,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  kind: SettlementKind;
  initial?: ProjectSettlementEntry;
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
  const [entryDate, setEntryDate] = useState(
    initial?.entryDate ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoiceNumber ?? "");
  const [externalRef, setExternalRef] = useState(initial?.externalRef ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={kind === "schedule" ? "Data przewidywanej spłaty" : "Data"}>
          <Input
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
        </Field>
        {(kind === "sales_invoice" || kind === "schedule") && (
          <Field label="Termin płatności">
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
