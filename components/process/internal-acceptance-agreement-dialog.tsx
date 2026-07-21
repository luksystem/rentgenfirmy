"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { AgreementApprovalResponses } from "@/components/dashboard/agreement-approval-responses";
import { AgreementCollaborationPanel } from "@/components/dashboard/agreement-collaboration-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  StackedDialogContent,
} from "@/components/ui/dialog";
import { useAgreementApprovalHint } from "@/hooks/use-agreement-approval-hint";
import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  formatAgreementCost,
  getAgreementStatusLabel,
} from "@/lib/dashboard/agreement-types";
import { useProjectAgreementStore } from "@/store/project-agreement-store";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";

// Stabilna referencja — nowa tablica `[]` przy każdym wywołaniu selektora Zustand powoduje
// nieskończoną pętlę renderów pod React 18 (useSyncExternalStore).
const EMPTY_AGREEMENTS: ProjectClientAgreement[] = [];

function InternalAcceptanceAgreementDialogBody({
  agreement,
  projectId,
  authorName,
  onClose,
}: {
  agreement: ProjectClientAgreement;
  projectId: string;
  authorName: string;
  onClose: () => void;
}) {
  const ensureAgreements = useProjectAgreementStore((state) => state.ensureAgreements);
  const approvalHint = useAgreementApprovalHint(agreement);
  const costLabel = formatAgreementCost(agreement);

  return (
    <>
      <DialogHeader>
        <div className="mb-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-10 min-h-10 w-full justify-start px-3 sm:h-8 sm:w-auto"
            onClick={onClose}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Wróć
          </Button>
        </div>
        <DialogTitle>{agreement.title}</DialogTitle>
        <DialogDescription asChild>
          <div className="grid gap-1 text-sm text-muted">
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
      ) : (
        <p className="text-sm text-muted">Brak opisu w ustaleniu.</p>
      )}

      <AgreementApprovalResponses agreement={agreement} title="Notatki z akceptacji" />

      <AgreementCollaborationPanel
        agreementId={agreement.id}
        mode="team"
        authorName={authorName}
        onChanged={() => void ensureAgreements(projectId, { force: true })}
        syncRevision={`${agreement.status}:${agreement.updatedAt}:${agreement.activeVersionId ?? ""}`}
        showApprovalResponses={false}
      />
    </>
  );
}

export function InternalAcceptanceAgreementDialog({
  projectId,
  agreementId,
  authorName,
  open,
  onOpenChange,
}: {
  projectId: string;
  agreementId: string | null;
  authorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ensureAgreements = useProjectAgreementStore((state) => state.ensureAgreements);
  const agreements = useProjectAgreementStore((state) =>
    agreementId ? state.byProject[projectId] ?? EMPTY_AGREEMENTS : EMPTY_AGREEMENTS,
  );
  const loading = useProjectAgreementStore(
    (state) => Boolean(projectId && state.loadingProjects[projectId]),
  );

  useEffect(() => {
    if (!open || !projectId) {
      return;
    }
    void ensureAgreements(projectId);
  }, [ensureAgreements, open, projectId]);

  const agreement = agreementId ? agreements.find((entry) => entry.id === agreementId) ?? null : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <StackedDialogContent
        className="max-h-[min(92vh,900px)] max-w-2xl overflow-y-auto"
        showCloseButton
      >
        {loading && !agreement ? (
          <p className="py-6 text-sm text-muted">Ładowanie ustalenia…</p>
        ) : !agreement ? (
          <p className="py-6 text-sm text-muted">Nie znaleziono ustalenia w tym projekcie.</p>
        ) : (
          <InternalAcceptanceAgreementDialogBody
            agreement={agreement}
            projectId={projectId}
            authorName={authorName}
            onClose={() => onOpenChange(false)}
          />
        )}
      </StackedDialogContent>
    </Dialog>
  );
}
