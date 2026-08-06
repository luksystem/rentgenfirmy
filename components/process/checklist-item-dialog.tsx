"use client";

import { useState } from "react";
import { Check, CheckCheck, Clock, MinusCircle, XCircle } from "lucide-react";
import { ChecklistLineDocumentationPanel, type ChecklistDocumentationUploadContext } from "@/components/process/checklist-line-documentation-panel";
import { ItemEscalationActions } from "@/components/process/item-escalation-actions";
import { TeamProfileSelect } from "@/components/process/team-profile-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  StackedDialogContent,
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
  onMarkHandled,
  documentationUploadContext,
  documentationBlockReason,
  projectId,
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
  /** "Ogarnięte" — wymaga komentarza, status linii zostaje bez zmian. */
  onMarkHandled?: (note: string) => void;
  documentationUploadContext?: ChecklistDocumentationUploadContext;
  /** Obecne tylko w widoku zespołu — pokazuje przyciski eskalacji (Zgłoś do biura/zapotrzebowanie). */
  projectId?: string;
  documentationBlockReason?: string | null;
}) {
  const [handledDialogOpen, setHandledDialogOpen] = useState(false);
  const [handledReason, setHandledReason] = useState("");
  const [handledError, setHandledError] = useState<string | null>(null);

  if (!line) {
    return null;
  }

  function handleConfirmMarkHandled() {
    if (!handledReason.trim()) {
      setHandledError("Podaj krótki komentarz.");
      return;
    }
    onMarkHandled?.(handledReason.trim());
    setHandledDialogOpen(false);
    setHandledReason("");
    setHandledError(null);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <TopAnchoredDialogContent className="p-0">
          <div className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-4 pt-4">
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
              {line.handledAt ? (
                <p className="rounded-lg border border-border/60 bg-surface-muted/20 px-3 py-2 text-xs text-muted">
                  Ogarnięte przez {line.handledByName ?? "—"}, {formatDateTime(line.handledAt)}
                  {line.handledNote ? (
                    <>
                      {" "}
                      — <span className="text-foreground">{line.handledNote}</span>
                    </>
                  ) : null}
                </p>
              ) : null}

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
                    const blockedByDocumentation =
                      nextStatus === "PASSED" && Boolean(passedBlockedReason) && !selected;
                    const blockedByRequiredResolution =
                      nextStatus === "NOT_APPLICABLE" && Boolean(line.blockNotApplicable);
                    const blocked = blockedByDocumentation || blockedByRequiredResolution;
                    return (
                      <Button
                        key={nextStatus}
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={saving || selected || blocked}
                        title={
                          blockedByDocumentation
                            ? (passedBlockedReason ?? undefined)
                            : blockedByRequiredResolution
                              ? "Ten punkt wymaga rozstrzygnięcia jako „Spełnia” albo „Problem” — „Nie dotyczy” jest zablokowane."
                              : undefined
                        }
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

              {/* Przy potwierdzonym Problemie nie ma skrótu do "Ogarnięte" — trzeba realnie
                  eskalować (Zgłoś do biura/zapotrzebowanie), nie tylko wyciszyć punkt na liście. */}
              {!readOnly && onMarkHandled && status !== "FAILED" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={saving}
                  onClick={() => {
                    setHandledError(null);
                    setHandledReason("");
                    setHandledDialogOpen(true);
                  }}
                >
                  <CheckCheck className="mr-2 h-3.5 w-3.5" />
                  Ogarnięte
                </Button>
              ) : null}

              {!readOnly && projectId ? (
                <ItemEscalationActions
                  projectId={projectId}
                  itemTitle={line.text}
                  itemDescription={line.notes || line.failureReason}
                  disabled={saving}
                  onHandled={(note) => onMarkHandled?.(note)}
                />
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

      <Dialog open={handledDialogOpen} onOpenChange={setHandledDialogOpen}>
        <StackedDialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Oznacz jako ogarnięte</DialogTitle>
            <DialogDescription>
              Status punktu zostaje bez zmian — to informacja, że sprawa jest obsłużona (np.
              przeszła na poziom ustaleń albo zadań) i nie musi dalej straszyć na checkliście.
            </DialogDescription>
          </DialogHeader>
          <Field label="Komentarz">
            <Textarea
              value={handledReason}
              onChange={(event) => {
                setHandledReason(event.target.value);
                if (handledError) setHandledError(null);
              }}
              rows={2}
              placeholder="Np. Przeniesione do ustaleń, patrz zmiana #12."
            />
          </Field>
          {handledError ? <p className="text-xs text-rose-400">{handledError}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setHandledDialogOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!handledReason.trim()}
              onClick={handleConfirmMarkHandled}
            >
              Potwierdź
            </Button>
          </div>
        </StackedDialogContent>
      </Dialog>
    </>
  );
}
