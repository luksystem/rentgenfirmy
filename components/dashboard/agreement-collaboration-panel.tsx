"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  AGREEMENT_WORKFLOW_PHASE_LABELS,
  getAgreementWorkflowPhase,
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
}: {
  agreementId: string;
  mode: ViewerMode;
  authorName: string;
  onChanged?: () => void | Promise<void>;
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
  /** Gdy ustawione — operacje przez API publiczne (bez logowania). */
  publicToken?: string;
}) {
  const [bundle, setBundle] = useState<AgreementCollaborationBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [responderName, setResponderName] = useState(authorName);

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
      if (!selectedRoleId && next.roles.length) {
        const defaultRole =
          mode === "client" ?
            (next.roles.find((role) => role.isClientRole) ?? next.roles[0])
          : next.roles.find((role) => !role.isClientRole) ?? next.roles[0];
        setSelectedRoleId(defaultRole.id);
      }
    } finally {
      setLoading(false);
    }
  }, [agreementId, mode, publicToken, selectedRoleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const phase = bundle ? getAgreementWorkflowPhase(bundle.agreement) : "draft";
  const canComment =
    bundle &&
    (phase === "discussion" ||
      phase === "draft" ||
      phase === "awaiting_approvals" ||
      bundle.agreement.discussionOpen);

  const pendingApprovalForViewer = useMemo(() => {
    if (!bundle || phase !== "awaiting_approvals") {
      return null;
    }
    if (mode === "client") {
      return bundle.approvals.find(
        (entry) => entry.status === "pending" && entry.role?.isClientRole,
      );
    }
    if (mode === "external" && selectedRoleId) {
      return bundle.approvals.find(
        (entry) => entry.status === "pending" && entry.roleId === selectedRoleId,
      );
    }
    return null;
  }, [bundle, mode, phase, selectedRoleId]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await refresh();
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddComment() {
    if (!commentBody.trim()) {
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
          authorName: authorName.trim() || responderName.trim() || "Użytkownik",
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
        authorName: authorName.trim() || responderName.trim() || "Użytkownik",
        authorSource,
        authorRoleLabel: mode === "external" ? roleLabel : mode === "client" ? "Klient" : null,
        body: commentBody,
      });
    }
    setCommentBody("");
  }

  async function handleRespond(accepted: boolean) {
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
          authorName: responderName.trim() || authorName.trim() || "Użytkownik",
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
        respondedByName: responderName.trim() || authorName.trim() || "Użytkownik",
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

  if (loading && !bundle) {
    return <p className="text-sm text-muted">Ładowanie procesu ustaleń…</p>;
  }

  if (!bundle) {
    return null;
  }

  const displayAgreement = bundle.activeVersion ?? bundle.agreement;
  const costLabel = formatAgreementCost(displayAgreement);

  return (
    <div className="mt-4 grid gap-4 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Proces: {AGREEMENT_WORKFLOW_PHASE_LABELS[phase]}
        </p>
        {bundle.activeVersion ? (
          <p className="text-xs text-muted">
            Wersja {bundle.activeVersion.versionNumber} ·{" "}
            {formatDate(bundle.activeVersion.publishedAt)}
          </p>
        ) : null}
      </div>

      {mode === "team" ? (
        <div className="flex flex-wrap gap-2">
          {!bundle.agreement.discussionOpen &&
          (phase === "draft" || phase === "rejected") ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => setAgreementDiscussionOpen(agreementId, true).then())}
            >
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              Otwórz dyskusję
            </Button>
          ) : null}
          {(phase === "draft" || phase === "discussion" || phase === "rejected") &&
          bundle.agreement.discussionOpen ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
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
          {(phase === "draft" || phase === "rejected") && !bundle.agreement.discussionOpen ? (
            <Button
              type="button"
              size="sm"
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">{role.label}</span>
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

      {bundle.comments.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Komentarze</p>
          <div className="grid max-h-64 gap-2 overflow-y-auto">
            {bundle.comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2"
              >
                <p className="text-xs text-muted">
                  {comment.authorName}
                  {comment.authorRoleLabel ? ` · ${comment.authorRoleLabel}` : ""} ·{" "}
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
          {mode === "external" ? (
            <>
              <Field label="Twoje imię / firma">
                <Input value={responderName} onChange={(event) => setResponderName(event.target.value)} />
              </Field>
              <Field label="Rola w procesie">
                <select
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  value={selectedRoleId}
                  onChange={(event) => setSelectedRoleId(event.target.value)}
                >
                  {bundle.roles
                    .filter((role) => !role.isClientRole)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                </select>
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !commentBody.trim()}
            onClick={() => void run(handleAddComment)}
          >
            Wyślij komentarz
          </Button>
        </div>
      ) : null}

      {pendingApprovalForViewer ? (
        <div className="grid gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm font-medium text-foreground">
            Decyzja: {pendingApprovalForViewer.role?.label ?? "Akceptacja"}
          </p>
          {costLabel ? <p className="text-sm text-muted">Koszt: {costLabel}</p> : null}
          {mode === "external" ? (
            <Field label="Podpisujesz jako">
              <Input value={responderName} onChange={(event) => setResponderName(event.target.value)} />
            </Field>
          ) : null}
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
              disabled={busy}
              onClick={() => void run(() => handleRespond(true))}
            >
              <Check className="mr-2 h-3.5 w-3.5" />
              Akceptuję
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
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
