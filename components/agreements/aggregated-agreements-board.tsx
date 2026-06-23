"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AgreementDetailModal } from "@/components/agreements/agreement-detail-modal";
import { AgreementKanbanCard } from "@/components/agreements/agreement-kanban-card";
import { useAgreementsHubRealtime } from "@/hooks/use-agreements-hub-realtime";
import { useAgreementApprovalHint } from "@/hooks/use-agreement-approval-hint";
import {
  AGREEMENT_KANBAN_COLUMNS,
  agreementKanbanColumnForStatus,
  type AgreementHubEntry,
} from "@/lib/dashboard/agreement-hub-types";
import { cn } from "@/lib/utils";
import { useAgreementHubStore } from "@/store/agreement-hub-store";

function AgreementKanbanCardWithHint({
  entry,
  onOpen,
}: {
  entry: AgreementHubEntry;
  onOpen: () => void;
}) {
  const approvalHint = useAgreementApprovalHint(entry.agreement);
  return <AgreementKanbanCard entry={entry} approvalHint={approvalHint} onOpen={onOpen} />;
}

export function AggregatedAgreementsBoard({ authorName }: { authorName: string }) {
  const cachedSnapshot = useAgreementHubStore((state) => state.snapshot);
  const ensureSnapshot = useAgreementHubStore((state) => state.ensureSnapshot);
  const [snapshot, setSnapshot] = useState(cachedSnapshot);
  const [loading, setLoading] = useState(!cachedSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<AgreementHubEntry | null>(null);

  const refresh = useCallback(
    async (options?: { force?: boolean; showLoading?: boolean }) => {
      const showLoading = options?.showLoading ?? !useAgreementHubStore.getState().snapshot;
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      try {
        const next = await ensureSnapshot({ force: options?.force ?? true });
        setSnapshot(next);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy ustaleń.");
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [ensureSnapshot],
  );

  useEffect(() => {
    void refresh({ force: false, showLoading: !cachedSnapshot });
  }, [cachedSnapshot, refresh]);

  useAgreementsHubRealtime(() => {
    void refresh({ force: true, showLoading: false });
  });

  const entriesByColumn = useMemo(() => {
    const grouped = new Map<string, AgreementHubEntry[]>();
    for (const column of AGREEMENT_KANBAN_COLUMNS) {
      grouped.set(column.id, []);
    }

    for (const entry of snapshot?.entries ?? []) {
      const columnId = agreementKanbanColumnForStatus(entry.agreement.status);
      if (!columnId) {
        continue;
      }
      grouped.get(columnId)?.push(entry);
    }

    return grouped;
  }, [snapshot?.entries]);

  if (loading && !snapshot) {
    return <p className="text-sm text-muted">Ładowanie tablicy ustaleń…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }

  if (!snapshot?.entries.length) {
    return (
      <p className="text-sm text-muted">
        Brak ustaleń w projektach. Dodaj ustalenie w dashboardzie klienta, aby pojawiło się na tablicy.
      </p>
    );
  }

  return (
    <>
      <p className="shrink-0 text-sm text-muted">
        Zbiorczy widok wszystkich ustaleń u klientów. Kliknij kartę, aby zobaczyć szczegóły i proces akceptacji.
      </p>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-1 md:flex-row md:overflow-hidden">
        {AGREEMENT_KANBAN_COLUMNS.map((column) => {
          const entries = entriesByColumn.get(column.id) ?? [];
          const count = entries.length;

          return (
            <div
              key={column.id}
              className="flex min-h-[280px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 bg-surface-muted/30 md:min-h-0"
            >
              <div className="shrink-0 border-b border-border/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{column.label}</p>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-surface px-2 text-xs font-semibold text-foreground">
                    {count}
                  </span>
                </div>
              </div>

              <div className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2")}>
                {entries.map((entry) => (
                  <AgreementKanbanCardWithHint
                    key={entry.agreement.id}
                    entry={entry}
                    onOpen={() => setActiveEntry(entry)}
                  />
                ))}
                {entries.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted">Brak ustaleń</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <AgreementDetailModal
        entry={activeEntry}
        authorName={authorName}
        open={Boolean(activeEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveEntry(null);
          }
        }}
        onChanged={() => refresh({ force: true, showLoading: false })}
      />
    </>
  );
}
