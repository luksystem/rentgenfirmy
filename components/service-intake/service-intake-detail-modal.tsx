"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coffee, ExternalLink, Loader2, Navigation, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, StackedDialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { buildGoogleMapsDirectionsUrl } from "@/lib/dashboard/google-maps";
import { confirmServiceIntakeStatusChange, confirmServiceIntakeTakeover } from "@/lib/service-intake/confirm-status-change";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { createUserMentionNotifications } from "@/lib/notifications/repository";
import { useMentionOptionsFromProfiles } from "@/hooks/use-team-mention-options";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import { CAFE_PRIORITY_OPTIONS } from "@/lib/service-intake/cafe-priorities";
import {
  canDeleteServiceIntake,
  canManageServiceIntakeBoard,
  serviceIntakePrimaryAction,
} from "@/lib/service-intake/status-permissions";
import {
  SERVICE_INTAKE_KANBAN_COLUMNS,
  SERVICE_INTAKE_STATUS_BADGE_CLASS,
  SERVICE_INTAKE_STATUS_TONE,
  isServiceIntakeOverdue,
  resolveServiceIntakeDueAt,
} from "@/lib/service-intake/sla";
import { useAuthStore } from "@/store/auth-store";
import {
  SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS,
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_REQUEST_TYPE_LABELS,
  SERVICE_INTAKE_WORK_PREFERENCE_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeAttachment,
  type ServiceIntakeComment,
  type ServiceIntakeRecord,
  type ServiceIntakeSettlementFeedback,
  type ServiceIntakeStatus,
  type ServiceIntakeStuckFeedback,
  type ServiceIntakeThread,
} from "@/lib/service-intake/types";
import { serviceIntakeAttachmentLabel } from "@/lib/service-intake/attachment-display";
import { buildServiceIntakeOfferHref } from "@/lib/service-intake/offer-link";
import { cn, formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { ServiceIntakeSettlementDialog } from "@/components/service-intake/service-intake-settlement-dialog";
import { ServiceIntakeStuckDialog } from "@/components/service-intake/service-intake-stuck-dialog";

function dueAtToDateInputValue(dueAt: string | null) {
  if (!dueAt) {
    return "";
  }
  return dueAt.slice(0, 10);
}

function dateInputValueToDueAt(value: string) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day, 23, 59, 59).toISOString();
}

function cafeOption(priority: ServiceIntakeRecord["priority"]) {
  if (!priority) {
    return null;
  }
  return CAFE_PRIORITY_OPTIONS.find((entry) => entry.id === priority) ?? null;
}

function AttachmentList({ attachments }: { attachments: ServiceIntakeAttachment[] }) {
  if (!attachments.length) {
    return <p className="text-sm text-muted">Brak załączników.</p>;
  }

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-surface-muted/15 p-3 text-sm hover:border-accent/30"
        >
          <p className="truncate font-medium text-foreground">
            {serviceIntakeAttachmentLabel(attachment)}
          </p>
          <p className="mt-1 text-xs text-muted">Otwórz w nowej karcie</p>
        </a>
      ))}
    </div>
  );
}

function CommentThread({ comments }: { comments: ServiceIntakeComment[] }) {
  if (!comments.length) {
    return <p className="text-sm text-muted">Brak wiadomości w wątku.</p>;
  }

  return (
    <div className="grid gap-2">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm",
            comment.authorSide === "team"
              ? "border-accent/30 bg-accent/10"
              : "border-border/70 bg-surface-muted/15",
          )}
        >
          <p className="text-xs text-muted">
            {comment.authorName} · {formatDateTime(comment.createdAt)}
          </p>
          <p className="mt-1 break-words whitespace-pre-wrap text-foreground">{comment.body}</p>
        </article>
      ))}
    </div>
  );
}

