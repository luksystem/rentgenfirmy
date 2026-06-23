"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { AgreementCollaborationPanel } from "@/components/dashboard/agreement-collaboration-panel";
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
  agreementStatusTone,
  formatAgreementCost,
  getAgreementStatusLabel,
  getAgreementStatusTone,
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
  type AgreementApproverRoleInput,
} from "@/lib/dashboard/agreement-collaboration-types";
import { fetchAgreementApproverRoles } from "@/lib/supabase/project-agreement-collaboration-repository";
import { cn, formatDate } from "@/lib/utils";
import { useProjectAgreementStore } from "@/store/project-agreement-store";

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

const statusBadgeClass: Record<ReturnType<typeof agreementStatusTone>, string> = {
  neutral: "border-border/80 bg-surface-muted/40 text-muted",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-200",
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
    approverRoles: [{ label: "Klient", isRequired: true, isClientRole: true }],
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
    approverRoles: [{ label: "Klient", isRequired: true, isClientRole: true }],
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
  return (roles ?? []).filter((role) => role.isClientRole || role.label.trim().length > 0);
}

function hasIncompleteApproverRole(roles: AgreementApproverRoleInput[] | undefined) {
  return (roles ?? []).some((role) => !role.isClientRole && !role.label.trim());
}

function canEditAgreementContent(agreement: ProjectClientAgreement) {
  return ["draft", "pending_client", "rejected"].includes(agreement.status);
}

function AgreementCard({
  agreement,
  mode,
  authorName,
  onSubmit,
  onCancel,
  onRespond,
  onDelete,
  onEdit,
  onRefresh,
  onWarrantyExtensionAccepted,
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
  onEdit?: (agreement: ProjectClientAgreement) => void;
  onRefresh?: () => void | Promise<void>;
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const tone = getAgreementStatusTone(agreement);
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
    <article className="rounded-xl border border-border/70 bg-surface-muted/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{agreement.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {PROJECT_AGREEMENT_CATEGORY_LABELS[agreement.category]} · {agreement.createdByName}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            statusBadgeClass[tone],
          )}
        >
          {getAgreementStatusLabel(agreement)}
        </span>
      </div>

      {agreement.category === "warranty" && agreement.proposedWarrantyEndDate ? (
        <p className="mt-3 text-sm text-foreground">
          Nowa data zakończenia gwarancji:{" "}
          <span className="font-medium">{formatDate(agreement.proposedWarrantyEndDate)}</span>
        </p>
      ) : null}

      {agreement.body ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{agreement.body}</p>
      ) : null}

      {costLabel ? <p className="mt-2 text-sm font-medium text-foreground">Koszt: {costLabel}</p> : null}
      {agreement.costNote && costLabel !== agreement.costNote ? (
        <p className="mt-1 text-xs text-muted">{agreement.costNote}</p>
      ) : null}

      {agreement.submittedAt ? (
        <p className="mt-2 text-xs text-muted">
          Wysłano do klienta: {new Date(agreement.submittedAt).toLocaleString("pl-PL")}
        </p>
      ) : null}

      {agreement.clientRespondedAt ? (
        <p className="mt-1 text-xs text-muted">
          Odpowiedź ({agreement.clientResponseName}):{" "}
          {new Date(agreement.clientRespondedAt).toLocaleString("pl-PL")}
          {agreement.clientResponseNote ? ` — ${agreement.clientResponseNote}` : ""}
        </p>
      ) : null}

      {mode === "team" && agreement.status === "draft" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
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
            disabled={busy}
            onClick={() => void run(() => onDelete(agreement.id))}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Usuń
          </Button>
        </div>
      ) : null}

      {mode === "team" && agreement.status === "pending_client" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {onEdit ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
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
            disabled={busy}
            onClick={() => void run(() => onCancel(agreement.id))}
          >
            Anuluj oczekujące
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
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
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void run(() => onDelete(agreement.id))}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Usuń
          </Button>
        </div>
      ) : null}

      {mode === "client" && agreement.status === "pending_client" && !agreement.activeVersionId ? (
        <div className="mt-3 grid gap-2">
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

      {agreement.status !== "cancelled" &&
      (agreement.discussionOpen ||
        agreement.status === "pending_client" ||
        agreement.activeVersionId ||
        (mode === "team" && ["draft", "rejected"].includes(agreement.status))) ? (
        <AgreementCollaborationPanel
          agreementId={agreement.id}
          mode={mode}
          authorName={authorName}
          onChanged={onRefresh}
          onWarrantyExtensionAccepted={onWarrantyExtensionAccepted}
        />
      ) : null}

      {mode === "team" && agreement.publicEnabled && agreement.publicToken ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link2 className="h-3.5 w-3.5 text-accent" />
          Link publiczny:
          <a
            href={getAgreementPublicUrl(agreement.publicToken)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {getAgreementPublicUrl(agreement.publicToken)}
          </a>
        </p>
      ) : null}
    </article>
  );
}

export function ProjectAgreementsPanel({
  projectId,
  mode,
  authorName,
  seedAgreements,
  onWarrantyExtensionAccepted,
}: {
  projectId: string;
  mode: "team" | "client";
  authorName: string;
  seedAgreements?: ProjectClientAgreement[];
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
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

  const agreements =
    storeAgreements.length > 0 ? storeAgreements : (seedAgreements ?? storeAgreements);

  const [filter, setFilter] = useState<FilterKey>(mode === "client" ? "pending_client" : "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectAgreementInput>(emptyInput());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void ensureAgreements(projectId);
  }, [ensureAgreements, projectId]);

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
    await ensureAgreements(projectId, { force: true });
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
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MobileFiltersPanel
          activeCount={activeFilterCount}
          onClear={() => setFilter(defaultFilter)}
          title="Status"
          className="min-w-0 flex-1"
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
          <Button type="button" size="sm" onClick={openCreateDialog}>
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
            onSubmit={(id) => handleSubmit(id)}
            onCancel={(id) => handleCancel(id)}
            onRespond={(id, input) => handleRespond(id, input)}
            onDelete={(id) => handleDelete(id)}
            onEdit={mode === "team" ? (entry) => void openEditDialog(entry) : undefined}
            onRefresh={handleRefreshAgreements}
            onWarrantyExtensionAccepted={onWarrantyExtensionAccepted}
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
              {(form.approverRoles ?? []).map((role, index) => (
                <div key={`approver-role-${index}`} className="flex flex-wrap items-center gap-2">
                  <Input
                    value={role.label}
                    disabled={role.isClientRole}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        approverRoles: updateApproverRole(current.approverRoles ?? [], index, {
                          label: event.target.value,
                        }),
                      }))
                    }
                    placeholder="np. Firma od klimatyzacji"
                    className="min-w-[180px] flex-1"
                  />
                  {!role.isClientRole ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
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

            <div className="flex gap-2">
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {editingId ? "Zapisz zmiany" : "Zapisz szkic"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeDialog}>
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
