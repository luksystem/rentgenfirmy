"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AgreementCollaborationPanel } from "@/components/dashboard/agreement-collaboration-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  formatAgreementCost,
  getAgreementStatusLabel,
} from "@/lib/dashboard/agreement-types";
import {
  buildAgreementHubDashboardHref,
  type AgreementHubEntry,
} from "@/lib/dashboard/agreement-hub-types";
import { useAgreementApprovalHint } from "@/hooks/use-agreement-approval-hint";

function AgreementDetailModalBody({
  entry,
  authorName,
  onChanged,
}: {
  entry: AgreementHubEntry;
  authorName: string;
  onChanged?: () => void | Promise<void>;
}) {
  const { agreement } = entry;
  const approvalHint = useAgreementApprovalHint(agreement);
  const costLabel = formatAgreementCost(agreement);
  const dashboardHref = buildAgreementHubDashboardHref(entry);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{agreement.title}</DialogTitle>
        <DialogDescription asChild>
          <div className="grid gap-1 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">{entry.clientName}</span>
              {" · "}
              {entry.projectName}
            </p>
            <p>
              {PROJECT_AGREEMENT_CATEGORY_LABELS[agreement.category]}
              {" · "}
              {getAgreementStatusLabel(agreement)}
            </p>
            {costLabel ? <p>Koszt: {costLabel}</p> : null}
            {approvalHint ? <p className="font-medium text-accent/90">{approvalHint}</p> : null}
          </div>
        </DialogDescription>
      </DialogHeader>

      {agreement.body ? (
        <p className="whitespace-pre-wrap text-sm text-muted">{agreement.body}</p>
      ) : null}

      <AgreementCollaborationPanel
        agreementId={agreement.id}
        mode="team"
        authorName={authorName}
        onChanged={onChanged}
        syncRevision={`${agreement.status}:${agreement.updatedAt}:${agreement.activeVersionId ?? ""}`}
      />

      {dashboardHref ? (
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={dashboardHref}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Otwórz w dashboardzie klienta
          </Link>
        </Button>
      ) : null}
    </>
  );
}

export function AgreementDetailModal({
  entry,
  authorName,
  open,
  onOpenChange,
  onChanged,
}: {
  entry: AgreementHubEntry | null;
  authorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] max-w-2xl overflow-y-auto">
        {entry ? (
          <AgreementDetailModalBody entry={entry} authorName={authorName} onChanged={onChanged} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
