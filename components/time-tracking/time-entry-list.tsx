"use client";

import { History, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import {
  canDeleteTimeEntryInUi,
  canEditTimeEntryInUi,
} from "@/lib/time-tracking/entry-actions";
import {
  TIME_ENTRY_STATUS_LABELS,
  type TimeEntryView,
} from "@/lib/time-tracking/types";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

function statusTone(status: TimeEntryView["status"]) {
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

export function TimeEntryList({
  entries,
  onEdit,
  onDelete,
  onHistory,
}: {
  entries: TimeEntryView[];
  onEdit: (entry: TimeEntryView) => void;
  onDelete: (entry: TimeEntryView) => void;
  onHistory: (entry: TimeEntryView) => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const actor = profile ? { id: profile.id, role: profile.role } : null;

  const grouped = entries.reduce<Record<string, TimeEntryView[]>>((acc, entry) => {
    const key = entry.date;
    acc[key] = acc[key] ?? [];
    acc[key].push(entry);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  if (dates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted">
          Brak wpisów w wybranym okresie. Kliknij „Dodaj czas”, aby zarejestrować pracę.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {dates.map((date) => {
        const dayEntries = grouped[date] ?? [];
        const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);

        return (
          <section key={date} className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{formatDate(date)}</h3>
              <span className="text-xs text-muted">{formatDurationMinutes(dayTotal)}</span>
            </div>

            <div className="grid gap-2">
              {dayEntries.map((entry) => {
                const editable = canEditTimeEntryInUi(actor, entry);
                const deletable = canDeleteTimeEntryInUi(actor, entry);

                return (
                  <Card key={entry.id}>
                    <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.categoryColor }}
                            aria-hidden
                          />
                          <p className="font-medium text-foreground">
                            {entry.categoryName} · {entry.entryTypeName}
                          </p>
                          <Badge tone={statusTone(entry.status)}>
                            {TIME_ENTRY_STATUS_LABELS[entry.status]}
                          </Badge>
                          {entry.billable ? <Badge tone="blue">Do rozliczenia</Badge> : null}
                        </div>

                        <p className="mt-1 text-sm text-muted">
                          {formatDurationMinutes(entry.durationMinutes)}
                          {entry.projectName ? ` · ${entry.projectName}` : ""}
                          {entry.workItemTitle ? ` · ${entry.workItemTitle}` : ""}
                        </p>

                        {entry.description ? (
                          <p className="mt-2 text-sm text-foreground/90">{entry.description}</p>
                        ) : null}
                      </div>

                      {(editable || deletable) ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onHistory(entry)}
                          >
                            <History className="mr-1.5 h-3.5 w-3.5" />
                            Historia
                          </Button>
                          {editable ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(entry)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edytuj
                            </Button>
                          ) : null}
                          {deletable ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete(entry)}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Usuń
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onHistory(entry)}
                          >
                            <History className="mr-1.5 h-3.5 w-3.5" />
                            Historia
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
