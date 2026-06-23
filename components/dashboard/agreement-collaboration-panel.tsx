"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, MessageSquare, Send, X } from "lucide-react";
import { AgreementAttachmentGallery } from "@/components/dashboard/agreement-attachment-gallery";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  AGREEMENT_WORKFLOW_PHASE_LABELS,
  getAgreementWorkflowPhase,
  isTeamApproverRole,
  type AgreementCollaborationBundle,
  type AgreementCommentAuthorSource,
} from "@/lib/dashboard/agreement-collaboration-types";
import { formatAgreementCost } from "@/lib/dashboard/agreement-types";
import {
  addAgreementComment,
  fetchAgreementCollaboration,
  publishAgreementVersion,
  respondToAgreementApproval,
  setAgreementDiscussionOpen,
} from "@/lib/supabase/project-agreement-collaboration-repository";
import { cn, formatDate } from "@/lib/utils";

type ViewerMode = "team" | "client" | "external";

export function AgreementCollaborationPanel({
  agreementId,
  mode,
  authorName,
  onChanged,
  onWarrantyExtensionAccepted,
  publicToken,
  selectedRoleId: controlledRoleId,
  onSelectedRoleIdChange,
  onIdentityValidation,
  syncRevision,
}: {
  agreementId: string;
  mode: ViewerMode;
  authorName: string;
  onChanged?: () => void | Promise<void>;
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
  /** Gdy ustawione — operacje przez API publiczne (bez logowania). */
  publicToken?: string;
  /** Kontrolowana rola (publiczny link akceptacji). */
  selectedRoleId?: string;
  onSelectedRoleIdChange?: (roleId: string) => void;
  /** Wywoływane przy próbie akcji bez kompletnej tożsamości. */
  onIdentityValidation?: () => void;
  /** Zmiana wersji/statusu ustalenia — odśwież panel współpracy (realtime). */
  syncRevision?: string;
}) {
  const [bundle, setBundle] = useState<AgreementCollaborationBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [internalRoleId, setInternalRoleId] = useState("");
  const selectedRoleId = controlledRoleId ?? internalRoleId;
  const setSelectedRoleId = onSelectedRoleIdChange ?? setInternalRoleId;
  const [responderName, setResponderName] = useState(authorName);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const effectiveAuthorName = publicToken ? authorName.trim() : responderName.trim() || authorName.trim();
  const identityReady =
    Boolean(effectiveAuthorName) && (mode !== "external" || Boolean(selectedRoleId));

  function requireIdentity(): boolean {
    if (identityReady) {
      return true;
    }
    onIdentityValidation?.();
    if (!effectiveAuthorName) {
      setFormError("Podaj imię lub firmę przed kontynuacją.");
    } else if (mode === "external" && !selectedRoleId) {
      setFormError("Wybierz swoją rolę w procesie przed kontynuacją.");
    }
    return false;
  }

  useEffect(() => {
    setResponderName(authorName);
  }, [authorName]);

  const selectedRoleIdRef = useRef(selectedRoleId);
  selectedRoleIdRef.current = selectedRoleId;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next =
        publicToken ?
          await fetch(`/api/ustalenie/${encodeURIComponent(publicToken)}`).then(async (response) => {
            const payload = (await response.json()) as AgreementCollaborationBundle & {
              error?: string;
            };
            if (!response.ok) {
              throw new Error(payload.error ?? "Błąd pobierania ustalenia.");
            }
            return payload;
          })
        : await fetchAgreementCollaboration(agreementId);
      setBundle(next);
      if (!selectedRoleIdRef.current && next.roles.length && mode !== "external") {
        const defaultRole =
          mode === "client"
            ? (next.roles.find((role) => role.isClientRole) ?? next.roles[0])
            : next.roles.find((role) => !role.isClientRole) ?? next.roles[0];
        if (defaultRole?.id) {
          setSelectedRoleId(defaultRole.id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [agreementId, mode, publicToken, setSelectedRoleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lastSyncRevisionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    lastSyncRevisionRef.current = undefined;
  }, [agreementId]);

  useEffect(() => {
    if (!syncRevision) {
      return;
    }
    if (lastSyncRevisionRef.current === syncRevision) {
      return;
    }
    if (lastSyncRevisionRef.current !== undefined) {
      void refresh();
    }
    lastSyncRevisionRef.current = syncRevision;
  }, [refresh, syncRevision]);

  const phase = bundle ? getAgreementWorkflowPhase(bundle.agreement) : "draft";
  const canComment =
    bundle &&
    (phase === "discussion" ||
      phase === "draft" ||
      phase === "awaiting_approvals" ||
      bundle.agreement.discussionOpen);

  const canManageAttachments = bundle && bundle.agreement.status !== "cancelled";

  const pendingApprovalForViewer = useMemo(() => {
    if (!bundle || phase !== "awaiting_approvals") {
      return null;
    }
    if (mode === "client") {
      return bundle.approvals.find(
        (entry) => entry.status === "pending" && entry.role?.isClientRole,
      );
    }
    if (mode === "team") {
      return (
        bundle.approvals.find(
          (entry) => entry.status === "pending" && entry.role && isTeamApproverRole(entry.role),
        ) ?? null
      );
    }
    if (mode === "external" && selectedRoleId) {
      return bundle.approvals.find(
        (entry) => entry.status === "pending" && entry.roleId === selectedRoleId,
      );
    }
    return null;
  }, [bundle, mode, phase, selectedRoleId]);

  const notifyChanged = useCallback(async () => {
    await refresh();
    await onChanged?.();
  }, [onChanged, refresh]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await notifyChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddComment() {
    setFormError(null);

    if (!requireIdentity()) {
      return;
    }
    if (!commentBody.trim()) {
      setFormError("Wpisz treść komentarza.");
      return;
    }
    const authorSource: AgreementCommentAuthorSource =
      mode === "team" ? "team" : mode === "client" ? "client" : "external";
    const roleLabel = bundle?.roles.find((role) => role.id === selectedRoleId)?.label;

    if (publicToken) {
      const response = await fetch(`/api/ustalenie/${encodeURIComponent(publicToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          authorName: effectiveAuthorName,
          authorRoleLabel: mode === "external" ? roleLabel : mode === "client" ? "Klient" : null,
          commentBody,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się dodać komentarza.");
      }
    } else {
      await addAgreementComment(agreementId, {
        authorName: effectiveAuthorName,
        authorSource,
        authorRoleLabel: mode === "external" ? roleLabel : mode === "client" ? "Klient" : null,
        body: commentBody,
      });
    }
    setCommentBody("");
  }

  async function handleRespond(accepted: boolean) {
    setFormError(null);

    if (!requireIdentity()) {
      return;
    }
    if (!pendingApprovalForViewer?.roleId) {
      return;
    }

    if (publicToken) {
      const response = await fetch(`/api/ustalenie/${encodeURIComponent(publicToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          roleId: pendingApprovalForViewer.roleId,
          accepted,
          authorName: effectiveAuthorName,
          responseNote,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się zapisać decyzji.");
      }
      const next = (await response.json()) as AgreementCollaborationBundle;
      if (
        accepted &&
        next.agreement.category === "warranty" &&
        next.agreement.proposedWarrantyEndDate
      ) {
        await onWarrantyExtensionAccepted?.(next.agreement.proposedWarrantyEndDate);
      }
    } else {
      const next = await respondToAgreementApproval(agreementId, pendingApprovalForViewer.roleId, {
        accepted,
        respondedByName: effectiveAuthorName,
        responseNote: responseNote,
      });
      if (
        accepted &&
        next.agreement.category === "warranty" &&
        next.agreement.proposedWarrantyEndDate
      ) {
        await onWarrantyExtensionAccepted?.(next.agreement.proposedWarrantyEndDate);
      }
    }
    setResponseNote("");
  }

  async function handleUploadAttachment(file: File) {
    setFormError(null);
    if (!requireIdentity()) {
      throw new Error("Podaj tożsamość przed dodaniem załącznika.");
    }

    setUploadingAttachment(true);
    try {
      const authorSource: AgreementCommentAuthorSource =
        mode === "team" ? "team" : mode === "client" ? "client" : "external";

      if (publicToken) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("authorName", effectiveAuthorName);
        const response = await fetch(
          `/api/ustalenie/${encodeURIComponent(publicToken)}/attachments`,
          { method: "POST", body: formData },
        );
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Nie udało się przesłać pliku.");
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("authorName", effectiveAuthorName);
        formData.append("authorSource", authorSource);
        const response = await fetch(
          `/api/project-agreement-attachments/${encodeURIComponent(agreementId)}`,
          { method: "POST", body: formData, credentials: "include" },
        );
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Nie udało się przesłać pliku.");
        }
      }
      await notifyChanged();
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (mode !== "team") {
      return;
    }
    const response = await fetch(
      `/api/project-agreement-attachments/item/${encodeURIComponent(attachmentId)}`,
      { method: "DELETE", credentials: "include" },
    );
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Nie udało się usunąć załącznika.");
    }
    await notifyChanged();
  }

  if (loading && !bundle) {
    return <p className="text-sm text-muted">Ładowanie procesu ustaleń…</p>;
  }

  if (!bundle) {
    return null;
  }

  const displayAgreement = bundle.activeVersion ?? bundle.agreement;
  const costLabel = formatAgreementCost(displayAgreement);
  const agreementStatus = bundle.agreement.status;
  const canOpenDiscussion =
    !bundle.agreement.discussionOpen && agreementStatus !== "cancelled";
  const isReopenDiscussion =
    agreementStatus === "accepted" ||
    agreementStatus === "rejected" ||
    agreementStatus === "pending_client" ||
    Boolean(bundle.agreement.activeVersionId);

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-words text-xs font-semibold uppercase tracking-wide text-muted">
          Proces: {AGREEMENT_WORKFLOW_PHASE_LABELS[phase]}
        </p>
        {bundle.activeVersion ? (
          <p className="shrink-0 text-xs text-muted">
            Wersja {bundle.activeVersion.versionNumber} ·{" "}
            {formatDate(bundle.activeVersion.publishedAt)}
          </p>
        ) : null}
      </div>

      {mode === "team" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canOpenDiscussion ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void run(() => setAgreementDiscussionOpen(agreementId, true).then())}
            >
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              {isReopenDiscussion ? "Otwórz ponownie dyskusję" : "Otwórz dyskusję"}
            </Button>
          ) : null}
          {bundle.agreement.discussionOpen ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await publishAgreementVersion(agreementId, authorName);
                })
              }
            >
              <Send className="mr-2 h-3.5 w-3.5" />
              Opublikuj wersję do akceptacji
            </Button>
          ) : null}
          {!bundle.agreement.discussionOpen &&
          (phase === "draft" || phase === "rejected") ? (
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await publishAgreementVersion(agreementId, authorName);
                })
              }
            >
              <Send className="mr-2 h-3.5 w-3.5" />
              Wyślij do akceptacji
            </Button>
          ) : null}
        </div>
      ) : null}

      {bundle.roles.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Wymagane akceptacje
          </p>
          <div className="grid gap-1.5">
            {bundle.roles.map((role) => {
              const approval = bundle.approvals.find((entry) => entry.roleId === role.id);
              const status = approval?.status ?? (phase === "awaiting_approvals" ? "pending" : "—");
              return (
                <div
                  key={role.id}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 break-words font-medium text-foreground">
                    {role.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                      status === "accepted" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
                      status === "rejected" && "border-rose-500/40 bg-rose-500/10 text-rose-200",
                      status === "pending" && "border-amber-500/40 bg-amber-500/10 text-amber-200",
                      status === "—" && "border-border/70 text-muted",
                    )}
                  >
                    {status === "accepted"
                      ? "Zaakceptowano"
                      : status === "rejected"
                        ? "Odrzucono"
                        : status === "pending"
                          ? "Oczekuje"
                          : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Załączniki</p>
        <AgreementAttachmentGallery
          attachments={bundle.attachments ?? []}
          allowUpload={Boolean(canManageAttachments && identityReady)}
          allowDelete={mode === "team"}
          uploading={uploadingAttachment}
          onUpload={canManageAttachments ? handleUploadAttachment : undefined}
          onDelete={mode === "team" ? handleDeleteAttachment : undefined}
        />
        {canManageAttachments && !identityReady ? (
          <p className="text-xs text-muted">
            {mode === "external"
              ? "Podaj imię i wybierz rolę, aby dodać zdjęcie lub plik."
              : "Podaj imię, aby dodać załącznik."}
          </p>
        ) : null}
      </div>

      {bundle.comments.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Komentarze</p>
          <div className="grid max-h-64 gap-2 overflow-y-auto">
            {bundle.comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">{comment.authorName}</p>
                {comment.authorRoleLabel ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Rola w procesie: {comment.authorRoleLabel}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted">
                  {new Date(comment.createdAt).toLocaleString("pl-PL")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {canComment ? (
        <div className="grid gap-2">
          {mode === "external" && !publicToken ? (
            <>
              <Field label="Twoje imię / firma">
                <Input value={responderName} onChange={(event) => setResponderName(event.target.value)} />
              </Field>
              <Field label="Rola w procesie">
                <Select
                  value={selectedRoleId}
                  onChange={(event) => setSelectedRoleId(event.target.value)}
                  className={!selectedRoleId ? "text-muted" : undefined}
                >
                  <option value="" disabled>
                    — Wybierz swoją rolę —
                  </option>
                  {bundle.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : null}
          <Field label="Dodaj komentarz">
            <Textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              rows={3}
              placeholder="Uwagi, pytania, propozycje zmian…"
            />
          </Field>
          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !commentBody.trim() || !identityReady}
            onClick={() => void run(handleAddComment)}
          >
            Wyślij komentarz
          </Button>
        </div>
      ) : null}

      {pendingApprovalForViewer ? (
        <div className="grid gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm font-medium text-foreground">
            {mode === "team"
              ? "Akceptacja wewnętrzna (Administrator)"
              : `Decyzja: ${pendingApprovalForViewer.role?.label ?? "Akceptacja"}`}
          </p>
          {costLabel ? <p className="text-sm text-muted">Koszt: {costLabel}</p> : null}
          {mode === "external" && !publicToken ? (
            <Field label="Podpisujesz jako">
              <Input value={responderName} onChange={(event) => setResponderName(event.target.value)} />
            </Field>
          ) : null}
          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          <Field label="Uwagi (opcjonalnie)">
            <Textarea
              value={responseNote}
              onChange={(event) => setResponseNote(event.target.value)}
              rows={2}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !identityReady}
              onClick={() => void run(() => handleRespond(true))}
            >
              <Check className="mr-2 h-3.5 w-3.5" />
              Akceptuję
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy || !identityReady}
              onClick={() => void run(() => handleRespond(false))}
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Odrzucam
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
