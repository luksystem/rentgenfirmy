"use client";

import { AgreementCollapsibleShell } from "@/components/dashboard/agreement-collapsible-shell";
import { useAgreementApprovalHint } from "@/hooks/use-agreement-approval-hint";
import {
  buildAgreementCollapsibleMeta,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import { cn } from "@/lib/utils";

export function AgreementSummaryCard({
  agreement,
  compact = false,
  className,
  children,
}: {
  agreement: ProjectClientAgreement;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const meta = buildAgreementCollapsibleMeta(agreement);
  const approvalHint = useAgreementApprovalHint(agreement);

  return (
    <AgreementCollapsibleShell
      compact={compact}
      className={cn(className)}
      title={meta.title}
      subtitle={meta.subtitle}
      statusLabel={meta.statusLabel}
      statusTone={meta.statusTone}
      hint={approvalHint ?? meta.hint}
    >
      {children}
    </AgreementCollapsibleShell>
  );
}
