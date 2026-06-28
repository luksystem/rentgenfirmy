"use client";

import { Check, Clock, History, MinusCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  TopAnchoredDialogContent,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
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
  tone: string;
}[] = [
  { status: "PASSED", label: "Spełnia", icon: Check, tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" },
  { status: "NOT_APPLICABLE", label: "Nie dotyczy", icon: MinusCircle, tone: "border-border/60 bg-surface-muted/40 text-muted hover:bg-surface-muted/60" },
  { status: "IN_PROGRESS", label: "W toku", icon: Clock, tone: "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20" },
  { status: "FAILED", label: "Nie spełnia", icon: XCircle, tone: "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20" },
];

export function InternalAcceptanceItemDialog({
  item,
  open,
  onOpenChange,
  readOnly,
  saving,
  onStatusChange,
  onFieldChange,
  onLocalFieldChange,
}: {
  item: InternalAcceptanceItemState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  saving?: boolean;
  onStatusChange: (status: InternalAcceptanceStatus) => void;
  onFieldChange: (patch: Partial<InternalAcceptanceItemState>) => void;
  onLocalFieldChange: (patch: Partial<InternalAcceptanceItemState>) => void;
}) {
  if (!item) {
    return null;
  }

  const lastMarker = item.lastUpdatedAt ?? item.completedAt;
  const lastActor = item.lastUpdatedByName ?? item.assigneeName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TopAnchoredDialogContent className="p-0">
        <div className="flex max-h-[inherit] flex-col">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-4 pt-5 pr-12">
            <DialogTitle className="text-base leading-snug">{item.name}</DialogTitle>
            <DialogDescription className="line-clamp-2">{item.description}</DialogDescription>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">{item.source.refLabel}</p>
            {lastMarker ? (
              <p className="mt-2 text-xs text-muted">
                Ostatnia zmiana: {lastActor ?? "—"} · {formatDateTime(lastMarker)}
              </p>
            ) : null}
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4">
            {!readOnly ? (
              <div className="grid gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Oznacz punkt</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUICK_STATUSES.map(({ status, label, icon: Icon, tone }) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={saving || item.status === status}
                      onClick={() => onStatusChange(status)}
                      className={cn(
                        "h-auto flex-col gap-1 border py-2.5 text-xs",
                        item.status === status ? tone : "border-border/60",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  Aktualny status:{" "}
                  <span className="font-medium text-foreground">
                    {INTERNAL_ACCEPTANCE_STATUS_LABELS[item.status]}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">{INTERNAL_ACCEPTANCE_STATUS_LABELS[item.status]}</p>
            )}

            {!readOnly && item.status === "FAILED" ? (
              <div className="grid gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <Field label="Opis problemu">
                  <Textarea
                    value={item.failureReason ?? ""}
                    disabled={saving}
                    onChange={(event) => onLocalFieldChange({ failureReason: event.target.value })}
                    onBlur={() => onFieldChange({ failureReason: item.failureReason })}
                  />
                </Field>
                <Field label="Osoba odpowiedzialna za poprawkę">
                  <Input
                    value={item.fixAssignee ?? ""}
                    disabled={saving}
                    onChange={(event) => onLocalFieldChange({ fixAssignee: event.target.value })}
                    onBlur={() => onFieldChange({ fixAssignee: item.fixAssignee })}
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
