"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, Pencil, Plus, Send, Trash2, Wallet, X } from "lucide-react";
import { AgreementCollapsibleShell } from "@/components/dashboard/agreement-collapsible-shell";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { Button } from "@/components/ui/button";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildChangeRequestCollapsibleMeta,
  formatChangeRequestCost,
  isChangeRequestBlockingActive,
  isChangeRequestPendingAttention,
  normalizeProjectChangeRequestInput,
  type ProjectChangeRequest,
  type ProjectChangeRequestInput,
  type ProjectChangeRequestStatus,
} from "@/lib/dashboard/change-request-types";
import { DEFAULT_AGREEMENT_VAT_RATE, normalizeAgreementVatRate } from "@/lib/dashboard/agreement-cost";
import { mergeChangeRequestsById } from "@/lib/dashboard/merge-change-requests";
import { buildProjectCostSummary, sumAcceptedOffersGross } from "@/lib/dashboard/project-cost-summary";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import { cn, formatMoney } from "@/lib/utils";
import { useProjectChangeRequestStore } from "@/store/project-change-request-store";
import { useProcessStore } from "@/store/process-store";
import { useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";

const EMPTY_CHANGE_REQUESTS: ProjectChangeRequest[] = [];

type FilterKey = "all" | ProjectChangeRequestStatus;

const filterLabels: Record<FilterKey, string> = {
  all: "Wszystkie",
  draft: "Szkice",
  pending_client: "Oczekujące",
  accepted: "Zaakceptowane",
  rejected: "Odrzucone",
  cancelled: "Anulowane",
};

function emptyInput(): ProjectChangeRequestInput {
  return {
    title: "",
    body: "",
    proposedCostNet: null,
    proposedCostGross: null,
    proposedCostVatRate: DEFAULT_AGREEMENT_VAT_RATE,
    costNote: "",
    acceptanceDeadlineStageId: null,
    blocksNextStage: false,
  };
}

function changeRequestToInput(entry: ProjectChangeRequest): ProjectChangeRequestInput {
  return {
    title: entry.title,
    body: entry.body,
    proposedCostNet: entry.proposedCostNet,
    proposedCostGross: entry.proposedCostGross,
    proposedCostVatRate: normalizeAgreementVatRate(entry.proposedCostVatRate),
    costNote: entry.costNote ?? "",
    acceptanceDeadlineStageId: entry.acceptanceDeadlineStageId,
    blocksNextStage: entry.blocksNextStage,
  };
}

function canEditChangeRequestContent(entry: ProjectChangeRequest) {
  return ["draft", "pending_client", "rejected"].includes(entry.status);
}

function ChangeRequestCard({
  changeRequest,
  mode,
  authorName,
  onSubmit,
  onCancel,
  onRespond,
  onDelete,
  onEdit,
  defaultExpanded = false,
  blockingStageLabel,
}: {
  changeRequest: ProjectChangeRequest;
  mode: "team" | "client";
  authorName: string;
  onSubmit: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onRespond: (
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (entry: ProjectChangeRequest) => void;
  defaultExpanded?: boolean;
  blockingStageLabel?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const meta = buildChangeRequestCollapsibleMeta(changeRequest);
  const costLabel = formatChangeRequestCost(changeRequest);
  const isBlocking = isChangeRequestBlockingActive(changeRequest);

  useEffect(() => {
    if (!defaultExpanded || !cardRef.current) {
      return;
    }
    cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [defaultExpanded, changeRequest.id]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={cardRef}>
      <AgreementCollapsibleShell
        title={meta.title}
        subtitle={meta.subtitle}
        statusLabel={meta.statusLabel}
        statusTone={meta.statusTone}
        defaultExpanded={defaultExpanded}
        banner={
          isBlocking ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {blockingStageLabel
                ? `Blokuje etap „${blockingStageLabel}” do czasu akceptacji`
                : "Blokuje kolejny etap procesu do czasu akceptacji"}
            </div>
          ) : null
        }
      >
        {changeRequest.body ? (
          <p className="break-words whitespace-pre-wrap text-sm text-muted">{changeRequest.body}</p>
        ) : null}

        {costLabel ? <p className="text-sm font-medium text-foreground">Koszt: {costLabel}</p> : null}
        {changeRequest.costNote && costLabel !== changeRequest.costNote ? (
          <p className="text-xs text-muted">{changeRequest.costNote}</p>
        ) : null}

        {changeRequest.submittedAt ? (
          <p className="text-xs text-muted">
            Wysłano do klienta: {new Date(changeRequest.submittedAt).toLocaleString("pl-PL")}
          </p>
        ) : null}

        {changeRequest.clientResponseNote ? (
          <p className="text-sm text-foreground">
            Odpowiedź klienta: <span className="text-muted">{changeRequest.clientResponseNote}</span>
          </p>
        ) : null}

        {mode === "team" && changeRequest.status === "draft" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void run(() => onSubmit(changeRequest.id))}
            >
              <Send className="mr-2 h-3.5 w-3.5" />
              Wyślij do akceptacji klienta
            </Button>
            {onEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => onEdit(changeRequest)}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edytuj
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void run(() => onDelete(changeRequest.id))}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Usuń
            </Button>
          </div>
        ) : null}

        {mode === "team" && changeRequest.status === "pending_client" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {onEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => onEdit(changeRequest)}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edytuj
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void run(() => onCancel(changeRequest.id))}
            >
              Anuluj oczekujące
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void run(() => onDelete(changeRequest.id))}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Usuń
            </Button>
          </div>
        ) : null}

        {mode === "team" && !["draft", "pending_client"].includes(changeRequest.status) ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void run(() => onDelete(changeRequest.id))}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Usuń
            </Button>
          </div>
        ) : null}

        {mode === "client" && changeRequest.status === "pending_client" ? (
          <div className="grid gap-2">
            <Field label="Uwagi (opcjonalnie)">
              <Textarea
                value={responseNote}
                onChange={(event) => setResponseNote(event.target.value)}
                rows={2}
                placeholder="Komentarz do decyzji…"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    onRespond(changeRequest.id, {
                      accepted: true,
                      clientResponseName: authorName,
                      clientResponseNote: responseNote,
                    }),
                  )
                }
              >
                <Check className="mr-2 h-3.5 w-3.5" />
                Akceptuję
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    onRespond(changeRequest.id, {
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
    </div>
  );
}

