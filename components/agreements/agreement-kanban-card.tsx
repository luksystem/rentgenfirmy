"use client";

import { ChevronRight } from "lucide-react";
import { AgreementApprovalResponses } from "@/components/dashboard/agreement-approval-responses";
import {
  AGREEMENT_STATUS_BADGE_CLASS,
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  formatAgreementCost,
  getAgreementStatusLabel,
  getAgreementStatusTone,
} from "@/lib/dashboard/agreement-types";
import type { AgreementHubEntry } from "@/lib/dashboard/agreement-hub-types";
import { cn } from "@/lib/utils";

export function AgreementKanbanCard({
  entry,
  approvalHint,
  onOpen,
}: {
  entry: AgreementHubEntry;
  approvalHint?: string | null;
  onOpen: () => void;
}) {
  const { agreement } = entry;
  const costLabel = formatAgreementCost(agreement);
  const statusLabel = getAgreementStatusLabel(agreement);
  const statusTone = getAgreementStatusTone(agreement);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-full rounded-2xl border border-border/80 bg-surface px-3.5 py-3 text-left text-sm shadow-sm transition hover:border-accent/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 font-medium text-foreground">{agreement.title}</p>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      </div>

      <p className="mt-1 text-xs font-medium text-accent">{entry.clientName}</p>
      <p className="mt-0.5 text-xs text-muted">{entry.projectName}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            AGREEMENT_STATUS_BADGE_CLASS[statusTone],
          )}
        >
          {statusLabel}
        </span>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-muted">
          {PROJECT_AGREEMENT_CATEGORY_LABELS[agreement.category]}
        </span>
      </div>

      {approvalHint ? <p className="mt-2 text-xs font-medium text-accent/90">{approvalHint}</p> : null}
      <AgreementApprovalResponses agreement={agreement} compact title="" className="mt-2" />
      {costLabel ? <p className="mt-1 text-xs text-muted">Koszt: {costLabel}</p> : null}
    </button>
  );
}
