"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Link2, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { AgreementCollaborationPanel } from "@/components/dashboard/agreement-collaboration-panel";
import { AgreementDeliveryActions } from "@/components/dashboard/agreement-delivery-actions";
import { AgreementApprovalResponses } from "@/components/dashboard/agreement-approval-responses";
import { AgreementCollapsibleShell } from "@/components/dashboard/agreement-collapsible-shell";
import { AgreementApproverRoleField } from "@/components/dashboard/agreement-approver-role-field";
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
  PROJECT_AGREEMENT_CATEGORIES,
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  buildAgreementCollapsibleMeta,
  formatAgreementCost,
  isAgreementPendingAttention,
  normalizeProjectAgreementInput,
  type ProjectAgreementCategory,
  type ProjectAgreementInput,
  type ProjectAgreementStatus,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import { DEFAULT_AGREEMENT_VAT_RATE, normalizeAgreementVatRate } from "@/lib/dashboard/agreement-cost";
import {
  getAgreementPublicUrl,
  TEAM_APPROVER_ROLE_LABEL,
  type AgreementApproverRoleInput,
} from "@/lib/dashboard/agreement-collaboration-types";
import { mergeAgreementsById } from "@/lib/dashboard/merge-agreements";
import { findTradeCatalogItem } from "@/lib/field-options";
import { createPublicClientAgreement } from "@/lib/dashboard/public-agreement-client";
import { useAgreementApprovalHint } from "@/hooks/use-agreement-approval-hint";
import { fetchAgreementApproverRoles } from "@/lib/supabase/project-agreement-collaboration-repository";
import { cn, formatDate } from "@/lib/utils";
import { useProjectAgreementStore } from "@/store/project-agreement-store";
import { useProjectTradeStore } from "@/store/project-trade-store";
import { useAppStore } from "@/store/app-store";

const EMPTY_TRADES: import("@/lib/dashboard/trade-types").ProjectTrade[] = [];

type FilterKey = "all" | ProjectAgreementStatus;

const EMPTY_AGREEMENTS: ProjectClientAgreement[] = [];

const filterLabels: Record<FilterKey, string> = {
  all: "Wszystkie",
  draft: "Szkice",
  pending_client: "Oczekujące",
  accepted: "Zaakceptowane",
  rejected: "Odrzucone",
  cancelled: "Anulowane",
};

function emptyInput(): ProjectAgreementInput {
  return {
    title: "",
    body: "",
    category: "other",
    proposedCostNet: null,
    proposedCostGross: null,
    proposedCostVatRate: DEFAULT_AGREEMENT_VAT_RATE,
    costNote: "",
    publicEnabled: false,
    communicationProtocols: [],
    approverRoles: [
      { label: TEAM_APPROVER_ROLE_LABEL, isRequired: true, isTeamRole: true },
      { label: "Klient", isRequired: true, isClientRole: true },
    ],
  };
}

function agreementToInput(agreement: ProjectClientAgreement): ProjectAgreementInput {
  return {
    title: agreement.title,
    body: agreement.body,
    category: agreement.category,
    proposedCostNet: agreement.proposedCostNet,
    proposedCostGross: agreement.proposedCostGross,
    proposedCostVatRate: normalizeAgreementVatRate(agreement.proposedCostVatRate),
    costNote: agreement.costNote ?? "",
    proposedWarrantyEndDate: agreement.proposedWarrantyEndDate ?? "",
    publicEnabled: agreement.publicEnabled,
    communicationProtocols: agreement.communicationProtocols ?? [],
    approverRoles: [
      { label: TEAM_APPROVER_ROLE_LABEL, isRequired: true, isTeamRole: true },
      { label: "Klient", isRequired: true, isClientRole: true },
    ],
  };
}

function updateApproverRole(
  roles: AgreementApproverRoleInput[],
  index: number,
  patch: Partial<AgreementApproverRoleInput>,
) {
  return roles.map((role, roleIndex) => (roleIndex === index ? { ...role, ...patch } : role));
}

