"use client";

import { Check, Clock, History, MinusCircle, UserRound, XCircle } from "lucide-react";
import {
  ChecklistLineDocumentationPanel,
  type InternalAcceptanceDocumentationUploadContext,
} from "@/components/process/checklist-line-documentation-panel";
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
import { getInternalAcceptanceDocumentationBlockReason } from "@/lib/internal-acceptance/documentation";
import { INTERNAL_ACCEPTANCE_STATUS_STYLES } from "@/lib/internal-acceptance/status-styles";
import {
  INTERNAL_ACCEPTANCE_STATUS_LABELS,
  type InternalAcceptanceHistoryEntry,
  type InternalAcceptanceItemState,
  type InternalAcceptanceStatus,
} from "@/lib/internal-acceptance/types";
import { cn, formatDateTime } from "@/lib/utils";

const QUICK_STATUSES: {
  status: InternalAcceptanceStatus;
  label: string;
  icon: typeof Check;
}[] = [
  { status: "PASSED", label: "Spełnia", icon: Check },
  { status: "NOT_APPLICABLE", label: "Nie dotyczy", icon: MinusCircle },
  { status: "IN_PROGRESS", label: "W toku", icon: Clock },
  { status: "FAILED", label: "Nie spełnia", icon: XCircle },
];

export function InternalAcceptanceItemDialog({
  item,
  open,
  onOpenChange,
  readOnly,
  saving,
  teamProfiles = [],
  onOpenAgreement,
  onStatusChange,
  onFieldChange,
  onLocalFieldChange,
  documentationUploadContext,
}: {
  item: InternalAcceptanceItemState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  saving?: boolean;
  teamProfiles?: UserProfile[];
  onOpenAgreement?: () => void;
  onStatusChange: (status: InternalAcceptanceStatus) => void;
  onFieldChange: (patch: Partial<InternalAcceptanceItemState>) => void;
  onLocalFieldChange: (patch: Partial<InternalAcceptanceItemState>) => void;
  documentationUploadContext?: InternalAcceptanceDocumentationUploadContext;
}) {
  if (!item) {
    return null;
  }

  const lastMarker = item.lastUpdatedAt ?? item.completedAt;
  const lastActor = item.lastUpdatedByName ?? item.assigneeName;
  const currentStyles = INTERNAL_ACCEPTANCE_STATUS_STYLES[item.status];
  const passedBlockedReason = getInternalAcceptanceDocumentationBlockReason(item, "PASSED");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TopAnchoredDialogContent className="p-0">
        <div className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-4 pt-4">
            <div className="flex flex-wrap items-start gap-2">
              <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", currentStyles.dot)} />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base leading-snug">{item.name}</DialogTitle>
                <DialogDescription className="line-clamp-2">{item.description}</DialogDescription>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  currentStyles.badge,
                )}
              >
                {INTERNAL_ACCEPTANCE_STATUS_LABELS[item.status]}
              </span>
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">{item.source.refLabel}</p>
            {onOpenAgreement ? (
              <button
                type="button"
                className="mt-1 text-xs text-accent hover:underline"
                onClick={onOpenAgreement}
              >
                Zobacz ustalenie — opis i komentarze
              </button>
            ) : null}
            {lastMarker ? (
              <p className="mt-2 text-xs text-muted">
                Ostatnia zmiana: {lastActor ?? "—"} · {formatDateTime(lastMarker)}
              </p>
            ) : null}
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4">
            {item.requireDocumentation || item.attachments?.length ? (
              <ChecklistLineDocumentationPanel
                requirement={{
                  requireDocumentation: item.requireDocumentation,
                  documentationHint: item.documentationHint,
                  attachments: item.attachments,
                }}
                targetId={item.itemKey}
                readOnly={readOnly}
                saving={saving}
                uploadContext={documentationUploadContext}
                onAttachmentsChange={(attachments) => onFieldChange({ attachments })}
              />
            ) : null}

            {!readOnly ? (
              <div className="grid gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Oznacz punkt</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUICK_STATUSES.map(({ status, label, icon: Icon }) => {
                    const styles = INTERNAL_ACCEPTANCE_STATUS_STYLES[status];
                    const selected = item.status === status;
                    const blocked =
                      status === "PASSED" && Boolean(passedBlockedReason) && !selected;
                    return (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={saving || selected || blocked}
                        title={blocked ? (passedBlockedReason ?? undefined) : undefined}
                        onClick={() => onStatusChange(status)}
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
              </div>
            ) : (
              <p className="text-sm text-muted">{INTERNAL_ACCEPTANCE_STATUS_LABELS[item.status]}</p>
            )}

            {!readOnly ? (
              <Field label="Osoba odpowiedzialna">
                <TeamProfileSelect
                  value={item.assigneeId ?? ""}
                  teamProfiles={teamProfiles}
                  disabled={saving}
                  onChange={(profileId, profile) => {
                    onFieldChange({
                      assigneeId: profileId || undefined,
                      assigneeName: profile ? getUserDisplayName(profile) : undefined,
                    });
                  }}
                />
              </Field>
            ) : item.assigneeName ? (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <UserRound className="h-3.5 w-3.5" />
                Odpowiedzialny: <span className="text-foreground">{item.assigneeName}</span>
              </p>
            ) : null}

            {!readOnly && item.status === "FAILED" ? (
              <div className="grid gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 p-3">
                <Field label="Opis problemu">
                  <Textarea
                    value={item.failureReason ?? ""}
                    disabled={saving}
                    onChange={(event) => onLocalFieldChange({ failureReason: event.target.value })}
                    onBlur={() => onFieldChange({ failureReason: item.failureReason })}
                  />
                </Field>
                <Field label="Osoba odpowiedzialna za poprawkę">
                  <TeamProfileSelect
                    value={item.fixAssigneeId ?? ""}
                    teamProfiles={teamProfiles}
                    disabled={saving}
                    onChange={(profileId, profile) => {
                      onFieldChange({
                        fixAssigneeId: profileId || undefined,
                        fixAssignee: profile ? getUserDisplayName(profile) : undefined,
                      });
                    }}
                  />
                </Field>
                <Field label="Termin poprawki">
                  <Input
                    type="date"
                    value={item.fixDeadline?.slice(0, 10) ?? ""}
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
                  value={item.notes ?? ""}
                  disabled={saving}
                  onChange={(event) => onLocalFieldChange({ notes: event.target.value })}
                  onBlur={() => onFieldChange({ notes: item.notes })}
                />
              </Field>
            ) : item.notes ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Uwagi</p>
                <p className="mt-1 text-sm text-foreground">{item.notes}</p>
              </div>
            ) : null}

            <HistorySection history={item.history ?? []} />
          </div>
        </div>
      </TopAnchoredDialogContent>
    </Dialog>
  );
}

function HistorySection({ history }: { history: InternalAcceptanceHistoryEntry[] }) {
  return (
    <section className="grid gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <History className="h-3.5 w-3.5" />
        Historia pozycji
      </p>
      {history.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted">
          Brak zdarzeń — pierwsza zmiana statusu zostanie zapisana tutaj.
        </p>
      ) : (
        <ol className="grid gap-2">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border/60 bg-surface-muted/20 px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="font-medium text-foreground">{entry.actorName}</span>
                <time className="text-xs text-muted">{formatDateTime(entry.at)}</time>
              </div>
              <p className="mt-1 text-sm text-muted">{entry.message}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
