"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import { formatTimesheetPeriodLabel } from "@/lib/time-tracking/timesheet-period";
import { canSubmitTimesheetStatus } from "@/lib/time-tracking/timesheet-validation";
import {
  isEditableTimesheetStatus,
  TIMESHEET_STATUS_LABELS,
  type TimesheetView,
} from "@/lib/time-tracking/types";

function statusTone(status: TimesheetView["status"]) {
  switch (status) {
    case "approved":
      return "active" as const;
    case "submitted":
      return "waiting" as const;
    case "rejected":
      return "critical" as const;
    default:
      return "neutral" as const;
  }
}

export function TimeTimesheetPanel({
  timesheet,
  loading,
  onSubmit,
}: {
  timesheet: TimesheetView | null;
  loading: boolean;
  onSubmit: (employeeComment: string) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading && !timesheet) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted">Wczytywanie arkusza czasu…</CardContent>
      </Card>
    );
  }

  if (!timesheet) {
    return null;
  }

  const canSubmit = canSubmitTimesheetStatus(timesheet.status);
  const editable = isEditableTimesheetStatus(timesheet.status);

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(comment);
      if (timesheet?.status === "draft") {
        setComment("");
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się wysłać arkusza.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Arkusz czasu</p>
            <p className="text-xs text-muted">
              {formatTimesheetPeriodLabel(timesheet)} · {timesheet.entryCount} wpisów ·{" "}
              {formatDurationMinutes(timesheet.totalMinutes)}
            </p>
          </div>
          <Badge tone={statusTone(timesheet.status)}>
            {TIMESHEET_STATUS_LABELS[timesheet.status]}
          </Badge>
        </div>

        {timesheet.status === "submitted" ? (
          <p className="text-sm text-muted">
            Arkusz został wysłany do akceptacji. Nie możesz go edytować do czasu decyzji managera.
          </p>
        ) : null}

        {timesheet.status === "approved" ? (
          <p className="text-sm text-muted">
            Arkusz został zaakceptowany. Wpisy w tym okresie są zablokowane do edycji.
          </p>
        ) : null}

        {timesheet.status === "rejected" && timesheet.managerComment ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-foreground">
            <p className="font-medium">Komentarz managera</p>
            <p className="mt-1 text-muted">{timesheet.managerComment}</p>
          </div>
        ) : null}

        {editable ? (
          <Field label="Komentarz do managera (opcjonalnie)">
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              placeholder="Np. wyjaśnienie nadgodzin lub braków w opisach."
            />
          </Field>
        ) : timesheet.employeeComment ? (
          <div className="text-sm text-muted">
            <span className="font-medium text-foreground">Twój komentarz: </span>
            {timesheet.employeeComment}
          </div>
        ) : null}

        {canSubmit ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              <Send className="mr-1.5 h-4 w-4" />
              {submitting ? "Wysyłanie…" : "Wyślij do akceptacji"}
            </Button>
            {timesheet.draftEntryCount > 0 ? (
              <p className="text-xs text-muted">
                Do wysłania: {timesheet.draftEntryCount} wpisów roboczych
              </p>
            ) : (
              <p className="text-xs text-muted">Możesz wysłać arkusz także bez wpisów w tym okresie.</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