function sanitizeApproverRoles(roles: AgreementApproverRoleInput[] | undefined) {
  return (roles ?? []).filter(
    (role) => role.isTeamRole || role.isClientRole || role.label.trim().length > 0,
  );
}

function hasIncompleteApproverRole(roles: AgreementApproverRoleInput[] | undefined) {
  return (roles ?? []).some(
    (role) => !role.isTeamRole && !role.isClientRole && !role.label.trim(),
  );
}

function canEditAgreementContent(agreement: ProjectClientAgreement) {
  return ["draft", "pending_client", "rejected"].includes(agreement.status);
}

function AgreementCard({
  agreement,
  mode,
  authorName,
  projectTrades,
  clientEmail,
  clientName,
  onSubmit,
  onCancel,
  onRespond,
  onDelete,
  onEdit,
  onRefresh,
  onWarrantyExtensionAccepted,
  defaultExpanded = false,
}: {
  agreement: ProjectClientAgreement;
  mode: "team" | "client";
  authorName: string;
  projectTrades: import("@/lib/dashboard/trade-types").ProjectTrade[];
  clientEmail?: string | null;
  clientName?: string | null;
  onSubmit: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onRespond: (
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (agreement: ProjectClientAgreement) => void;
  onRefresh?: () => void | Promise<void>;
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
  defaultExpanded?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const meta = buildAgreementCollapsibleMeta(agreement);
  const approvalHint = useAgreementApprovalHint(agreement);
  const costLabel = formatAgreementCost(agreement);

  useEffect(() => {
    if (!defaultExpanded || !cardRef.current) {
      return;
    }
    cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [defaultExpanded, agreement.id]);

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
        hint={approvalHint ?? meta.hint}
        defaultExpanded={defaultExpanded}
        preview={
          <>
            {agreement.communicationProtocols?.length ? (
              <p className="text-xs text-muted">
                Protokoły:{" "}
                <span className="font-medium text-foreground/90">
                  {agreement.communicationProtocols.join(", ")}
                </span>
              </p>
            ) : null}
            <AgreementApprovalResponses agreement={agreement} compact title="" />
          </>
        }
      >
      <AgreementApprovalResponses agreement={agreement} title="Notatki z akceptacji" />

      {agreement.category === "warranty" && agreement.proposedWarrantyEndDate ? (
        <p className="text-sm text-foreground">
          Nowa data zakończenia gwarancji:{" "}
          <span className="font-medium">{formatDate(agreement.proposedWarrantyEndDate)}</span>
        </p>
      ) : null}

      {agreement.body ? (
        <p className="break-words whitespace-pre-wrap text-sm text-muted">{agreement.body}</p>
      ) : null}

      {agreement.communicationProtocols?.length ? (
        <p className="text-sm text-foreground">
          Protokoły:{" "}
          <span className="font-medium">{agreement.communicationProtocols.join(", ")}</span>
        </p>
      ) : null}

      {costLabel ? <p className="text-sm font-medium text-foreground">Koszt: {costLabel}</p> : null}
      {agreement.costNote && costLabel !== agreement.costNote ? (
        <p className="text-xs text-muted">{agreement.costNote}</p>
      ) : null}

      {agreement.submittedAt ? (
        <p className="text-xs text-muted">
          Wysłano do klienta: {new Date(agreement.submittedAt).toLocaleString("pl-PL")}
        </p>
      ) : null}

      {mode === "team" ? (
        <AgreementDeliveryActions
          agreement={agreement}
          trades={projectTrades}
          clientEmail={clientEmail}
          clientName={clientName}
        />
      ) : null}

      {mode === "team" && agreement.status === "draft" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => void run(() => onSubmit(agreement.id))}
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
              onClick={() => onEdit(agreement)}
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
            onClick={() => void run(() => onDelete(agreement.id))}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Usuń
          </Button>
        </div>
      ) : null}

      {mode === "team" && agreement.status === "pending_client" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {onEdit ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => onEdit(agreement)}
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
            onClick={() => void run(() => onCancel(agreement.id))}
          >
            Anuluj oczekujące
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => void run(() => onDelete(agreement.id))}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Usuń
          </Button>
        </div>
      ) : null}

      {mode === "team" &&
      !["draft", "pending_client"].includes(agreement.status) ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => void run(() => onDelete(agreement.id))}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Usuń
          </Button>
        </div>
      ) : null}

      {mode === "client" && agreement.status === "pending_client" && !agreement.activeVersionId ? (
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
                  onRespond(agreement.id, {
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

      {agreement.status !== "cancelled" ? (
        <AgreementCollaborationPanel
          agreementId={agreement.id}
          mode={mode}
          authorName={authorName}
          onChanged={onRefresh}
          onWarrantyExtensionAccepted={onWarrantyExtensionAccepted}
          syncRevision={`${agreement.status}:${agreement.updatedAt}:${agreement.activeVersionId ?? ""}`}
          showApprovalResponses={false}
        />
      ) : null}

      {mode === "team" && agreement.publicEnabled && agreement.publicToken ? (
        <p className="grid gap-1 text-xs text-muted">
          <span className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-accent" />
            Link publiczny:
          </span>
          <a
            href={getAgreementPublicUrl(agreement.publicToken)}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent hover:underline"
          >
            {getAgreementPublicUrl(agreement.publicToken)}
          </a>
        </p>
      ) : null}

      {mode === "client" && agreement.publicEnabled && agreement.publicToken ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface-muted/20 p-3 text-xs">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-accent" />
          <a
            href={getAgreementPublicUrl(agreement.publicToken)}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent hover:underline"
          >
            Link do udostępnienia
          </a>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(getAgreementPublicUrl(agreement.publicToken!))}
          >
            <Copy className="mr-1 h-3 w-3" />
            Kopiuj link
          </Button>
        </div>
      ) : null}
    </AgreementCollapsibleShell>
    </div>
  );
}

