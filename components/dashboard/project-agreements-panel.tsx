"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Send, Trash2, X } from "lucide-react";
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
  PROJECT_AGREEMENT_CATEGORIES,
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  PROJECT_AGREEMENT_STATUS_LABELS,
  agreementStatusTone,
  formatAgreementCost,
  type ProjectAgreementCategory,
  type ProjectAgreementInput,
  type ProjectAgreementStatus,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import { cn } from "@/lib/utils";
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
    costNote: "",
  };
}

function AgreementCard({
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
  const tone = agreementStatusTone(agreement.status);
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
          {PROJECT_AGREEMENT_STATUS_LABELS[agreement.status]}
        </span>
      </div>

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

      {mode === "team" && agreement.status === "pending_client" ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={busy}
          onClick={() => void run(() => onCancel(agreement.id))}
        >
          Anuluj oczekujące
        </Button>
      ) : null}

      {mode === "client" && agreement.status === "pending_client" ? (
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
    </article>
  );
}

export function ProjectAgreementsPanel({
  projectId,
  mode,
  authorName,
  seedAgreements,
}: {
  projectId: string;
  mode: "team" | "client";
  authorName: string;
  seedAgreements?: ProjectClientAgreement[];
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

  const [localAgreements, setLocalAgreements] = useState<ProjectClientAgreement[] | null>(() =>
    seedAgreements !== undefined ? seedAgreements : null,
  );

  const agreements = seedAgreements !== undefined ? (localAgreements ?? seedAgreements) : storeAgreements;

  const [filter, setFilter] = useState<FilterKey>(mode === "client" ? "pending_client" : "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProjectAgreementInput>(emptyInput());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (seedAgreements !== undefined) {
      setLocalAgreements(seedAgreements);
      return;
    }
    void ensureAgreements(projectId);
  }, [ensureAgreements, projectId, seedAgreements]);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return agreements.filter((entry) => entry.status !== "cancelled" || mode === "team");
    }
    return agreements.filter((entry) => entry.status === filter);
  }, [agreements, filter, mode]);

  const pendingCount = agreements.filter((entry) => entry.status === "pending_client").length;

  async function handleCreate() {
    if (!form.title.trim()) {
      return;
    }
    setSaving(true);
    try {
      await createAgreement(projectId, form, { name: authorName, side: mode });
      setForm(emptyInput());
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(id: string) {
    await submitForClient(projectId, id);
    if (seedAgreements !== undefined) {
      const updated = await ensureAgreements(projectId, { force: true });
      setLocalAgreements(updated);
    }
  }

  async function handleCancel(id: string) {
    await cancel(projectId, id);
    if (seedAgreements !== undefined) {
      const updated = await ensureAgreements(projectId, { force: true });
      setLocalAgreements(updated);
    }
  }

  async function handleRespond(
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) {
    await respond(projectId, id, input);
    if (seedAgreements !== undefined) {
      const updated = await ensureAgreements(projectId, { force: true });
      setLocalAgreements(updated);
    }
  }

  async function handleDelete(id: string) {
    await removeDraft(projectId, id);
    if (seedAgreements !== undefined) {
      setLocalAgreements((current) => (current ?? seedAgreements).filter((entry) => entry.id !== id));
    }
  }

  const isLoading = seedAgreements !== undefined ? false : loading;

  const visibleFilters: FilterKey[] =
    mode === "client"
      ? ["pending_client", "accepted", "rejected", "all"]
      : ["all", "draft", "pending_client", "accepted", "rejected"];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
              {filterLabels[key]}
              {key === "pending_client" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </button>
          ))}
        </div>
        {mode === "team" ? (
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nowe ustalenie
          </Button>
        ) : null}
      </div>

      {isLoading && !agreements.length ? (
        <p className="text-sm text-muted">Ładowanie ustaleń…</p>
      ) : null}

      {!isLoading && filtered.length === 0 ? (
        <p className="text-sm text-muted">
          {mode === "team"
            ? "Brak ustaleń w tym widoku. Dodaj ustalenie i wyślij je do akceptacji klienta."
            : "Brak ustaleń oczekujących na Twoją decyzję."}
        </p>
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
          />
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowe ustalenie</DialogTitle>
            <DialogDescription>
              Opisz ustalenie (integracja, urządzenie, zmiana). Po zapisaniu wyślij je do akceptacji
              klienta.
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
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as ProjectAgreementCategory,
                  }))
                }
              >
                {PROJECT_AGREEMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {PROJECT_AGREEMENT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Opis ustaleń">
              <Textarea
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                rows={4}
                placeholder="Szczegóły: np. sonda hydrostatyczna zamiast pływaka, odpowiedzialność serwisowa…"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Koszt netto (PLN)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.proposedCostNet ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      proposedCostNet: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                />
              </Field>
              <Field label="Koszt brutto (PLN)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.proposedCostGross ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      proposedCostGross: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Notatka do kosztu">
              <Input
                value={form.costNote ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, costNote: event.target.value }))
                }
                placeholder="np. wycena orientacyjna, do potwierdzenia po pomiarach"
              />
            </Field>
            <div className="flex gap-2">
              <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
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
