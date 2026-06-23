"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, Plus, Send, Shield, Trash2, X } from "lucide-react";
import { AgreementCollapsibleShell } from "@/components/dashboard/agreement-collapsible-shell";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildAgreementCollapsibleMeta,
  formatAgreementCost,
  type ProjectAgreementInput,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import { DEFAULT_AGREEMENT_VAT_RATE, normalizeAgreementVatRate } from "@/lib/dashboard/agreement-cost";
import {
  computeWarrantyEndsAt,
  filterWarrantyAgreements,
  formatProjectDuration,
  formatSystemHandoverDate,
  formatWarrantyDurationMonths,
  formatWarrantyEndDate,
  getWarrantyStatus,
  hasPendingWarrantyExtension,
  isWarrantyExpiringSoon,
  WARRANTY_DURATION_PRESETS,
} from "@/lib/project/warranty";
import { milestoneDateToInput } from "@/lib/process/dates";
import type { Project } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useProjectAgreementStore } from "@/store/project-agreement-store";

const EMPTY_AGREEMENTS: ProjectClientAgreement[] = [];

const warrantyToneClass: Record<ReturnType<typeof getWarrantyStatus>["tone"], string> = {
  neutral: "border-border/80 bg-surface-muted/40 text-muted",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

function emptyWarrantyInput(project: Project): ProjectAgreementInput {
  return {
    title: "Przedłużenie gwarancji",
    body: "",
    category: "warranty",
    proposedCostNet: null,
    proposedCostGross: null,
    proposedCostVatRate: DEFAULT_AGREEMENT_VAT_RATE,
    costNote: "",
    proposedWarrantyEndDate: computeWarrantyEndsAt(project.systemHandoverAt, project.warrantyDurationMonths) ?? "",
  };
}

function WarrantyProposalCard({
  agreement,
  mode,
  authorName,
  onSubmit,
  onCancel,
  onRespond,
  onDelete,
}: {
  agreement: ProjectClientAgreement;
  mode: "team" | "client";
  authorName: string;
  onSubmit: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onRespond: (
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const meta = buildAgreementCollapsibleMeta(agreement);
  const costLabel = formatAgreementCost(agreement);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgreementCollapsibleShell
      title={meta.title}
      subtitle={meta.subtitle}
      statusLabel={meta.statusLabel}
      statusTone={meta.statusTone}
      hint={meta.hint}
    >
      {agreement.proposedWarrantyEndDate ? (
        <p className="text-sm text-foreground">
          Nowa data zakończenia gwarancji:{" "}
          <span className="font-medium">{formatDate(agreement.proposedWarrantyEndDate)}</span>
        </p>
      ) : null}

      {agreement.body ? (
        <p className="whitespace-pre-wrap text-sm text-muted">{agreement.body}</p>
      ) : null}

      {costLabel ? <p className="text-sm font-medium text-foreground">Koszt: {costLabel}</p> : null}

      {mode === "team" && agreement.status === "draft" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => onSubmit(agreement.id))}>
            <Send className="mr-2 h-3.5 w-3.5" />
            Wyślij do klienta
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => onCancel(agreement.id))}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void run(() => onDelete(agreement.id))}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Usuń szkic
          </Button>
        </div>
      ) : null}

      {mode === "client" && agreement.status === "pending_client" ? (
        <div className="grid gap-3">
          <Field label="Uwagi (opcjonalnie)">
            <Textarea
              value={responseNote}
              onChange={(event) => setResponseNote(event.target.value)}
              rows={2}
              placeholder="Komentarz do propozycji…"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  onRespond(agreement.id, {
                    accepted: true,
                    clientResponseName: authorName,
                    clientResponseNote: responseNote,
                  }),
                )
              }
            >
              <Check className="mr-2 h-3.5 w-3.5" />
              Akceptuję przedłużenie
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  onRespond(agreement.id, {
                    accepted: false,
                    clientResponseName: authorName,
                    clientResponseNote: responseNote,
                  }),
                )
              }
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Odrzucam
            </Button>
          </div>
        </div>
      ) : null}
    </AgreementCollapsibleShell>
  );
}

