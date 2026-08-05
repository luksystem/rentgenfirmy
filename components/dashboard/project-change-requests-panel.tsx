"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Link2, ListChecks, Lock, Pencil, Plus, Send, Trash2, Wallet, X } from "lucide-react";
import { AgreementCollapsibleShell } from "@/components/dashboard/agreement-collapsible-shell";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { ChangeRequestBatchDeliveryActions } from "@/components/dashboard/change-request-batch-delivery-actions";
import { OfferEmailPreviewDialog } from "@/components/service/offer-email-preview-dialog";
import { TaskFromSourceDialog } from "@/components/process/task-from-source-dialog";
import {
  fetchSourceTask,
  type SourceTaskSummary,
} from "@/lib/supabase/task-from-source-repository";
import { AgreementAttachmentGallery } from "@/components/dashboard/agreement-attachment-gallery";
import type { AgreementAttachment } from "@/lib/dashboard/agreement-attachment-types";
import {
  fetchChangeRequestAttachments,
  uploadChangeRequestAttachment,
} from "@/lib/supabase/project-change-request-attachments-repository";
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
  getChangeRequestPublicUrl,
  isChangeRequestBlockingActive,
  isChangeRequestPendingAttention,
  normalizeProjectChangeRequestInput,
  type ProjectChangeRequest,
  type ProjectChangeRequestInput,
  type ProjectChangeRequestStatus,
} from "@/lib/dashboard/change-request-types";
import { DEFAULT_AGREEMENT_VAT_RATE, normalizeAgreementVatRate } from "@/lib/dashboard/agreement-cost";
import { mergeChangeRequestsById } from "@/lib/dashboard/merge-change-requests";
import { buildProjectFinancialSummary } from "@/lib/settlements/summary";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import { cn, formatMoney } from "@/lib/utils";
import { useProjectChangeRequestStore } from "@/store/project-change-request-store";
import { useProcessStore } from "@/store/process-store";
import { useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";
import { useProjectSettlementStore } from "@/store/project-settlement-store";

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

type ChangeRequestEmailPreview = { subject: string; html: string; to: string; hasPhoto?: boolean };

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? "Nie udało się wykonać operacji.");
  }
  return data as T;
}