export function ProjectChangeRequestsPanel({
  projectId,
  mode,
  authorName,
  seedChangeRequests,
  seedOffersGrossTotal,
  seedAcceptedOffersCount,
  focusChangeRequestId,
  publicDashboardToken,
}: {
  projectId: string;
  mode: "team" | "client";
  authorName: string;
  seedChangeRequests?: ProjectChangeRequest[];
  /** Suma zaakceptowanych ofert (widok publiczny) — obliczona po stronie serwera. */
  seedOffersGrossTotal?: number;
  seedAcceptedOffersCount?: number;
  focusChangeRequestId?: string;
  publicDashboardToken?: string;
}) {
  const storeChangeRequests = useProjectChangeRequestStore(
    (state) => state.byProject[projectId] ?? EMPTY_CHANGE_REQUESTS,
  );
  const loading = useProjectChangeRequestStore((state) => state.loadingProjects[projectId]);
  const ensureChangeRequests = useProjectChangeRequestStore((state) => state.ensureChangeRequests);
  const createChangeRequest = useProjectChangeRequestStore((state) => state.createChangeRequest);
  const submitForClient = useProjectChangeRequestStore((state) => state.submitForClient);
  const respond = useProjectChangeRequestStore((state) => state.respond);
  const cancel = useProjectChangeRequestStore((state) => state.cancel);
  const removeDraft = useProjectChangeRequestStore((state) => state.removeDraft);
  const removeChangeRequest = useProjectChangeRequestStore((state) => state.removeChangeRequest);
  const updateChangeRequest = useProjectChangeRequestStore((state) => state.updateChangeRequest);
  const updateDraft = useProjectChangeRequestStore((state) => state.updateDraft);

  const projects = useAppStore((state) => state.projects);
  const currentProject = useMemo(() => projects.find((entry) => entry.id === projectId), [projects, projectId]);

  const ensureProjectProcess = useProcessStore((state) => state.ensureProjectProcess);
  const processTemplate = useProcessStore((state) =>
    currentProject
      ? resolveAnchoredProcessTemplate(
          state.getProjectProcess(projectId) ?? {
            id: "",
            projectId,
            templateId: "",
            templateSnapshot: null,
            completions: {},
            milestoneDates: {},
            activeStageId: null,
            createdAt: "",
            updatedAt: "",
          },
          state.getTemplateByProjectType(currentProject.type),
        )
      : null,
  );

  useEffect(() => {
    if (mode !== "team" || !currentProject) {
      return;
    }
    void ensureProjectProcess(projectId, currentProject.type);
  }, [currentProject, ensureProjectProcess, mode, projectId]);

  const allServices = useServiceStore((state) => state.services);
  const liveOffersSummary = useMemo(() => {
    if (mode !== "team") {
      return null;
    }
    return sumAcceptedOffersGross(allServices.filter((service) => service.projectId === projectId));
  }, [allServices, mode, projectId]);

  const offersGrossTotal = mode === "team" ? (liveOffersSummary?.total ?? 0) : (seedOffersGrossTotal ?? 0);
  const acceptedOffersCount =
    mode === "team" ? (liveOffersSummary?.count ?? 0) : (seedAcceptedOffersCount ?? 0);

  const changeRequests = useMemo(
    () => mergeChangeRequestsById(storeChangeRequests, seedChangeRequests),
    [storeChangeRequests, seedChangeRequests],
  );

  const costSummary = useMemo(
    () => buildProjectCostSummary(offersGrossTotal, acceptedOffersCount, changeRequests),
    [offersGrossTotal, acceptedOffersCount, changeRequests],
  );

  const stageLabelById = useMemo(() => {
    const map = new Map<string, string>();
    (processTemplate?.stages ?? []).forEach((stage, index) => {
      map.set(stage.id, `Etap ${index + 1}: ${stage.title}`);
    });
    return map;
  }, [processTemplate]);

  const [filter, setFilter] = useState<FilterKey>(mode === "client" ? "pending_client" : "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectChangeRequestInput>(emptyInput());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void ensureChangeRequests(projectId);
  }, [ensureChangeRequests, projectId]);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return changeRequests.filter((entry) => entry.status !== "cancelled" || mode === "team");
    }
    if (filter === "pending_client") {
      return changeRequests.filter((entry) => isChangeRequestPendingAttention(entry));
    }
    if (filter === "draft") {
      return changeRequests.filter((entry) => entry.status === "draft");
    }
    return changeRequests.filter((entry) => entry.status === filter);
  }, [changeRequests, filter, mode]);

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<FilterKey, number>> = {
      all: changeRequests.filter((entry) => entry.status !== "cancelled").length,
      draft: changeRequests.filter((entry) => entry.status === "draft").length,
      pending_client: changeRequests.filter((entry) => isChangeRequestPendingAttention(entry)).length,
      accepted: changeRequests.filter((entry) => entry.status === "accepted").length,
      rejected: changeRequests.filter((entry) => entry.status === "rejected").length,
      cancelled: changeRequests.filter((entry) => entry.status === "cancelled").length,
    };
    return counts;
  }, [changeRequests]);

  async function refreshLocal() {
    await ensureChangeRequests(projectId, { force: true });
  }

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyInput());
    setSaveError(null);
    setDialogOpen(true);
  }

  function openEditDialog(entry: ProjectChangeRequest) {
    setEditingId(entry.id);
    setSaveError(null);
    setForm(changeRequestToInput(entry));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyInput());
    setSaveError(null);
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    if (!form.title.trim()) {
      setSaveError("Podaj tytuł zmiany.");
      return;
    }

    const payload = normalizeProjectChangeRequestInput(form);

    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        const existing = changeRequests.find((entry) => entry.id === editingId);
        if (!existing || !canEditChangeRequestContent(existing)) {
          throw new Error("Tej zmiany nie można edytować w bieżącym stanie.");
        }
        if (existing.status === "draft") {
          await updateDraft(projectId, editingId, payload);
        } else {
          await updateChangeRequest(projectId, editingId, payload);
        }
        await refreshLocal();
      } else {
        await createChangeRequest(projectId, payload, { name: authorName, side: mode });
      }
      closeDialog();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Nie udało się zapisać zmiany.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(id: string) {
    await submitForClient(projectId, id);
    await refreshLocal();
  }

  async function handleCancel(id: string) {
    await cancel(projectId, id);
    await refreshLocal();
  }

  async function handleRespond(
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) {
    if (publicDashboardToken) {
      const response = await fetch(
        `/api/przestrzen/${encodeURIComponent(publicDashboardToken)}/change-requests/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "respond",
            accepted: input.accepted,
            authorName: input.clientResponseName,
            clientResponseNote: input.clientResponseNote,
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się zapisać decyzji.");
      }
      await refreshLocal();
      return;
    }

    await respond(projectId, id, input);
    await refreshLocal();
  }

  async function handleDelete(id: string) {
    const existing = changeRequests.find((entry) => entry.id === id);
    if (
      existing &&
      (existing.status === "accepted" || existing.status === "rejected") &&
      !window.confirm("Ta zmiana ma już odpowiedź klienta. Na pewno usunąć?")
    ) {
      return;
    }

    if (existing?.status === "draft") {
      await removeDraft(projectId, id);
    } else {
      await removeChangeRequest(projectId, id);
    }
  }

  const isLoading = Boolean(loading) && changeRequests.length === 0;

  const visibleFilters: FilterKey[] =
    mode === "client"
      ? ["pending_client", "accepted", "rejected", "all"]
      : ["all", "draft", "pending_client", "accepted", "rejected"];

  const defaultFilter: FilterKey = mode === "client" ? "pending_client" : "all";
  const activeFilterCount = filter !== defaultFilter ? 1 : 0;

  const emptyMessage =
    mode === "client"
      ? ({
          pending_client: "Brak zmian oczekujących na Twoją decyzję.",
          accepted: "Brak zaakceptowanych zmian.",
          rejected: "Brak odrzuconych zmian.",
          all: "Brak zmian w tym projekcie.",
          draft: "Brak szkiców.",
          cancelled: "Brak anulowanych zmian.",
        } satisfies Record<FilterKey, string>)[filter]
      : filter === "all"
        ? "Brak zmian w tym widoku. Dodaj zmianę i wyślij ją do akceptacji klienta."
        : `Brak zmian ze statusem „${filterLabels[filter]}”.`;

  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-x-hidden">
      <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-4 sm:grid-cols-3">
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-xs text-muted">Koszt bazowy (zaakceptowane oferty)</p>
            <p className="text-sm font-semibold text-foreground">
              {formatMoney(costSummary.offersGrossTotal)}
            </p>
            <p className="text-[11px] text-muted">{costSummary.acceptedOffersCount} ofert</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-xs text-muted">Koszty zmian (zaakceptowane)</p>
            <p className="text-sm font-semibold text-foreground">
              {formatMoney(costSummary.changeRequestsGrossTotal)}
            </p>
            <p className="text-[11px] text-muted">{costSummary.acceptedChangeRequestsCount} zmian</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="text-xs text-muted">Razem koszt projektu</p>
            <p className="text-base font-bold text-foreground">{formatMoney(costSummary.totalGross)}</p>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <MobileFiltersPanel
          activeCount={activeFilterCount}
          onClear={() => setFilter(defaultFilter)}
          title="Status"
          className="min-w-0"
          alwaysVisible={mode === "client"}
        >
          <div className="flex flex-wrap gap-1.5">
            {visibleFilters.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  filter === key
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/70 text-muted hover:text-foreground",
                )}
              >
                {filterLabels[key]} ({filterCounts[key] ?? 0})
              </button>
            ))}
          </div>
        </MobileFiltersPanel>
        {mode === "team" ? (
          <Button type="button" size="sm" className="w-full shrink-0 sm:w-auto" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nowa zmiana
          </Button>
        ) : null}
      </div>

      {isLoading ? <p className="text-sm text-muted">Ładowanie zmian…</p> : null}

      {!isLoading && filtered.length === 0 ? <p className="text-sm text-muted">{emptyMessage}</p> : null}

      <div className="grid gap-3">
        {filtered.map((entry) => (
          <ChangeRequestCard
            key={entry.id}
            changeRequest={entry}
            mode={mode}
            authorName={authorName}
            onSubmit={(id) => handleSubmit(id)}
            onCancel={(id) => handleCancel(id)}
            onRespond={(id, input) => handleRespond(id, input)}
            onDelete={(id) => handleDelete(id)}
            onEdit={mode === "team" ? (item) => openEditDialog(item) : undefined}
            defaultExpanded={entry.id === focusChangeRequestId}
            blockingStageLabel={
              entry.acceptanceDeadlineStageId
                ? (stageLabelById.get(entry.acceptanceDeadlineStageId) ?? null)
                : null
            }
          />
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          } else {
            setDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj zmianę" : "Nowa zmiana projektu"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Zmiany w oczekującej pozycji zobaczy klient przy następnym wejściu na dashboard."
                : "Opisz zmianę zakresu/kosztu. Po zapisaniu wyślij ją do akceptacji klienta."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Tytuł">
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="np. Dodatkowe gniazdo w garażu"
              />
            </Field>
            <Field label="Opis zmiany">
              <Textarea
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                rows={4}
                placeholder="Szczegóły zmiany zakresu, urządzeń lub kosztu…"
              />
            </Field>
            <AgreementCostFields
              net={form.proposedCostNet ?? null}
              vatRate={normalizeAgreementVatRate(form.proposedCostVatRate)}
              onChange={(cost) => setForm((current) => ({ ...current, ...cost }))}
            />
            <Field label="Notatka do kosztu">
              <Input
                value={form.costNote ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, costNote: event.target.value }))}
                placeholder="np. wycena orientacyjna, do potwierdzenia po pomiarach"
              />
            </Field>

            <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
              <p className="text-sm font-medium text-foreground">Deadline akceptacji</p>
              <p className="text-xs text-muted">
                Wskaż etap procesu, przed którym ta zmiana musi być zaakceptowana przez klienta.
                Lista etapów pochodzi z procesu wczytanego do tego projektu.
              </p>
              <Field label="Etap procesu">
                <select
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  value={form.acceptanceDeadlineStageId ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      acceptanceDeadlineStageId: event.target.value || null,
                      blocksNextStage: event.target.value ? current.blocksNextStage : false,
                    }))
                  }
                >
                  <option value="">Brak (nie wiąż z etapem procesu)</option>
                  {(processTemplate?.stages ?? []).map((stage, index) => (
                    <option key={stage.id} value={stage.id}>
                      Etap {index + 1}: {stage.title}
                    </option>
                  ))}
                </select>
              </Field>
              {!processTemplate?.stages.length ? (
                <p className="text-xs text-amber-400">
                  Ten projekt nie ma jeszcze wczytanego procesu — etapy pojawią się tu po jego uruchomieniu.
                </p>
              ) : null}
              <label
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                  !form.acceptanceDeadlineStageId
                    ? "border-border/60 bg-surface-muted/20 text-muted"
                    : form.blocksNextStage
                      ? "border-rose-500/40 bg-rose-500/10"
                      : "border-border/70",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.blocksNextStage ?? false}
                  disabled={!form.acceptanceDeadlineStageId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, blocksNextStage: event.target.checked }))
                  }
                />
                <span>
                  <span className="font-medium text-foreground">Blokuj kolejny etap</span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    Wybrany etap (i wszystkie po nim) nie ruszy, dopóki klient nie zaakceptuje tej zmiany.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
                {editingId ? "Zapisz zmiany" : "Zapisz szkic"}
              </Button>
              <Button type="button" className="w-full sm:w-auto" variant="secondary" onClick={closeDialog}>
                Anuluj
              </Button>
            </div>
            {saveError ? <p className="text-sm text-rose-400">{saveError}</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
