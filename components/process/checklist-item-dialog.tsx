"use client";

import { Check, Clock, MinusCircle, XCircle } from "lucide-react";
import { ChecklistLineDocumentationPanel, type ChecklistDocumentationUploadContext } from "@/components/process/checklist-line-documentation-panel";
import { TeamProfileSelect } from "@/components/process/team-profile-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  TopAnchoredDialogContent,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { UserProfile } from "@/lib/auth/types";
import { getUserDisplayName } from "@/lib/auth/types";
import { getChecklistDocumentationBlockReason, checklistLineStatus } from "@/lib/process/item-payload";
import { INTERNAL_ACCEPTANCE_STATUS_STYLES } from "@/lib/internal-acceptance/status-styles";
import {
  INTERNAL_ACCEPTANCE_STATUS_LABELS,
  type InternalAcceptanceStatus,
} from "@/lib/internal-acceptance/types";
import type { ChecklistLine } from "@/lib/process/types";
import { cn, formatDateTime } from "@/lib/utils";

const QUICK_STATUSES: {
  status: InternalAcceptanceStatus;
  label: string;
  icon: typeof Check;
}[] = [
  { status: "PASSED", label: "Spełnia", icon: Check },
  { status: "NOT_APPLICABLE", label: "Nie dotyczy", icon: MinusCircle },
  { status: "IN_PROGRESS", label: "W toku", icon: Clock },
  { status: "FAILED", label: "Problem", icon: XCircle },
];

export function ChecklistItemDialog({
  line,
  open,
  onOpenChange,
  readOnly,
  saving,
  teamProfiles = [],
  defaultAssigneeId = null,
  defaultAssigneeName = null,
  onStatusChange,
  onFieldChange,
  onLocalFieldChange,
  documentationUploadContext,
  documentationBlockReason,
}: {
  line: ChecklistLine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  saving?: boolean;
  teamProfiles?: UserProfile[];
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
  onStatusChange: (status: InternalAcceptanceStatus) => void;
  onFieldChange: (patch: Partial<ChecklistLine>) => void;
  onLocalFieldChange: (patch: Partial<ChecklistLine>) => void;
  documentationUploadContext?: ChecklistDocumentationUploadContext;
  documentationBlockReason?: string | null;
}) {
  if (!line) {
    return null;
  }

  const status = checklistLineStatus(line);
  const currentStyles = INTERNAL_ACCEPTANCE_STATUS_STYLES[status];
  const passedBlockedReason =
    documentationBlockReason ?? getChecklistDocumentationBlockReason(line, "PASSED");
  const hasLineOverride = Boolean(line.assigneeId);
  const effectiveAssigneeId = line.assigneeId ?? defaultAssigneeId ?? "";
  const effectiveAssigneeName =
    line.assigneeName ?? (line.assigneeId ? null : defaultAssigneeName) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TopAnchoredDialogContent className="p-0">
        <div className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-4 pt-5 pr-12">
            <div className="flex flex-wrap items-start gap-2">
              <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", currentStyles.dot)} />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base leading-snug">{line.text}</DialogTitle>
                <DialogDescription className="sr-only">Punkt checklisty</DialogDescription>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  currentStyles.badge,
                )}
              >
                {INTERNAL_ACCEPTANCE_STATUS_LABELS[status]}
              </span>
            </div>
            {line.checkedAt ? (
              <p className="mt-2 text-xs text-muted">
                {line.checkedBy ?? "—"} · {formatDateTime(line.checkedAt)}
              </p>
            ) : null}
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4">
            {line.requireDocumentation || line.attachments?.length ? (
              <ChecklistLineDocumentationPanel
                line={line}
                lineId={line.id}
                readOnly={readOnly}
                saving={saving}
                uploadContext={documentationUploadContext}
                onAttachmentsChange={(attachments) => onFieldChange({ attachments })}
              />
            ) : null}

            {!readOnly ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {QUICK_STATUSES.map(({ status: nextStatus, label, icon: Icon }) => {
                  const styles = INTERNAL_ACCEPTANCE_STATUS_STYLES[nextStatus];
                  const selected = status === nextStatus;
                  const blocked =
                    nextStatus === "PASSED" && Boolean(passedBlockedReason) && !selected;
                  return (
                    <Button
                      key={nextStatus}
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={saving || selected || blocked}
                      title={blocked ? (passedBlockedReason ?? undefined) : undefined}
                      onClick={() => onStatusChange(nextStatus)}
                      className={cn(
                        "h-auto flex-col gap-1.5 border py-3 text-xs font-semibold",
                        selected ? styles.badge : "border-border/60 opacity-80 hover:opacity-100",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  );
                })}
              </div>
            ) : null}

            {passedBlockedReason && !readOnly && status !== "PASSED" ? (
              <p className="text-xs text-amber-200">{passedBlockedReason}</p>
            ) : null}

            {!readOnly ? (
              <div className="grid gap-1.5">
                <Field label="Osoba odpowiedzialna">
                  <TeamProfileSelect
                    value={effectiveAssigneeId}
                    teamProfiles={teamProfiles}
                    disabled={saving}
                    placeholder={
                      defaultAssigneeId ? "Domyślnie (checklista)" : "— wybierz osobę —"
                    }
                    onChange={(profileId, profile) => {
                      if (!profileId || (defaultAssigneeId && profileId === defaultAssigneeId)) {
                        onFieldChange({
                          assigneeId: undefined,
                          assigneeName: undefined,
                        });
                        return;
                      }
                      onFieldChange({
                        assigneeId: profileId,
                        assigneeName: profile ? getUserDisplayName(profile) : undefined,
                      });
                    }}
                  />
                </Field>
                {defaultAssigneeId ? (
                  <p className="text-xs text-muted">
                    {hasLineOverride
                      ? "Wybierz pustą opcję lub osobę z checklisty, aby wrócić do domyślnego przypisania."
                      : "Domyślnie jak cała checklista — wybierz inną osobę, aby nadpisać tylko ten punkt."}
                  </p>
                ) : null}
              </div>
            ) : effectiveAssigneeName ? (
              <p className="text-sm text-muted">
                Odpowiedzialny:{" "}
                <span className="text-foreground">
                  {effectiveAssigneeName}
                  {!hasLineOverride && defaultAssigneeId ? " (checklista)" : ""}
                </span>
              </p>
            ) : null}

            {!readOnly && status === "FAILED" ? (
              <div className="grid gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 p-3">
                <Field label="Opis problemu">
                  <Textarea
                    value={line.failureReason ?? ""}
                    disabled={saving}
                    onChange={(event) => onLocalFieldChange({ failureReason: event.target.value })}
                    onBlur={() => onFieldChange({ failureReason: line.failureReason })}
                  />
                </Field>
                <Field label="Termin poprawki">
                  <Input
                    type="date"
                    value={line.fixDeadline?.slice(0, 10) ?? ""}
                    disabled={saving}
                    onChange={(event) =>
                      onFieldChange({ fixDeadline: event.target.value || undefined })
                    }
                  />
                </Field>
              </div>
            ) : !readOnly ? (
              <Field label="Uwagi">
                <Textarea
                  value={line.notes ?? ""}
                  disabled={saving}
                  onChange={(event) => onLocalFieldChange({ notes: event.target.value })}
                  onBlur={() => onFieldChange({ notes: line.notes })}
                />
              </Field>
            ) : line.notes ? (
              <p className="text-sm text-foreground">{line.notes}</p>
            ) : null}
          </div>
        </div>
      </TopAnchoredDialogContent>
    </Dialog>
  );
}