export function ProjectWarrantyPanel({
  project,
  mode,
  authorName,
  seedAgreements,
  onWarrantySettingsSave,
  onWarrantyExtensionAccepted,
  compact = false,
  embedded = false,
}: {
  project: Project;
  mode: "team" | "client";
  authorName: string;
  seedAgreements?: ProjectClientAgreement[];
  onWarrantySettingsSave?: (settings: {
    systemHandoverAt: string | null;
    warrantyDurationMonths: number | null;
  }) => void | Promise<void>;
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
  /** Jedna kolumna — w wąskim panelu bocznym dashboardu. */
  compact?: boolean;
  /** W rozwijalnej karcie HOME — bez powtórzonego nagłówka statystyk. */
  embedded?: boolean;
}) {
  const storeAgreements = useProjectAgreementStore(
    (state) => state.byProject[project.id] ?? EMPTY_AGREEMENTS,
  );
  const loading = useProjectAgreementStore((state) => state.loadingProjects[project.id]);
  const ensureAgreements = useProjectAgreementStore((state) => state.ensureAgreements);
  const createAgreement = useProjectAgreementStore((state) => state.createAgreement);
  const submitForClient = useProjectAgreementStore((state) => state.submitForClient);
  const respond = useProjectAgreementStore((state) => state.respond);
  const cancel = useProjectAgreementStore((state) => state.cancel);
  const removeDraft = useProjectAgreementStore((state) => state.removeDraft);

  const agreements =
    storeAgreements.length > 0 ? storeAgreements : (seedAgreements ?? storeAgreements);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProjectAgreementInput>(() => emptyWarrantyInput(project));
  const [saving, setSaving] = useState(false);
  const [handoverDraft, setHandoverDraft] = useState(() => milestoneDateToInput(project.systemHandoverAt));
  const [durationDraft, setDurationDraft] = useState(() =>
    project.warrantyDurationMonths ? String(project.warrantyDurationMonths) : "",
  );
  const [savingWarrantySettings, setSavingWarrantySettings] = useState(false);
  const [warrantySaveError, setWarrantySaveError] = useState<string | null>(null);

  useEffect(() => {
    setHandoverDraft(milestoneDateToInput(project.systemHandoverAt));
    setDurationDraft(project.warrantyDurationMonths ? String(project.warrantyDurationMonths) : "");
  }, [project.id, project.systemHandoverAt, project.warrantyDurationMonths]);

  const computedWarrantyEnd = useMemo(
    () =>
      computeWarrantyEndsAt(
        handoverDraft || null,
        durationDraft ? Number(durationDraft) : null,
      ),
    [durationDraft, handoverDraft],
  );

  const warrantyAgreements = useMemo(() => filterWarrantyAgreements(agreements), [agreements]);
  const warrantyStatus = getWarrantyStatus(project, {
    hasPendingExtension: hasPendingWarrantyExtension(warrantyAgreements),
  });

  const visibleProposals = useMemo(() => {
    if (mode === "client") {
      return warrantyAgreements.filter((entry) =>
        ["pending_client", "accepted", "rejected"].includes(entry.status),
      );
    }
    return warrantyAgreements.filter((entry) => entry.status !== "cancelled");
  }, [mode, warrantyAgreements]);

  useEffect(() => {
    void ensureAgreements(project.id);
  }, [ensureAgreements, project.id]);

  async function refreshAgreements() {
    await ensureAgreements(project.id, { force: true });
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.proposedWarrantyEndDate) {
      return;
    }
    setSaving(true);
    try {
      await createAgreement(project.id, form, { name: authorName, side: mode });
      setForm(emptyWarrantyInput(project));
      setDialogOpen(false);
      await refreshAgreements();
    } finally {
      setSaving(false);
    }
  }

  async function handleRespond(
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) {
    const updated = await respond(project.id, id, input);
    if (input.accepted && updated.proposedWarrantyEndDate) {
      await onWarrantyExtensionAccepted?.(updated.proposedWarrantyEndDate);
    }
    await refreshAgreements();
  }

  async function handleSaveWarrantySettings() {
    if (!onWarrantySettingsSave) {
      return;
    }
    const months = durationDraft.trim() ? Number(durationDraft) : null;
    if (handoverDraft.trim() && (!months || months <= 0)) {
      setWarrantySaveError("Podaj czas trwania gwarancji w miesiącach.");
      return;
    }
    if (!handoverDraft.trim() && months) {
      setWarrantySaveError("Podaj datę przekazania systemu.");
      return;
    }

    setSavingWarrantySettings(true);
    setWarrantySaveError(null);
    try {
      await onWarrantySettingsSave({
        systemHandoverAt: handoverDraft.trim() || null,
        warrantyDurationMonths: months,
      });
    } catch (error) {
      setWarrantySaveError(error instanceof Error ? error.message : "Nie udało się zapisać gwarancji.");
    } finally {
      setSavingWarrantySettings(false);
    }
  }

  const isLoading = loading && agreements.length === 0;

  return (
    <div className="grid min-w-0 gap-4">
      {!embedded ? (
      <div
        className={cn(
          "grid gap-3",
          compact ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        <div className="rounded-xl border border-border/70 bg-surface-muted/15 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Przekazanie systemu</p>
          <p className="mt-1 text-sm font-medium text-foreground">{formatSystemHandoverDate(project)}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-surface-muted/15 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Czas gwarancji</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {formatWarrantyDurationMonths(project.warrantyDurationMonths)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-surface-muted/15 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Status gwarancji</p>
          <span
            className={cn(
              "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
              warrantyToneClass[warrantyStatus.tone],
            )}
          >
            {warrantyStatus.label}
          </span>
        </div>
        <div className="rounded-xl border border-border/70 bg-surface-muted/15 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Koniec gwarancji</p>
          <p className="mt-1 text-sm font-medium text-foreground">{formatWarrantyEndDate(project)}</p>
        </div>
      </div>
      ) : null}

      {isWarrantyExpiringSoon(project) ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Gwarancja kończy się w ciągu miesiąca — rozważ przedłużenie lub przegląd systemu.
        </p>
      ) : null}

      {mode === "team" && onWarrantySettingsSave ? (
        <div className="rounded-xl border border-border/70 bg-surface-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Ustawienia gwarancji projektu</p>
          <p className="mt-1 text-xs text-muted">
            Koniec gwarancji liczony jest od daty przekazania systemu. Projekt trwa{" "}
            {formatProjectDuration(project)} od utworzenia.
          </p>
          <div className={cn("mt-3 grid min-w-0 gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
            <Field label="Data przekazania systemu">
              <Input
                type="date"
                value={handoverDraft}
                onChange={(event) => setHandoverDraft(event.target.value)}
              />
            </Field>
            <Field label="Czas trwania gwarancji (miesiące)">
              <Input
                type="number"
                min={1}
                step={1}
                value={durationDraft}
                onChange={(event) => setDurationDraft(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {WARRANTY_DURATION_PRESETS.map((preset) => (
              <Button
                key={preset.months}
                type="button"
                size="sm"
                variant="outline"
                disabled={savingWarrantySettings}
                onClick={() => setDurationDraft(String(preset.months))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            Obliczony koniec gwarancji:{" "}
            <span className="font-medium text-foreground">
              {computedWarrantyEnd ? formatDate(computedWarrantyEnd) : "—"}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={savingWarrantySettings}
              onClick={() => void handleSaveWarrantySettings()}
            >
              {savingWarrantySettings ? "Zapisywanie…" : "Zapisz gwarancję"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={savingWarrantySettings}
              onClick={() => {
                setHandoverDraft("");
                setDurationDraft("");
              }}
            >
              Wyczyść
            </Button>
          </div>
          {warrantySaveError ? <p className="mt-2 text-sm text-rose-400">{warrantySaveError}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Shield className="h-4 w-4 text-accent" />
          Propozycje przedłużenia gwarancji
        </div>
        {mode === "team" ? (
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Przedłuż gwarancję
          </Button>
        ) : null}
      </div>

      {isLoading && !warrantyAgreements.length ? (
        <p className="text-sm text-muted">Ładowanie propozycji gwarancji…</p>
      ) : null}

      {!isLoading && visibleProposals.length === 0 ? (
        <p className="text-sm text-muted">
          {mode === "team"
            ? "Brak propozycji przedłużenia. Utwórz propozycję i wyślij ją do akceptacji klienta."
            : "Brak propozycji przedłużenia gwarancji oczekujących na decyzję."}
        </p>
      ) : null}

      <div className="grid gap-3">
        {visibleProposals.map((agreement) => (
          <WarrantyProposalCard
            key={agreement.id}
            agreement={agreement}
            mode={mode}
            authorName={authorName}
            onSubmit={async (id) => {
              await submitForClient(project.id, id);
              await refreshAgreements();
            }}
            onCancel={async (id) => {
              await cancel(project.id, id);
              await refreshAgreements();
            }}
            onRespond={(id, input) => handleRespond(id, input)}
            onDelete={async (id) => {
              await removeDraft(project.id, id);
              await refreshAgreements();
            }}
          />
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przedłużenie gwarancji</DialogTitle>
            <DialogDescription>
              Przygotuj propozycję nowej daty zakończenia gwarancji i ewentualnego kosztu. Klient
              zaakceptuje lub odrzuci propozycję.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Tytuł propozycji">
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </Field>
            <Field label="Nowa data zakończenia gwarancji">
              <Input
                type="date"
                value={form.proposedWarrantyEndDate ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    proposedWarrantyEndDate: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Opis / warunki">
              <Textarea
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                rows={4}
                placeholder="Zakres przedłużenia, warunki serwisu…"
              />
            </Field>
            <AgreementCostFields
              net={form.proposedCostNet ?? null}
              vatRate={normalizeAgreementVatRate(form.proposedCostVatRate)}
              compact={compact}
              onChange={(cost) => setForm((current) => ({ ...current, ...cost }))}
            />
            <Field label="Notatka do kosztu">
              <Input
                value={form.costNote ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, costNote: event.target.value }))}
              />
            </Field>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={saving || !form.proposedWarrantyEndDate}
                onClick={() => void handleCreate()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Zapisz szkic
              </Button>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