export function ServiceIntakeDetailModal({
  intakeId,
  authorName,
  teamProfiles,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  intakeId: string | null;
  authorName: string;
  teamProfiles: UserProfile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (item: ServiceIntakeRecord) => void;
  onDeleted?: (id: string) => void;
}) {
  const [thread, setThread] = useState<ServiceIntakeThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<ServiceIntakeStatus>("new");
  const [dueAtDraft, setDueAtDraft] = useState("");
  const [assigneeIdDraft, setAssigneeIdDraft] = useState("");
  const [involvedDraft, setInvolvedDraft] = useState<string[]>([]);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);
  const profile = useAuthStore((state) => state.profile);
  const canManageBoard = canManageServiceIntakeBoard(profile?.role);
  const canDelete = canDeleteServiceIntake(profile?.role);
  const { candidates, mentionOptions } = useMentionOptionsFromProfiles(teamProfiles);

  const loadThread = useCallback(async () => {
    if (!intakeId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać zgłoszenia.");
      }
      setThread(payload as ServiceIntakeThread);
      const loaded = payload as ServiceIntakeThread;
      setStatusDraft(loaded.intake.status);
      setDueAtDraft(dueAtToDateInputValue(resolveServiceIntakeDueAt(loaded.intake)));
      setAssigneeIdDraft(loaded.intake.assigneeId ?? "");
      setInvolvedDraft(loaded.intake.involvedProfileIds ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }, [intakeId]);

  useEffect(() => {
    if (open && intakeId) {
      void loadThread();
    } else if (!open) {
      setThread(null);
      setCommentDraft("");
      setError(null);
    }
  }, [intakeId, loadThread, open]);

  const intake = thread?.intake ?? null;
  const cafe = useMemo(() => cafeOption(intake?.priority ?? null), [intake?.priority]);
  const overdue = intake ? isServiceIntakeOverdue(intake) : false;
  const dueAt = intake ? resolveServiceIntakeDueAt(intake) : null;
  const dueAtChanged = intake ? dueAtDraft !== dueAtToDateInputValue(dueAt) : false;
  const assigneeChanged = intake
    ? assigneeIdDraft !== (intake.assigneeId ?? "")
    : false;
  const involvedChanged = intake
    ? [...involvedDraft].sort().join("|") !==
      [...(intake.involvedProfileIds ?? [])].sort().join("|")
    : false;

  async function saveAssignee() {
    if (!intakeId || !intake) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: assigneeIdDraft || null }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać osoby do obsługi.");
      }
      const updated = {
        ...intake,
        ...(payload.item as ServiceIntakeRecord),
        clientName: intake.clientName,
        projectName: intake.projectName,
      };
      setThread((current) => (current ? { ...current, intake: updated } : current));
      setAssigneeIdDraft(updated.assigneeId ?? "");
      onUpdated?.(updated);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function saveInvolved() {
    if (!intakeId || !intake) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ involvedProfileIds: involvedDraft }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać zaangażowanych.");
      }
      const updated = {
        ...intake,
        ...(payload.item as ServiceIntakeRecord),
        clientName: intake.clientName,
        projectName: intake.projectName,
      };
      setThread((current) => (current ? { ...current, intake: updated } : current));
      setInvolvedDraft(updated.involvedProfileIds ?? []);
      onUpdated?.(updated);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDueAt() {
    if (!intakeId || !intake) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: dateInputValueToDueAt(dueAtDraft) }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać terminu.");
      }
      const updated = {
        ...intake,
        ...(payload.item as ServiceIntakeRecord),
        clientName: intake.clientName,
        projectName: intake.projectName,
      };
      setThread((current) => (current ? { ...current, intake: updated } : current));
      setDueAtDraft(dueAtToDateInputValue(resolveServiceIntakeDueAt(updated)));
      onUpdated?.(updated);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(nextStatus: ServiceIntakeStatus) {
    if (!intakeId || !intake) {
      return;
    }

    if (nextStatus === "converted") {
      setSettlementOpen(true);
      return;
    }
    if (nextStatus === "stuck") {
      setStuckOpen(true);
      return;
    }

    if (!confirmServiceIntakeStatusChange(nextStatus, intake.status)) {
      setStatusDraft(intake.status);
      return;
    }

    const patch: { status: ServiceIntakeStatus; assigneeId?: string } = { status: nextStatus };
    if (nextStatus === "in_review" && profile?.id) {
      if (
        !confirmServiceIntakeTakeover({
          currentUserId: profile.id,
          assigneeId: intake.assigneeId,
          assigneeName: intake.assigneeName,
        })
      ) {
        setStatusDraft(intake.status);
        return;
      }
      if (!intake.assigneeId || intake.assigneeId !== profile.id) {
        patch.assigneeId = profile.id;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zmienić statusu.");
      }
      const updated = {
        ...intake,
        ...(payload.item as ServiceIntakeRecord),
        clientName: intake.clientName,
        projectName: intake.projectName,
        clientAddress: intake.clientAddress,
      };
      if (patch.assigneeId && profile?.id === patch.assigneeId) {
        updated.assigneeId = profile.id;
        updated.assigneeName = getUserDisplayName(profile);
      }
      setThread((current) => (current ? { ...current, intake: updated } : current));
      setStatusDraft(updated.status);
      setAssigneeIdDraft(updated.assigneeId ?? "");
      setInvolvedDraft(updated.involvedProfileIds ?? []);
      onUpdated?.(updated);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Błąd.");
      setStatusDraft(intake.status);
    } finally {
      setBusy(false);
    }
  }

  async function applySettlement(feedback: ServiceIntakeSettlementFeedback) {
    if (!intakeId || !intake) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "converted", settlement: feedback }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się rozliczyć zgłoszenia.");
      }
      const updated = {
        ...intake,
        ...(payload.item as ServiceIntakeRecord),
        clientName: intake.clientName,
        projectName: intake.projectName,
        clientAddress: intake.clientAddress,
      };
      setThread((current) => (current ? { ...current, intake: updated } : current));
      setStatusDraft(updated.status);
      onUpdated?.(updated);
      setSettlementOpen(false);
    } catch (updateError) {
      throw updateError instanceof Error ? updateError : new Error("Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function applyStuck(feedback: ServiceIntakeStuckFeedback) {
    if (!intakeId || !intake) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "stuck", stuck: feedback }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się oznaczyć jako utknięte.");
      }
      const updated = {
        ...intake,
        ...(payload.item as ServiceIntakeRecord),
        clientName: intake.clientName,
        projectName: intake.projectName,
        clientAddress: intake.clientAddress,
      };
      setThread((current) => (current ? { ...current, intake: updated } : current));
      setStatusDraft(updated.status);
      onUpdated?.(updated);
      setStuckOpen(false);
    } catch (updateError) {
      throw updateError instanceof Error ? updateError : new Error("Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteIntake() {
    if (!intakeId || !intake || !canDelete) {
      return;
    }
    if (
      !window.confirm(
        `Trwale usunąć zgłoszenie ${intake.referenceNumber}? Tej operacji nie można cofnąć.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się usunąć zgłoszenia.");
      }
      onDeleted?.(intakeId);
      onOpenChange(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function submitComment() {
    if (!intakeId || !commentDraft.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commentDraft, authorName }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać wiadomości.");
      }
      setThread((current) =>
        current
          ? { ...current, comments: [...current.comments, payload.comment as ServiceIntakeComment] }
          : current,
      );
      void createUserMentionNotifications({
        sourceId: intakeId,
        authorName,
        body: commentDraft,
        candidates,
        contextLabel: "w wątku zgłoszenia",
        subjectLabel: thread?.intake
          ? SERVICE_INTAKE_REQUEST_TYPE_LABELS[thread.intake.requestType]
          : undefined,
        linkUrl: "/oferty/zgloszenia",
      }).catch(() => undefined);
      setCommentDraft("");
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <StackedDialogContent className="max-h-[92vh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <DialogTitle className="text-xl font-semibold">
            {intake?.referenceNumber ?? "Zgłoszenie serwisowe"}
          </DialogTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ładowanie zgłoszenia…
          </p>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {intake ? (
          <div className="grid min-w-0 gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {cafe ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                    cafe.toneClass,
                  )}
                >
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", cafe.letterClass)}>
                    {cafe.letter}
                  </span>
                  CAFE · {cafe.title}
                  <Coffee className="h-4 w-4 opacity-80" />
                </span>
              ) : null}
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                  SERVICE_INTAKE_STATUS_BADGE_CLASS[SERVICE_INTAKE_STATUS_TONE[intake.status]],
                )}
              >
                {SERVICE_INTAKE_STATUS_LABELS[intake.status]}
              </span>
              {overdue ? (
                <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200">
                  Po terminie
                </span>
              ) : null}
            </div>

            <div className="grid gap-1 text-sm text-muted">
              <p>
                {intake.clientName ?? intake.contactFullName} · {intake.projectName ?? "Obiekt"}
              </p>
              {intake.clientAddress ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-fit border-accent/40 text-accent hover:bg-accent/10"
                  asChild
                >
                  <a
                    href={buildGoogleMapsDirectionsUrl(intake.clientAddress) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="mr-1.5 h-3.5 w-3.5" />
                    Prowadź do
                  </a>
                </Button>
              ) : null}
              <p>Zgłoszono: {formatDateTime(intake.createdAt)}</p>
              {dueAt && !dueAtChanged ? (
                <p>Wykonać do: {formatDate(dueAt.slice(0, 10))}</p>
              ) : null}
              {intake.assigneeName ? (
                <p className="flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" />
                  Obsługuje: {intake.assigneeName}
                </p>
              ) : null}
              <p>{SERVICE_INTAKE_REQUEST_TYPE_LABELS[intake.requestType]} · {intake.serviceTypeHint}</p>
              {intake.priority ? <p>{SERVICE_INTAKE_PRIORITY_LABELS[intake.priority]}</p> : null}
              {intake.postWarrantyAction ? (
                <p>{SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS[intake.postWarrantyAction]}</p>
              ) : null}
            </div>

            {intake.aiEstimate ? (
              <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 text-sm">
                <p className="font-medium text-foreground">Orientacyjna wycena AI</p>
                <p className="mt-2">
                  Netto:{" "}
                  <span className="font-semibold">
                    {formatMoney(intake.aiEstimate.public.estimatedNetTotal)}
                  </span>{" "}
                  · pewność {Math.round(intake.aiEstimate.public.confidence * 100)}%
                </p>
                {intake.workPreference ? (
                  <p className="mt-1 text-muted">
                    Preferencja klienta: {SERVICE_INTAKE_WORK_PREFERENCE_LABELS[intake.workPreference]}
                  </p>
                ) : null}
                {intake.preliminaryAcceptedAt ? (
                  <p className="mt-2 text-emerald-300">
                    Wstępna akceptacja: {formatDateTime(intake.preliminaryAcceptedAt)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Opis</p>
              <p className="break-words whitespace-pre-wrap rounded-xl border border-border/70 bg-surface-muted/10 p-3 text-sm text-foreground">
                {intake.description}
              </p>
            </div>

            {(() => {
              const primary = serviceIntakePrimaryAction(intake.status);
              if (!primary) {
                return null;
              }
              return (
                <div className="rounded-2xl border-2 border-accent/50 bg-accent/10 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Następny krok
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">{primary.hint}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="lg"
                      disabled={busy}
                      className="h-12 w-full text-base font-bold uppercase tracking-wide sm:w-auto sm:min-w-[220px]"
                      onClick={() => void changeStatus(primary.nextStatus)}
                    >
                      {primary.label}
                    </Button>
                    {intake.status === "in_review" ? (
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        disabled={busy}
                        className="h-12 w-full text-base font-bold uppercase tracking-wide sm:w-auto sm:min-w-[180px]"
                        onClick={() => void changeStatus("stuck")}
                      >
                        Utknięte
                      </Button>
                    ) : null}
                  </div>
                  {intake.attemptCount > 1 ? (
                    <p className="mt-2 text-xs text-amber-200">Podejście {intake.attemptCount}</p>
                  ) : null}
                </div>
              );
            })()}

            {canManageBoard ? (
              <Field label="Termin wykonania do">
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    type="date"
                    value={dueAtDraft}
                    onChange={(event) => setDueAtDraft(event.target.value)}
                    className="min-w-0 flex-1 sm:min-w-[220px]"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || !dueAtChanged}
                    onClick={() => void saveDueAt()}
                  >
                    Zapisz termin
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Domyślnie ustawiany przy zgłoszeniu według priorytetu CAFE (C: 1 dzień, A: 7 dni, F: 30
                  dni, E: brak).
                </p>
              </Field>
            ) : dueAt ? (
              <p className="text-sm text-muted">
                Termin wykonania do:{" "}
                <span className="font-medium text-foreground">{formatDate(dueAt.slice(0, 10))}</span>
              </p>
            ) : null}

            {canManageBoard ? (
              <Field label="Osoba do obsługi">
                <div className="flex flex-wrap items-end gap-2">
                  <Select
                    value={assigneeIdDraft}
                    onChange={(event) => setAssigneeIdDraft(event.target.value)}
                    className="min-w-0 flex-1 sm:min-w-[220px]"
                  >
                    <option value="">— brak przypisania —</option>
                    {teamProfiles.map((teamProfile) => (
                      <option key={teamProfile.id} value={teamProfile.id}>
                        {profileToOptionLabel(teamProfile)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || !assigneeChanged}
                    onClick={() => void saveAssignee()}
                  >
                    Zapisz osobę
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Po przypisaniu przy statusie „Nowe” pracownik dostaje push i powiadomienie w dzwonku —
                  musi kliknąć Przyjmij.
                </p>
              </Field>
            ) : intake.assigneeName ? (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <UserRound className="h-3.5 w-3.5" />
                Obsługuje:{" "}
                <span className="font-medium text-foreground">{intake.assigneeName}</span>
              </p>
            ) : null}

            <Field label="Zaangażowani (opcjonalnie)">
              <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-xl border border-border/70 bg-surface-muted/10 p-2">
                {teamProfiles.length === 0 ? (
                  <p className="text-xs text-muted">Brak listy zespołu.</p>
                ) : (
                  teamProfiles.map((teamProfile) => {
                    const checked = involvedDraft.includes(teamProfile.id);
                    const isAssignee = (assigneeIdDraft || intake.assigneeId) === teamProfile.id;
                    return (
                      <label
                        key={teamProfile.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy || isAssignee}
                          onChange={(event) => {
                            setInvolvedDraft((current) =>
                              event.target.checked
                                ? [...current, teamProfile.id]
                                : current.filter((id) => id !== teamProfile.id),
                            );
                          }}
                        />
                        <span>
                          {profileToOptionLabel(teamProfile)}
                          {isAssignee ? " (odpowiedzialny)" : ""}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !involvedChanged}
                  onClick={() => void saveInvolved()}
                >
                  Zapisz zaangażowanych
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted">
                Traffią do planu zasobów razem z odpowiedzialnym po Przyjmij / Wznów.
              </p>
            </Field>

            {canManageBoard ? (
              <Field label="Etap na tablicy (tylko manager)">
                <div className="flex flex-wrap items-end gap-2">
                  <Select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as ServiceIntakeStatus)}
                    className="min-w-0 flex-1 sm:min-w-[220px]"
                  >
                    {SERVICE_INTAKE_KANBAN_COLUMNS.map((status) => (
                      <option key={status} value={status}>
                        {SERVICE_INTAKE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    disabled={busy || statusDraft === intake.status}
                    onClick={() => void changeStatus(statusDraft)}
                  >
                    Przenieś
                  </Button>
                </div>
              </Field>
            ) : (
              <p className="text-sm text-muted">
                Etap:{" "}
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                    SERVICE_INTAKE_STATUS_BADGE_CLASS[SERVICE_INTAKE_STATUS_TONE[intake.status]],
                  )}
                >
                  {SERVICE_INTAKE_STATUS_LABELS[intake.status]}
                </span>
              </p>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Załączniki</p>
              <AttachmentList attachments={thread?.attachments ?? []} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Wątek</p>
              <CommentThread comments={thread?.comments ?? []} />
              {intake.status !== "closed" && intake.status !== "rejected" ? (
                <div className="mt-3 grid gap-2">
                  <MentionTextarea
                    rows={3}
                    value={commentDraft}
                    onChange={setCommentDraft}
                    mentionOptions={mentionOptions}
                    placeholder="Odpowiedź zespołu… użyj @ aby oznaczyć"
                  />
                  <Button
                    type="button"
                    disabled={busy || !commentDraft.trim()}
                    onClick={() => void submitComment()}
                  >
                    Wyślij wiadomość
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button asChild variant="secondary">
                <Link href={`/zgloszenie/watek/${intake.trackingToken}`} target="_blank" rel="noreferrer">
                  Wątek publiczny
                  <ExternalLink className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              {canManageBoard ? (
                <Button asChild variant="outline">
                  {intake.serviceId ? (
                    <Link href={`/oferty/${intake.serviceId}`}>Otwórz rozliczenie</Link>
                  ) : (
                    <Link
                      href={buildServiceIntakeOfferHref(intake, {
                        extraCosts: Boolean(intake.extraCosts),
                      })}
                    >
                      Utwórz ofertę
                    </Link>
                  )}
                </Button>
              ) : null}
              {canManageBoard && intake.status !== "closed" && intake.status !== "rejected" ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void changeStatus("rejected")}
                >
                  Odrzuć
                </Button>
              ) : null}
              {canManageBoard &&
              (intake.status === "closed" || intake.status === "rejected") ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void changeStatus("in_review")}
                >
                  Otwórz ponownie
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void deleteIntake()}
                >
                  Usuń zgłoszenie
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </StackedDialogContent>

      <ServiceIntakeSettlementDialog
        intake={intake}
        open={settlementOpen}
        onOpenChange={setSettlementOpen}
        onSubmit={applySettlement}
      />
      <ServiceIntakeStuckDialog
        intake={intake}
        open={stuckOpen}
        onOpenChange={setStuckOpen}
        onSubmit={applyStuck}
      />
    </Dialog>
  );
}
