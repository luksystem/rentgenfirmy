"use client";

import type { AgreementApprovalResponseView } from "@/hooks/use-agreement-approval-responses";
import { useAgreementApprovalResponses } from "@/hooks/use-agreement-approval-responses";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { cn } from "@/lib/utils";

function statusLabel(status: AgreementApprovalResponseView["status"]) {
  switch (status) {
    case "accepted":
      return "Zaakceptowano";
    case "rejected":
      return "Odrzucono";
    case "pending":
      return "Oczekuje";
    default:
      return null;
  }
}

function ApprovalResponseRow({
  entry,
  compact = false,
}: {
  entry: AgreementApprovalResponseView;
  compact?: boolean;
}) {
  const label = statusLabel(entry.status);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-surface-muted/10",
        compact ? "px-2.5 py-2" : "px-3 py-2",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">
          {entry.roleLabel}
        </span>
        {label ? (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
              entry.status === "accepted" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
              entry.status === "rejected" && "border-rose-500/40 bg-rose-500/10 text-rose-200",
              entry.status === "pending" && "border-amber-500/40 bg-amber-500/10 text-amber-200",
            )}
          >
            {label}
          </span>
        ) : null}
      </div>
      {entry.respondedByName || entry.respondedAt ? (
        <p className="mt-1 text-[11px] text-muted">
          {entry.respondedByName ?? "—"}
          {entry.respondedAt ? ` · ${new Date(entry.respondedAt).toLocaleString("pl-PL")}` : ""}
        </p>
      ) : null}
      {entry.responseNote?.trim() ? (
        <p
          className={cn(
            "mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90",
            compact ? "line-clamp-3 text-xs" : "text-xs",
          )}
        >
          <span className="font-medium text-muted">Uwagi: </span>
          {entry.responseNote.trim()}
        </p>
      ) : null}
    </div>
  );
}

export function AgreementApprovalResponsesList({
  responses,
  compact = false,
  className,
  title = "Notatki z akceptacji",
}: {
  responses: AgreementApprovalResponseView[];
  compact?: boolean;
  className?: string;
  title?: string;
}) {
  if (!responses.length) {
    return null;
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {title ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      ) : null}
      <div className="grid gap-1.5">
        {responses.map((entry) => (
          <ApprovalResponseRow key={entry.roleLabel} entry={entry} compact={compact} />
        ))}
      </div>
    </div>
  );
}

export function AgreementApprovalResponses({
  agreement,
  compact = false,
  className,
  title,
}: {
  agreement: Pick<
    ProjectClientAgreement,
    | "id"
    | "activeVersionId"
    | "status"
    | "updatedAt"
    | "clientResponseNote"
    | "clientResponseName"
    | "clientRespondedAt"
  >;
  compact?: boolean;
  className?: string;
  title?: string;
}) {
  const { responses, loading } = useAgreementApprovalResponses(agreement);

  if (loading && !responses.length) {
    return <p className="text-xs text-muted">Ładowanie notatek akceptacji…</p>;
  }

  return (
    <AgreementApprovalResponsesList
      responses={responses}
      compact={compact}
      className={className}
      title={title}
    />
  );
}
