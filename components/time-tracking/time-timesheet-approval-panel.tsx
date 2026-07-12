"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import { formatTimesheetPeriodLabel } from "@/lib/time-tracking/timesheet-period";
import type { TimesheetView } from "@/lib/time-tracking/types";

export function TimeTimesheetApprovalPanel({
  timesheets,
  loading,
  onApprove,
  onReject,
}: {
  timesheets: TimesheetView[];
  loading: boolean;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, managerComment: string) => Promise<void>;
}) {
  const [rejectTarget, setRejectTarget] = useState<TimesheetView | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (loading && timesheets.length === 0) {
    return null;
  }

  if (timesheets.length === 0) {
    return null;
  }

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await onApprove(id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zaakceptować arkusza.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget) {
      return;
    }
    if (!rejectComment.trim()) {
      window.alert("Podaj komentarz przy odrzuceniu arkusza.");
      return;
    }

    setBusyId(rejectTarget.id);
    try {
      await onReject(rejectTarget.id, rejectComment.trim());
      setRejectTarget(null);
      setRejectComment("");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się odrzucić arkusza.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Card>
        <CardContent className="grid gap-4 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Do akceptacji</p>
            <p className="text-xs text-muted">
              Arkusze wysłane przez zespół w wybranym tygodniu.
            </p>
          </div>

          <div className="grid gap-3">
            {timesheets.map((sheet) => (
              <div
                key={sheet.id}
                className="flex flex-col gap-3 rounded-lg border border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{sheet.userDisplayName}</p>
                    <Badge tone="waiting">Oczekuje</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatTimesheetPeriodLabel(sheet)} · {sheet.entryCount} wpisów ·{" "}
                    {formatDurationMinutes(sheet.totalMinutes)}
                  </p>
                  {sheet.employeeComment ? (
                    <p className="mt-2 text-sm text-foreground/90">{sheet.employeeComment}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleApprove(sheet.id)}
                    disabled={busyId === sheet.id}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Akceptuj
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRejectTarget(sheet);
                      setRejectComment("");
                    }}
                    disabled={busyId === sheet.id}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Odrzuć
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectComment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odrzuć arkusz czasu</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `${rejectTarget.userDisplayName} · ${formatTimesheetPeriodLabel(rejectTarget)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <Field label="Komentarz dla pracownika">
            <Textarea
              value={rejectComment}
              onChange={(event) => setRejectComment(event.target.value)}
              rows={4}
              placeholder="Wyjaśnij, co należy poprawić przed ponownym wysłaniem."
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleReject()} disabled={Boolean(busyId)}>
              Odrzuć arkusz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
