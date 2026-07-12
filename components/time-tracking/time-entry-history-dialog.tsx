"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { TIME_ENTRY_LOG_ACTION_LABELS } from "@/lib/time-tracking/types";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

export function TimeEntryHistoryDialog({
  open,
  onOpenChange,
  entryId,
  entryLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string | null;
  entryLabel: string;
}) {
  const fetchEntryLogs = useTimeTrackingStore((state) => state.fetchEntryLogs);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof fetchEntryLogs>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entryId) {
      return;
    }
    setLoading(true);
    void fetchEntryLogs(entryId)
      .then(setLogs)
      .catch((error) => {
        window.alert(error instanceof Error ? error.message : "Nie udało się wczytać historii.");
      })
      .finally(() => setLoading(false));
  }, [open, entryId, fetchEntryLogs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Historia wpisu</DialogTitle>
          <DialogDescription>{entryLabel}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted">Wczytywanie historii…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted">Brak zapisów historii.</p>
        ) : (
          <div className="grid max-h-80 gap-2 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-surface-muted px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  {TIME_ENTRY_LOG_ACTION_LABELS[log.action] ?? log.action}
                </p>
                <p className="text-xs text-muted">{formatDate(log.createdAt)}</p>
                {log.comment ? <p className="mt-1 text-xs text-muted">{log.comment}</p> : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
