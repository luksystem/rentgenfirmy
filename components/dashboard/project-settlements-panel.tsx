"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { SettlementOriginBreakdownCard } from "@/components/dashboard/settlement-origin-breakdown";
import { ProjectHourBudgetCard } from "@/components/time-tracking/project-hour-budget-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ClientOfferSummary } from "@/lib/dashboard/client-offer-summary";
import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";
import { buildSettlementReportEmail } from "@/lib/email/settlement-templates";
import { buildSettlementOriginBreakdown } from "@/lib/settlements/origin-breakdown";
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
import { useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";

const KIND_SECTIONS: SettlementKind[] = ["charge", "sales_invoice", "payment", "schedule"];

export function ProjectSettlementsPanel({
  projectId,
  actorName,
  readOnly = false,
  publicDashboardToken,
  clientEmail,
  clientName,
  changeRequests = [],
  offerSummaries,
}: {
  projectId: string;
  actorName: string;
  readOnly?: boolean;
  publicDashboardToken?: string;
  clientEmail?: string | null;
  clientName?: string;
  changeRequests?: ProjectChangeRequest[];
  /** Publiczny link / seed — gdy brak, w trybie zespołu bierzemy oferty ze store. */
  offerSummaries?: ClientOfferSummary[];
}) {
  const bundle = useProjectSettlementStore((state) => state.byProject[projectId]);
  const loading = useProjectSettlementStore((state) => state.loadingProjects[projectId]);
  const ensureSettlements = useProjectSettlementStore((state) => state.ensureSettlements);
  const addEntry = useProjectSettlementStore((state) => state.addEntry);
  const updateEntry = useProjectSettlementStore((state) => state.updateEntry);
  const removeEntry = useProjectSettlementStore((state) => state.removeEntry);

  const projects = useAppStore((state) => state.projects);
  const project = projects.find((entry) => entry.id === projectId);
  const allServices = useServiceStore((state) => state.services);
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
  const projectServices = useMemo(
    () => allServices.filter((service) => service.projectId === projectId),
    [allServices, projectId],
  );
  const originBreakdown = useMemo(
    () =>
      buildSettlementOriginBreakdown({
        projectId,
        settings,
        entries,
        changeRequests,
        services: offerSummaries ? undefined : projectServices,
        offerSummaries,
      }),
    [changeRequests, entries, offerSummaries, projectId, projectServices, settings],
  );

  const [editing, setEditing] = useState<ProjectSettlementEntry | null>(null);
  const [creatingKind, setCreatingKind] = useState<SettlementKind | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hourBudget, setHourBudget] = useState<ProjectHourBudgetSummary | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicSettlementsUrl =
    publicDashboardToken && origin
      ? `${origin}/przestrzen/${publicDashboardToken}?projectId=${encodeURIComponent(projectId)}&tab=settlements`
      : null;

  const emailPreview = useMemo(
    () =>
      buildSettlementReportEmail({
        clientName: clientName ?? "Klient",
        projectName: project?.name ?? "Projekt",
        entries,
        publicUrl: publicSettlementsUrl,
        hourBudget: settings?.hourlyEnabled ? hourBudget : null,
      }),
    [clientName, entries, hourBudget, project?.name, publicSettlementsUrl, settings?.hourlyEnabled],
  );

  const paidScheduleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (entry.kind === "payment" && entry.sourceId) {
        ids.add(entry.sourceId);
      }
    }
    return ids;
  }, [entries]);

  useEffect(() => {
    void ensureSettlements(projectId, {
      force: false,
      sync: !readOnly,
      showLoading: true,
    }).catch(() => undefined);
    // Tylko przy zmianie projektu — nie przy każdej mutacji cache (wyścig z Spłacone).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- celowo bez bundle
  }, [ensureSettlements, projectId, readOnly]);

  useEffect(() => {
    if (!project) return;
    void ensureProjectProcess(projectId, project.type).catch(() => undefined);
  }, [ensureProjectProcess, project, projectId]);

  useEffect(() => {
    if (!settings?.hourlyEnabled) {
      setHourBudget(null);
      return;
    }

    if (bundle?.hourBudget) {
      setHourBudget(bundle.hourBudget);
    }

    // Publiczny podgląd nie ma auth do /time-entries — bierzemy hourBudget z seeda.
    if (readOnly) {
      if (!bundle?.hourBudget) {
        setHourBudget(null);
      }
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
          setHourBudget(payload.hourBudget ?? bundle?.hourBudget ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setHourBudget(bundle?.hourBudget ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [bundle?.hourBudget, projectId, readOnly, settings?.hourlyEnabled, entries.length]);

  async function handleRefresh() {
    setError(null);
    try {
      await ensureSettlements(projectId, { force: true, sync: true, showLoading: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się odświeżyć rozliczeń.");
    }
  }

  function settlementErrorMessage(err: unknown, fallback: string) {
    if (!(err instanceof Error)) {
      return fallback;
    }
    const message = err.message.trim();
    if (!message || /load failed|failed to fetch|networkerror/i.test(message)) {
      return `${fallback} Sprawdź połączenie i odśwież listę.`;
    }
    return message;
  }

  async function refreshSettlementsSoft() {
    try {
      await ensureSettlements(projectId, { force: true, sync: false, showLoading: false });
    } catch {
      // Cache lokalny już zaktualizowany przez mutację — nie blokuj UI.
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
      await refreshSettlementsSoft();
    } catch (err) {
      setError(settlementErrorMessage(err, "Nie udało się zapisać pozycji."));
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
      if (editing?.id === entryId) {
        setEditing(null);
      }
      await refreshSettlementsSoft();
    } catch (err) {
      setError(settlementErrorMessage(err, "Nie udało się usunąć pozycji."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkSchedulePaid(schedule: ProjectSettlementEntry) {
    if (readOnly || schedule.kind !== "schedule") return;
    if (busyId) return;
    if (paidScheduleIds.has(schedule.id)) return;
    setBusyId(schedule.id);
    setError(null);
    try {
      await addEntry(
        projectId,
        {
          kind: "payment",
          source: "none",
          sourceId: schedule.id,
          processStageId: schedule.processStageId,
          title: `Spłata: ${schedule.title}`,
          amountNet: schedule.amountNet,
          vatRate: schedule.vatRate,
          amountGross: schedule.amountGross,
          entryDate: new Date().toISOString().slice(0, 10),
          dueDate: schedule.dueDate,
          notes: schedule.notes
            ? `${schedule.notes}\nZ harmonogramu spłat.`
            : "Z harmonogramu spłat.",
        },
        actorName,
      );
      setCreatingKind(null);
      setEditing(null);
      // Cache już ma spłatę — nie rób force-refresh (stary request potrafił nadpisać listę).
    } catch (err) {
      setError(settlementErrorMessage(err, "Nie udało się oznaczyć jako spłacone."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmSendEmail() {
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
      setEmailPreviewOpen(false);
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
    setShareMessage(null);
    window.setTimeout(() => setLinkCopied(false), 2000);
  }

  async function sharePublicLink() {
    if (!publicSettlementsUrl) return;
    setShareMessage(null);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Rozliczenia — ${project?.name ?? "projekt"}`,
          text: "Link do rozliczeń projektu",
          url: publicSettlementsUrl,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await copyPublicLink();
    setShareMessage("Link skopiowany — wklej go klientowi.");
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
    <div className="grid min-w-0 max-w-full gap-5 overflow-x-hidden sm:gap-6">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-xs text-muted">
          Podsumowania w netto. Harmonogram uwzględnia kwoty z VAT (brutto w pozycjach).
        </p>
        {!readOnly ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => void handleRefresh()}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Odśwież źródła
          </Button>
        ) : null}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <SettlementOriginBreakdownCard breakdown={originBreakdown} />

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
              Brak zarejestrowanego czasu pracy. Po wpisach w module czasu pracy zużycie godzin pojawi się
              tutaj automatycznie.
            </p>
          )}
        </section>
      ) : null}

      {!readOnly ? (
        <section className="grid gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3 sm:p-4">
          <h3 className="page-section-subtitle text-sm">Wyślij rozliczenie / link publiczny</h3>
          <p className="text-xs text-muted">
            Raport dla klienta: należności, spłaty, saldo, harmonogram
            {settings?.hourlyEnabled ? " oraz zużycie godzin" : ""}.
            {clientName ? ` Odbiorca: ${clientName}.` : ""}
          </p>

          {publicSettlementsUrl ? (
            <div className="grid gap-2">
              <Field label="Link publiczny do rozliczeń">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    readOnly
                    value={publicSettlementsUrl}
                    className="w-full min-w-0 max-w-full break-all font-mono text-xs"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => void copyPublicLink()}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      {linkCopied ? "Skopiowano" : "Kopiuj"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => void sharePublicLink()}
                    >
                      <Share2 className="mr-1 h-3.5 w-3.5" />
                      Udostępnij
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => window.open(publicSettlementsUrl, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Podgląd
                    </Button>
                  </div>
                </div>
              </Field>
              {shareMessage ? <p className="text-xs text-muted">{shareMessage}</p> : null}
            </div>
          ) : (
            <p className="text-xs text-amber-300">
              Brak tokenu przestrzeni publicznej — wygeneruj link dashboardu klienta, aby udostępnić
              rozliczenia.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setEmailMessage(null);
                setEmailPreviewOpen(true);
              }}
              disabled={!clientEmail}
            >
              <Mail className="mr-1 h-4 w-4" />
              Wyślij e-mail…
            </Button>
          </div>
          {emailMessage ? <p className="text-sm text-muted">{emailMessage}</p> : null}
          {!clientEmail ? (
            <p className="text-xs text-amber-300">Uzupełnij e-mail klienta, aby wysłać raport.</p>
          ) : null}
        </section>
      ) : null}

      <Dialog open={emailPreviewOpen} onOpenChange={setEmailPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Podgląd raportu przed wysyłką</DialogTitle>
            <DialogDescription>
              Sprawdź treść wiadomości. Po potwierdzeniu raport trafi na{" "}
              <span className="font-medium text-foreground">{clientEmail ?? "—"}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Temat">
              <Input readOnly value={emailPreview.subject} />
            </Field>
            <div className="overflow-hidden rounded-xl border border-border/70 bg-white">
              <div
                className="max-h-[50vh] overflow-auto p-4 text-sm text-neutral-900"
                dangerouslySetInnerHTML={{ __html: emailPreview.html }}
              />
            </div>
            {publicSettlementsUrl ? (
              <p className="break-all text-xs text-muted">
                <Link2 className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
                W wiadomości będzie też link: {publicSettlementsUrl}
              </p>
            ) : null}
          </div>
          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={emailSending}
              onClick={() => setEmailPreviewOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={emailSending || !clientEmail}
              onClick={() => void handleConfirmSendEmail()}
            >
              <Mail className="mr-1 h-4 w-4" />
              {emailSending ? "Wysyłanie…" : "Potwierdź i wyślij"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {KIND_SECTIONS.map((kind) => {
        const sectionEntries = entries.filter((entry) => entry.kind === kind);
        return (
          <section key={kind} className="grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h3 className="page-section-subtitle text-sm">{SETTLEMENT_KIND_LABELS[kind]}</h3>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
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
                      className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-xl border border-border/70 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 max-w-full flex-1">
                        <p className="break-words font-medium text-foreground">{entry.title}</p>
                        <p className="break-words text-xs text-muted">
                          {SETTLEMENT_SOURCE_LABELS[entry.source]}
                          {entry.isAuto ? " · auto" : ""}
                          {entry.processStageId
                            ? ` · etap ${stages.find((s) => s.id === entry.processStageId)?.title ?? entry.processStageId}`
                            : ""}
                          {entry.invoiceNumber ? ` · nr ${entry.invoiceNumber}` : ""}
                          {entry.entryDate ? ` · przewidywana ${formatDate(entry.entryDate)}` : ""}
                          {entry.dueDate ? ` · płatność ${formatDate(entry.dueDate)}` : ""}
                          {kind === "schedule" && paidScheduleIds.has(entry.id)
                            ? " · oznaczona jako spłacona"
                            : ""}
                        </p>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
                        <div className="text-left text-sm tabular-nums sm:text-right">
                          <p className="text-foreground">netto {formatMoney(entry.amountNet)}</p>
                          <p className="text-xs text-muted">
                            VAT {entry.vatRate}% · brutto {formatMoney(entry.amountGross)}
                          </p>
                        </div>
                        {!readOnly ? (
                          <div className="flex flex-wrap gap-1">
                            {kind === "schedule" ? (
                              paidScheduleIds.has(entry.id) ? (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                                  <Check className="h-3.5 w-3.5" />
                                  Spłacone
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="flex-1 sm:flex-none"
                                  disabled={Boolean(busyId)}
                                  onClick={() => void handleMarkSchedulePaid(entry)}
                                >
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  {busyId === entry.id ? "Zapisywanie…" : "Spłacone"}
                                </Button>
                              )
                            ) : null}
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
                        ) : kind === "schedule" && paidScheduleIds.has(entry.id) ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                            <Check className="h-3.5 w-3.5" />
                            Spłacone
                          </span>
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
    <div className={cn("min-w-0 max-w-full overflow-hidden rounded-2xl border px-3 py-3 sm:px-4", toneClass)}>
      <p className="break-words text-xs font-medium text-muted">{label}</p>
      <p className={cn("mt-1 break-words text-base font-semibold tabular-nums sm:text-lg", valueClass)}>
        {formatMoney(value)}
      </p>
      <p className="mt-1 break-words text-[11px] leading-snug text-muted">{hint}</p>
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
    <div className="grid min-w-0 max-w-full gap-3 overflow-x-hidden rounded-xl border border-border/80 bg-surface-muted/40 p-3">
      <Field label="Tytuł">
        <Input
          value={title}
          className="min-w-0 max-w-full"
          onChange={(event) => setTitle(event.target.value)}
          disabled={initial?.source === "contract"}
        />
      </Field>
      {initial?.source === "contract" ? (
        <p className="text-xs text-muted">
          Kwota umowy głównej — zapis aktualizuje też Budżet projektu.
        </p>
      ) : null}
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="w-full sm:w-auto"
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
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={onCancel}
        >
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