function ChangeRequestCard({
  changeRequest,
  mode,
  authorName,
  projectId,
  clientEmail,
  onSent,
  onRespond,
  onDelete,
  onEdit,
  onMarkHandled,
  defaultExpanded = false,
  blockingStageLabel,
}: {
  changeRequest: ProjectChangeRequest;
  mode: "team" | "client";
  authorName: string;
  projectId: string;
  clientEmail?: string | null;
  onSent?: () => void | Promise<void>;
  onRespond: (
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (entry: ProjectChangeRequest) => void;
  onMarkHandled?: (id: string, reason: string) => Promise<void>;
  defaultExpanded?: boolean;
  blockingStageLabel?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [sourceTask, setSourceTask] = useState<SourceTaskSummary | null>(null);
  const [handledDialogOpen, setHandledDialogOpen] = useState(false);
  const [handledReason, setHandledReason] = useState("");
  const [handledError, setHandledError] = useState<string | null>(null);

  const reloadSourceTask = useCallback(() => {
    void fetchSourceTask({ changeRequestId: changeRequest.id })
      .then(setSourceTask)
      .catch(() => setSourceTask(null));
  }, [changeRequest.id]);

  useEffect(() => {
    reloadSourceTask();
  }, [reloadSourceTask]);
  // D44 — zmiany nie mialy zadnej galerii, wiec zdjecie ze zgloszenia bylo niewidoczne nawet po
  // poprawnym wgraniu. Reuzywamy komponentu ustalen zamiast pisac drugi, prawie taki sam.
  const [attachments, setAttachments] = useState<AgreementAttachment[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadPhotoError, setUploadPhotoError] = useState<string | null>(null);

  const reloadAttachments = useCallback(() => {
    void fetchChangeRequestAttachments(changeRequest.id)
      .then(setAttachments)
      .catch(() => setAttachments([]));
  }, [changeRequest.id]);

  useEffect(() => {
    reloadAttachments();
  }, [reloadAttachments]);
  const [responseNote, setResponseNote] = useState("");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const meta = buildChangeRequestCollapsibleMeta(changeRequest);
  const costLabel = formatChangeRequestCost(changeRequest);
  const isBlocking = isChangeRequestBlockingActive(changeRequest);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<ChangeRequestEmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Zdjecie robocze z budowy nie zawsze nadaje sie do pokazania klientowi — domyslnie wlaczone,
  // jednym kliknieciem odznaczane. Odznaczenie musi przebudowac podglad, bo zdjecie jest wypalone
  // w HTML maila po stronie serwera, nie doklejane po stronie klienta.
  const [includePhoto, setIncludePhoto] = useState(true);

  useEffect(() => {
    if (!defaultExpanded || !cardRef.current) {
      return;
    }
    cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [defaultExpanded, changeRequest.id]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenPreview() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    setPreviewError(null);
    setPreview(null);
    setNote("");
    setIncludePhoto(true);
    setPreviewOpen(true);
    try {
      const data = await postJson<ChangeRequestEmailPreview>(
        `/api/projects/${encodeURIComponent(projectId)}/change-requests/preview-email`,
        { scope: "single", changeRequestId: changeRequest.id, includePhoto: true },
      );
      setPreview(data);
    } catch (loadError) {
      setPreviewError(
        loadError instanceof Error ? loadError.message : "Nie udało się przygotować podglądu.",
      );
    }
  }

  function handleNoteChange(nextNote: string) {
    setNote(nextNote);
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    noteDebounceRef.current = setTimeout(() => {
      void postJson<ChangeRequestEmailPreview>(
        `/api/projects/${encodeURIComponent(projectId)}/change-requests/preview-email`,
        { scope: "single", changeRequestId: changeRequest.id, note: nextNote, includePhoto },
      )
        .then((data) => setPreview(data))
        .catch(() => undefined);
    }, 600);
  }

  function handleIncludePhotoChange(next: boolean) {
    setIncludePhoto(next);
    void postJson<ChangeRequestEmailPreview>(
      `/api/projects/${encodeURIComponent(projectId)}/change-requests/preview-email`,
      { scope: "single", changeRequestId: changeRequest.id, note, includePhoto: next },
    )
      .then((data) => setPreview(data))
      .catch(() => undefined);
  }

  async function handleConfirmSend() {
    setSending(true);
    setPreviewError(null);
    try {
      const data = await postJson<{ emailSkipped?: boolean }>(
        `/api/projects/${encodeURIComponent(projectId)}/change-requests/send-email`,
        { scope: "single", changeRequestId: changeRequest.id, note, includePhoto },
      );
      setPreviewOpen(false);
      await onSent?.();
      if (data.emailSkipped) {
        window.alert(
          "Zmiana została zgłoszona do klienta, ale e-mail nie został wysłany (brak konfiguracji RESEND_API_KEY). Skopiuj link i wyślij ręcznie.",
        );
      }
    } catch (sendError) {
      setPreviewError(sendError instanceof Error ? sendError.message : "Nie udało się wysłać maila.");
    } finally {
      setSending(false);
    }
  }

  async function handleConfirmMarkHandled() {
    if (!handledReason.trim()) {
      setHandledError("Podaj krótki powód — trafi do osoby, która to zgłosiła.");
      return;
    }
    setBusy(true);
    try {
      await onMarkHandled?.(changeRequest.id, handledReason.trim());
      setHandledDialogOpen(false);
      setHandledReason("");
      setHandledError(null);
    } catch (error) {
      setHandledError(error instanceof Error ? error.message : "Nie udało się zapisać.");
    } finally {
      setBusy(false);
    }
  }

  const taskAction =
    mode === "team" && !sourceTask ? (
      <>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => setTaskDialogOpen(true)}
        >
          <ListChecks className="mr-2 h-3.5 w-3.5" />
          Utwórz zadanie
        </Button>
        {onMarkHandled && !changeRequest.completedAt ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => {
              setHandledError(null);
              setHandledReason("");
              setHandledDialogOpen(true);
            }}
          >
            <Check className="mr-2 h-3.5 w-3.5" />
            Ogarnięte
          </Button>
        ) : null}
      </>
    ) : null;

  return (
    <div ref={cardRef} className="min-w-0 max-w-full">
      <AgreementCollapsibleShell
        title={meta.title}
        subtitle={meta.subtitle}
        statusLabel={meta.statusLabel}
        statusTone={meta.statusTone}
        defaultExpanded={defaultExpanded}
        className="min-w-0"
        banner={
          isBlocking ? (
            <div className="flex min-w-0 items-start gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                {blockingStageLabel
                  ? `Blokuje etap „${blockingStageLabel}” do czasu akceptacji`
                  : "Blokuje kolejny etap procesu do czasu akceptacji"}
              </span>
            </div>
          ) : null
        }
      >
        {changeRequest.body ? (
          <p
            className={cn(
              "max-h-40 overflow-y-auto break-words whitespace-pre-wrap text-sm text-muted sm:max-h-none sm:overflow-visible",
              changeRequest.completedAt && "line-through opacity-70",
            )}
          >
            {changeRequest.body}
          </p>
        ) : null}

        {changeRequest.completedAt ? (
          <p className="break-words rounded-lg border border-border/60 bg-surface-muted/20 px-3 py-2 text-xs text-muted">
            Ogarnięte {new Date(changeRequest.completedAt).toLocaleString("pl-PL")}
            {changeRequest.completionNote ? (
              <>
                {" "}
                — <span className="text-foreground">{changeRequest.completionNote}</span>
              </>
            ) : null}
          </p>
        ) : null}

        {costLabel ? (
          <p className="break-words text-sm font-medium text-foreground">Koszt: {costLabel}</p>
        ) : null}
        {changeRequest.costNote && costLabel !== changeRequest.costNote ? (
          <p className="break-words text-xs text-muted">{changeRequest.costNote}</p>
        ) : null}

        {changeRequest.submittedAt ? (
          <p className="break-words text-xs text-muted">
            Wysłano do klienta: {new Date(changeRequest.submittedAt).toLocaleString("pl-PL")}
          </p>
        ) : null}

        {changeRequest.clientResponseNote ? (
          <p className="break-words text-sm text-foreground">
            Odpowiedź klienta: <span className="text-muted">{changeRequest.clientResponseNote}</span>
          </p>
        ) : null}

        {mode === "team" && changeRequest.status === "draft" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={busy || !clientEmail?.trim()}
              title={!clientEmail?.trim() ? "Uzupełnij e-mail klienta w danych projektu." : undefined}
              onClick={() => void handleOpenPreview()}
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
            {taskAction}
          </div>
        ) : null}

        {mode === "team" && changeRequest.status === "pending_client" ? (
          <div className="grid gap-3">
            {changeRequest.publicToken && changeRequest.publicEnabled ? (
              <div className="min-w-0 rounded-xl border border-dashed border-border/80 bg-surface-muted/15 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  Publiczny link dla klienta
                </p>
                <p className="mb-2 text-[11px] leading-relaxed text-muted">
                  Wyślij klientowi, jeśli nie korzysta z aplikacji. Po akceptacji lub odrzuceniu link
                  wygasa.
                </p>
                <div className="grid min-w-0 gap-2">
                  <code className="block max-w-full break-all rounded-lg border border-border/60 bg-surface px-2 py-1.5 text-[11px] leading-snug text-foreground">
                    {getChangeRequestPublicUrl(changeRequest.publicToken)}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => {
                      const url = getChangeRequestPublicUrl(changeRequest.publicToken!);
                      void navigator.clipboard.writeText(url).then(
                        () => window.alert("Skopiowano link do schowka."),
                        () => window.prompt("Skopiuj link:", url),
                      );
                    }}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Kopiuj link
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">
                Publiczny link będzie dostępny po wysłaniu zmiany do klienta.
              </p>
            )}
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
                onClick={() =>
                  void run(() =>
                    onRespond(changeRequest.id, {
                      accepted: true,
                      clientResponseName: authorName,
                    }),
                  )
                }
              >
                <Check className="mr-2 h-3.5 w-3.5" />
                Oznacz jako zaakceptowane
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
              {taskAction}
            </div>
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
            {taskAction}
          </div>
        ) : null}

        {attachments.length > 0 || mode === "team" ? (
          <AgreementAttachmentGallery
            attachments={attachments}
            allowUpload={mode === "team"}
            uploading={uploadingPhoto}
            uploadError={uploadPhotoError}
            onUpload={async (file) => {
              setUploadingPhoto(true);
              setUploadPhotoError(null);
              try {
                await uploadChangeRequestAttachment({
                  changeRequestId: changeRequest.id,
                  file,
                  authorName,
                  authorSource: "team",
                });
                reloadAttachments();
              } catch (uploadError) {
                setUploadPhotoError(
                  uploadError instanceof Error ? uploadError.message : "Nie udało się wgrać pliku.",
                );
              } finally {
                setUploadingPhoto(false);
              }
            }}
          />
        ) : null}

        {mode === "team" && sourceTask ? (
          // Jedno zrodlo = jedno zadanie. Dwa zadania z jednego ustalenia rozjechalyby
          // synchronizacje completed_at: zamkniecie jednego oznaczyloby rzecz jako wykonana,
          // choc drugie wciaz trwa. Wiele prac rozwiazuja PODZADANIA na karcie.
          <p className="rounded-lg border border-border/60 bg-surface/30 px-3 py-2 text-xs text-muted">
            Zadanie zostało już utworzone:{" "}
            <strong className="text-foreground">{sourceTask.title}</strong>
            {sourceTask.columnTitle ? ` — kolumna „${sourceTask.columnTitle}”` : ""}
            {sourceTask.closedAt ? " · zamknięte" : ""}
            <span className="mt-1 block">
              Kolejne prace dodaj jako podzadania na tej karcie, nie jako osobne zadanie.
            </span>
          </p>
        ) : null}
        {mode === "team" ? (
          <TaskFromSourceDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            projectId={projectId}
            authorName={authorName}
            defaultTitle={changeRequest.title}
            defaultDescription={changeRequest.body ?? ""}
            sourceChangeRequestId={changeRequest.id}
            onCreated={reloadSourceTask}
          />
        ) : null}
        {mode === "team" ? (
          <Dialog open={handledDialogOpen} onOpenChange={setHandledDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Oznacz jako ogarnięte</DialogTitle>
                <DialogDescription>
                  Zmiana zostaje w obecnym statusie — to nie jest anulowanie ani odrzucenie, tylko
                  informacja, że sprawa jest zamknięta bez udziału klienta. Powód wraca do osoby,
                  która to zgłosiła.
                </DialogDescription>
              </DialogHeader>
              <Field label="Powód (jedno zdanie)">
                <Textarea
                  value={handledReason}
                  onChange={(event) => {
                    setHandledReason(event.target.value);
                    if (handledError) setHandledError(null);
                  }}
                  rows={2}
                  placeholder="Np. Nieistotne, wykonane w ramach naszego zakresu."
                />
              </Field>
              {handledError ? <p className="text-xs text-rose-400">{handledError}</p> : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => setHandledDialogOpen(false)}
                >
                  Anuluj
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={busy || !handledReason.trim()}
                  onClick={() => void handleConfirmMarkHandled()}
                >
                  Potwierdź
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
        {mode === "client" && changeRequest.status === "pending_client" ? (
          <div className="grid min-w-0 gap-2">
            <Field label="Uwagi (opcjonalnie)" className="min-w-0">
              <Textarea
                value={responseNote}
                onChange={(event) => setResponseNote(event.target.value)}
                rows={2}
                placeholder="Komentarz do decyzji…"
                className="max-w-full"
              />
            </Field>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto"
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
                className="w-full sm:w-auto"
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
      <OfferEmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        sending={sending}
        error={previewError}
        note={note}
        onNoteChange={handleNoteChange}
        onConfirmSend={() => void handleConfirmSend()}
        selection={
          preview?.hasPhoto ? (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={includePhoto}
                disabled={sending}
                onChange={(event) => handleIncludePhotoChange(event.target.checked)}
              />
              Dołącz zdjęcie ze zmiany do treści maila
            </label>
          ) : undefined
        }
      />
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
  const respond = useProjectChangeRequestStore((state) => state.respond);
  const removeDraft = useProjectChangeRequestStore((state) => state.removeDraft);
  const removeChangeRequest = useProjectChangeRequestStore((state) => state.removeChangeRequest);
  const updateChangeRequest = useProjectChangeRequestStore((state) => state.updateChangeRequest);
  const updateDraft = useProjectChangeRequestStore((state) => state.updateDraft);
  const markHandled = useProjectChangeRequestStore((state) => state.markHandled);

  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const currentProject = useMemo(() => projects.find((entry) => entry.id === projectId), [projects, projectId]);
  const projectClient = useMemo(() => {
    if (!currentProject?.clientId) {
      return null;
    }
    return clients.find((entry) => entry.id === currentProject.clientId) ?? null;
  }, [clients, currentProject]);

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
  const settlementEntries = useProjectSettlementStore(
    (state) => state.byProject[projectId]?.entries,
  );
  const projectServices = useMemo(
    () => allServices.filter((service) => service.projectId === projectId),
    [allServices, projectId],
  );

  const changeRequests = useMemo(
    () => mergeChangeRequestsById(storeChangeRequests, seedChangeRequests),
    [storeChangeRequests, seedChangeRequests],
  );

  const costSummary = useMemo(() => {
    const summary = buildProjectFinancialSummary(
      mode === "team" ? projectServices : [],
      changeRequests,
      settlementEntries,
    );
    if (mode !== "team") {
      return {
        ...summary,
        offersNetTotal: seedOffersGrossTotal ?? summary.offersNetTotal,
        offersGrossTotal: seedOffersGrossTotal ?? summary.offersGrossTotal,
        acceptedOffersCount: seedAcceptedOffersCount ?? summary.acceptedOffersCount,
        totalNet: summary.hasSettlementLedger
          ? summary.chargesNet
          : (seedOffersGrossTotal ?? 0) + summary.changeRequestsNetTotal,
        totalGross: summary.hasSettlementLedger
          ? summary.chargesNet
          : (seedOffersGrossTotal ?? 0) + summary.changeRequestsNetTotal,
      };
    }
    return summary;
  }, [
    changeRequests,
    mode,
    projectServices,
    seedAcceptedOffersCount,
    seedOffersGrossTotal,
    settlementEntries,
  ]);

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
  // Zdjecie dodawane juz przy tworzeniu, nie dopiero po zapisie — czlowiek stoi przed problemem
  // i ma zdjecie pod reka od razu (ten sam wzorzec co employee-report-dialog.tsx).
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = newPhotos.map((file) => URL.createObjectURL(file));
    setNewPhotoPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newPhotos]);

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
    setNewPhotos([]);
    setDialogOpen(true);
  }

  function openEditDialog(entry: ProjectChangeRequest) {
    setEditingId(entry.id);
    setSaveError(null);
    setForm(changeRequestToInput(entry));
    setNewPhotos([]);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyInput());
    setSaveError(null);
    setNewPhotos([]);
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
        const created = await createChangeRequest(projectId, payload, { name: authorName, side: mode });
        if (newPhotos.length) {
          let uploaded = 0;
          let lastPhotoError: string | null = null;
          for (const file of newPhotos) {
            try {
              await uploadChangeRequestAttachment({
                changeRequestId: created.id,
                file,
                authorName,
                authorSource: mode,
              });
              uploaded += 1;
            } catch (uploadError) {
              lastPhotoError = uploadError instanceof Error ? uploadError.message : "Nieznany błąd.";
            }
          }
          if (uploaded < newPhotos.length) {
            window.alert(
              `Zmiana zapisana, ale wgrało się ${uploaded} z ${newPhotos.length} zdjęć: ${lastPhotoError}. Resztę dodaj później w galerii.`,
            );
          }
        }
      }
      closeDialog();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Nie udało się zapisać zmiany.");
    } finally {
      setSaving(false);
    }
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

  async function handleMarkHandled(id: string, reason: string) {
    await markHandled(projectId, id, reason);
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
      <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-xs text-muted">Koszt bazowy ofert (netto)</p>
            <p className="text-sm font-semibold text-foreground">
              {formatMoney(costSummary.offersNetTotal)}
            </p>
            <p className="text-[11px] text-muted">{costSummary.acceptedOffersCount} ofert</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="text-xs text-muted">Zmiany zaakceptowane (netto)</p>
            <p className="text-sm font-semibold text-foreground">
              {formatMoney(costSummary.changeRequestsNetTotal)}
            </p>
            <p className="text-[11px] text-muted">{costSummary.acceptedChangeRequestsCount} zmian</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-xs text-muted">Czeka na akceptację (netto)</p>
            <p className="text-sm font-semibold text-foreground">
              {formatMoney(costSummary.pendingChangeRequestsNetTotal)}
            </p>
            <p className="text-[11px] text-muted">
              {costSummary.pendingChangeRequestsCount}{" "}
              {costSummary.pendingChangeRequestsCount === 1 ? "zmiana" : "zmian"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-xs text-muted">
              {costSummary.hasSettlementLedger
                ? "Do zapłaty — rozliczenia (netto)"
                : "Razem koszt projektu (netto)"}
            </p>
            <p className="text-base font-bold text-foreground">{formatMoney(costSummary.totalNet)}</p>
            {costSummary.pendingChangeRequestsNetTotal > 0 ? (
              <p className="text-[11px] text-amber-200/90">
                + {formatMoney(costSummary.pendingChangeRequestsNetTotal)} netto poza saldem
              </p>
            ) : null}
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

      {mode === "team" ? (
        <ChangeRequestBatchDeliveryActions
          projectId={projectId}
          changeRequests={changeRequests}
          clientEmail={projectClient?.email}
          onSent={refreshLocal}
        />
      ) : null}

      <div className="grid min-w-0 max-w-full gap-3">
        {filtered.map((entry) => (
          <ChangeRequestCard
            key={entry.id}
            changeRequest={entry}
            mode={mode}
            authorName={authorName}
            projectId={projectId}
            clientEmail={projectClient?.email}
            onSent={refreshLocal}
            onRespond={(id, input) => handleRespond(id, input)}
            onDelete={(id) => handleDelete(id)}
            onEdit={mode === "team" ? (item) => openEditDialog(item) : undefined}
            onMarkHandled={mode === "team" ? (id, reason) => handleMarkHandled(id, reason) : undefined}
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

            {!editingId ? (
              <Field label="Zdjęcie (opcjonalnie)">
                <div className="grid gap-2">
                  {newPhotoPreviews.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {newPhotoPreviews.map((url, index) => (
                        <div
                          key={url}
                          className="relative aspect-square overflow-hidden rounded-lg border border-border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Zdjęcie ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            aria-label="Usuń zdjęcie"
                            onClick={() => setNewPhotos((current) => current.filter((_, i) => i !== index))}
                            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-muted/30 px-4 py-4 text-sm text-muted hover:border-accent/40">
                    <Plus className="h-4 w-4" />
                    {newPhotos.length ? `Dodaj kolejne (${newPhotos.length})` : "Dodaj zdjęcie"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        const picked = event.target.files ? Array.from(event.target.files) : [];
                        event.target.value = "";
                        if (picked.length) {
                          setNewPhotos((current) => [...current, ...picked]);
                        }
                      }}
                    />
                  </label>
                </div>
              </Field>
            ) : null}

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