export function ProjectAgreementsPanel({
  projectId,
  mode,
  authorName,
  seedAgreements,
  onWarrantyExtensionAccepted,
  onAgreementsChanged,
  focusAgreementId,
  publicDashboardToken,
}: {
  projectId: string;
  mode: "team" | "client";
  authorName: string;
  seedAgreements?: ProjectClientAgreement[];
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
  onAgreementsChanged?: () => void | Promise<void>;
  focusAgreementId?: string;
  publicDashboardToken?: string;
}) {
  const storeAgreements = useProjectAgreementStore(
    (state) => state.byProject[projectId] ?? EMPTY_AGREEMENTS,
  );
  const loading = useProjectAgreementStore((state) => state.loadingProjects[projectId]);
  const ensureAgreements = useProjectAgreementStore((state) => state.ensureAgreements);
  const createAgreement = useProjectAgreementStore((state) => state.createAgreement);
  const submitForClient = useProjectAgreementStore((state) => state.submitForClient);
  const respond = useProjectAgreementStore((state) => state.respond);
  const cancel = useProjectAgreementStore((state) => state.cancel);
  const removeDraft = useProjectAgreementStore((state) => state.removeDraft);
  const removeAgreement = useProjectAgreementStore((state) => state.removeAgreement);
  const updateAgreement = useProjectAgreementStore((state) => state.updateAgreement);
  const updateDraft = useProjectAgreementStore((state) => state.updateDraft);

  const projectTrades = useProjectTradeStore(
    (state) => state.byProject[projectId] ?? EMPTY_TRADES,
  );
  const ensureTrades = useProjectTradeStore((state) => state.ensureTrades);
  const communicationProtocolOptions = useAppStore(
    (state) => state.fieldOptions.communicationProtocols,
  );
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);

  const projectClient = useMemo(() => {
    const project = projects.find((entry) => entry.id === projectId);
    if (!project?.clientId) {
      return null;
    }
    const client = clients.find((entry) => entry.id === project.clientId);
    if (!client) {
      return null;
    }
    return client;
  }, [clients, projectId, projects]);

  const agreements = useMemo(
    () => mergeAgreementsById(storeAgreements, seedAgreements),
    [storeAgreements, seedAgreements],
  );

  const [filter, setFilter] = useState<FilterKey>(focusAgreementId ? "all" : mode === "client" ? "pending_client" : "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectAgreementInput>(emptyInput());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void ensureAgreements(projectId);
  }, [ensureAgreements, projectId]);

  useEffect(() => {
    void ensureTrades(projectId);
  }, [ensureTrades, projectId]);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return agreements.filter((entry) => entry.status !== "cancelled" || mode === "team");
    }
    if (filter === "pending_client") {
      return agreements.filter((entry) => isAgreementPendingAttention(entry));
    }
    if (filter === "draft") {
      return agreements.filter((entry) => entry.status === "draft" && !entry.discussionOpen);
    }
    return agreements.filter((entry) => entry.status === filter);
  }, [agreements, filter, mode]);

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<FilterKey, number>> = {
      all: agreements.filter((entry) => entry.status !== "cancelled").length,
      draft: agreements.filter((entry) => entry.status === "draft" && !entry.discussionOpen).length,
      pending_client: agreements.filter((entry) => isAgreementPendingAttention(entry)).length,
      accepted: agreements.filter((entry) => entry.status === "accepted").length,
      rejected: agreements.filter((entry) => entry.status === "rejected").length,
      cancelled: agreements.filter((entry) => entry.status === "cancelled").length,
    };
    return counts;
  }, [agreements]);

  async function refreshLocalAgreements() {
    await ensureAgreements(projectId, { force: true });
  }

  async function handleCollaborationChanged() {
    await refreshLocalAgreements();
    await onAgreementsChanged?.();
  }

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyInput());
    setSaveError(null);
    setDialogOpen(true);
  }

  async function openEditDialog(agreement: ProjectClientAgreement) {
    const roles = await fetchAgreementApproverRoles(agreement.id);
    setEditingId(agreement.id);
    setSaveError(null);
    setForm({
      ...agreementToInput(agreement),
      approverRoles: roles.map((role) => ({
        label: role.label,
        isRequired: role.isRequired,
        isClientRole: role.isClientRole,
        isTeamRole: role.isTeamRole,
      })),
    });
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
      setSaveError("Podaj tytuł ustalenia.");
      return;
    }

    if (hasIncompleteApproverRole(form.approverRoles)) {
      setSaveError("Uzupełnij nazwę każdej dodanej roli akceptacji lub usuń pustą rolę.");
      return;
    }

    const payload = normalizeProjectAgreementInput({
      ...form,
      approverRoles: sanitizeApproverRoles(form.approverRoles),
    });

    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        const existing = agreements.find((entry) => entry.id === editingId);
        if (!existing || !canEditAgreementContent(existing)) {
          throw new Error("Tego ustalenia nie można edytować w bieżącym stanie.");
        }
        if (existing.status === "draft") {
          await updateDraft(projectId, editingId, payload);
        } else {
          await updateAgreement(projectId, editingId, payload);
        }
        await refreshLocalAgreements();
      } else if (publicDashboardToken) {
        await createPublicClientAgreement(publicDashboardToken, projectId, payload, authorName);
        await refreshLocalAgreements();
        await onAgreementsChanged?.();
      } else {
        await createAgreement(projectId, payload, { name: authorName, side: mode });
      }
      closeDialog();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Nie udało się zapisać ustalenia.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(id: string) {
    await submitForClient(projectId, id, authorName);
    await refreshLocalAgreements();
  }

  async function handleRefreshAgreements() {
    await handleCollaborationChanged();
  }

  async function handleCancel(id: string) {
    await cancel(projectId, id);
    await refreshLocalAgreements();
  }

  async function handleRespond(
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) {
    const updated = await respond(projectId, id, input);
    if (input.accepted && updated.category === "warranty" && updated.proposedWarrantyEndDate) {
      await onWarrantyExtensionAccepted?.(updated.proposedWarrantyEndDate);
    }
    await refreshLocalAgreements();
  }

  async function handleDelete(id: string) {
    const existing = agreements.find((entry) => entry.id === id);
    if (
      existing &&
      (existing.status === "accepted" || existing.status === "rejected") &&
      !window.confirm("To ustalenie ma już odpowiedź klienta. Na pewno usunąć?")
    ) {
      return;
    }

    if (existing?.status === "draft") {
      await removeDraft(projectId, id);
    } else {
      await removeAgreement(projectId, id);
    }
  }

  const isLoading = loading && agreements.length === 0;

  const visibleFilters: FilterKey[] =
    mode === "client"
      ? ["pending_client", "accepted", "rejected", "all"]
      : ["all", "draft", "pending_client", "accepted", "rejected"];

  const defaultFilter: FilterKey = mode === "client" ? "pending_client" : "all";
  const activeFilterCount = filter !== defaultFilter ? 1 : 0;

  const emptyMessage =
    mode === "client"
      ? ({
          pending_client: "Brak ustaleń oczekujących na Twoją decyzję.",
          accepted: "Brak zaakceptowanych ustaleń.",
          rejected: "Brak odrzuconych ustaleń.",
          all: "Brak ustaleń w tym projekcie.",
          draft: "Brak szkiców.",
          cancelled: "Brak anulowanych ustaleń.",
        } satisfies Record<FilterKey, string>)[filter]
      : filter === "all"
        ? "Brak ustaleń w tym widoku. Dodaj ustalenie i wyślij je do akceptacji klienta."
        : `Brak ustaleń ze statusem „${filterLabels[filter]}”.`;

  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-x-hidden">
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
        {mode === "team" || publicDashboardToken ? (
          <Button type="button" size="sm" className="w-full shrink-0 sm:w-auto" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nowe ustalenie
          </Button>
        ) : null}
      </div>

      {isLoading && !agreements.length ? (
        <p className="text-sm text-muted">Ładowanie ustaleń…</p>
      ) : null}

      {!isLoading && filtered.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : null}

      <div className="grid gap-3">
        {filtered.map((agreement) => (
          <AgreementCard
            key={agreement.id}
            agreement={agreement}
            mode={mode}
            authorName={authorName}
            projectTrades={projectTrades}
            clientEmail={projectClient?.email}
            clientName={projectClient?.fullName}
            onSubmit={(id) => handleSubmit(id)}
            onCancel={(id) => handleCancel(id)}
            onRespond={(id, input) => handleRespond(id, input)}
            onDelete={(id) => handleDelete(id)}
            onEdit={mode === "team" ? (entry) => void openEditDialog(entry) : undefined}
            onRefresh={handleRefreshAgreements}
            onWarrantyExtensionAccepted={onWarrantyExtensionAccepted}
            defaultExpanded={agreement.id === focusAgreementId}
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
            <DialogTitle>{editingId ? "Edytuj ustalenie" : "Nowe ustalenie"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Zmiany w oczekującym ustaleniu zobaczy klient przy następnym wejściu na dashboard."
                : "Opisz ustalenie (integracja, urządzenie, zmiana). Po zapisaniu wyślij je do akceptacji klienta."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Tytuł">
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="np. Klimatyzacja — model i sposób integracji"
              />
            </Field>
            <Field label="Kategoria">
              <select
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                value={form.category}
                disabled={form.category === "warranty"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as ProjectAgreementCategory,
                  }))
                }
              >
                {(form.category === "warranty"
                  ? PROJECT_AGREEMENT_CATEGORIES
                  : PROJECT_AGREEMENT_CATEGORIES.filter((category) => category !== "warranty")
                ).map((category) => (
                  <option key={category} value={category}>
                    {PROJECT_AGREEMENT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </Field>
            {form.category === "warranty" ? (
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
            ) : null}
            <Field label="Opis ustaleń">
              <Textarea
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                rows={4}
                placeholder="Szczegóły: np. sonda hydrostatyczna zamiast pływaka, odpowiedzialność serwisowa…"
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, costNote: event.target.value }))
                }
                placeholder="np. wycena orientacyjna, do potwierdzenia po pomiarach"
              />
            </Field>

            {communicationProtocolOptions.length > 0 ? (
              <div className="rounded-xl border border-border/70 bg-surface-muted/10 p-3">
                <p className="text-sm font-medium text-foreground">Protokoły komunikacyjne (opcjonalnie)</p>
                <p className="mb-2 text-xs text-muted">
                  Zaznacz protokoły, których dotyczy to ustalenie — lista w Ustawienia → Katalogi.
                </p>
                <div className="flex flex-wrap gap-2">
                  {communicationProtocolOptions.map((protocol) => {
                    const selected = (form.communicationProtocols ?? []).includes(protocol);
                    return (
                      <label
                        key={protocol}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          selected
                            ? "border-accent/50 bg-accent/10 text-foreground"
                            : "border-border/70 text-muted hover:border-accent/30",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected}
                          onChange={() =>
                            setForm((current) => {
                              const currentProtocols = current.communicationProtocols ?? [];
                              return {
                                ...current,
                                communicationProtocols: selected
                                  ? currentProtocols.filter((item) => item !== protocol)
                                  : [...currentProtocols, protocol],
                              };
                            })
                          }
                        />
                        {protocol}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-border/70 bg-surface-muted/10 p-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.publicEnabled ?? false}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, publicEnabled: event.target.checked }))
                  }
                />
                Włącz publiczny link (klient, podwykonawcy)
              </label>
              {editingId && form.publicEnabled ? (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Link2 className="h-3.5 w-3.5" />
                  {(() => {
                    const agreement = agreements.find((entry) => entry.id === editingId);
                    const url = agreement?.publicToken ? getAgreementPublicUrl(agreement.publicToken) : "";
                    return url ? (
                      <>
                        <span className="break-all">{url}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void navigator.clipboard.writeText(url)}
                        >
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          Kopiuj
                        </Button>
                      </>
                    ) : (
                      "Link będzie dostępny po zapisaniu."
                    );
                  })()}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
              <p className="text-sm font-medium text-foreground">Role wymagane do akceptacji</p>
              <p className="text-xs text-muted">
                Każde ustalenie wymaga akceptacji Administratora (zespół) oraz Klienta. Możesz
                dodać kolejne role, np. branże projektu.
              </p>
              {(form.approverRoles ?? []).map((role, index) => (
                <div key={`approver-role-${index}`} className="flex flex-wrap items-start gap-2">
                  <AgreementApproverRoleField
                    role={role}
                    trades={projectTrades}
                    onChange={(patch) =>
                      setForm((current) => ({
                        ...current,
                        approverRoles: updateApproverRole(current.approverRoles ?? [], index, patch),
                      }))
                    }
                    onTradeSelected={(trade) => {
                      const catalogItem = findTradeCatalogItem(trade.name, fieldOptions);
                      if (!catalogItem?.communicationProtocols.length) {
                        return;
                      }
                      setForm((current) => ({
                        ...current,
                        communicationProtocols: [
                          ...new Set([
                            ...(current.communicationProtocols ?? []),
                            ...catalogItem.communicationProtocols,
                          ]),
                        ],
                      }));
                    }}
                  />
                  {!role.isClientRole && !role.isTeamRole ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          approverRoles: (current.approverRoles ?? []).filter(
                            (_, roleIndex) => roleIndex !== index,
                          ),
                        }))
                      }
                    >
                      Usuń
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    approverRoles: [
                      ...(current.approverRoles ?? []),
                      { label: "", isRequired: true, isClientRole: false },
                    ],
                  }))
                }
              >
                Dodaj rolę akceptacji
              </Button>
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
