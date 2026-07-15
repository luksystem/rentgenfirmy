"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Select } from "@/components/ui/input";
import { formatTimerSeconds } from "@/lib/goals/review-meeting-timing";
import { useGoalReviewMeetingStore, EMPTY_REVIEW_REPORTS } from "@/store/goal-review-meeting-store";
import { useGoalStore } from "@/store/goal-store";

function reportActualSeconds(report: {
  actualDurationSeconds: number | null;
  startedAt: string | null;
  completedAt: string | null;
  items: Array<{ actualSeconds: number | null }>;
}) {
  if (report.actualDurationSeconds != null && report.actualDurationSeconds > 0) {
    return report.actualDurationSeconds;
  }
  const fromItems = report.items.reduce((sum, item) => sum + (item.actualSeconds ?? 0), 0);
  if (fromItems > 0) return fromItems;
  if (report.startedAt && report.completedAt) {
    return Math.max(
      0,
      Math.round(
        (new Date(report.completedAt).getTime() - new Date(report.startedAt).getTime()) / 1000,
      ),
    );
  }
  return 0;
}

export function GoalReviewReportsList() {
  const hydrate = useGoalStore((s) => s.hydrate);
  const boards = useGoalStore((s) => s.boards);
  const hydrateReports = useGoalReviewMeetingStore((s) => s.hydrateReports);
  const reports = useGoalReviewMeetingStore((s) => s.reports);
  const loading = useGoalReviewMeetingStore((s) => s.reportsLoading);
  const error = useGoalReviewMeetingStore((s) => s.reportsError);
  const [boardFilter, setBoardFilter] = useState("all");

  useEffect(() => {
    void hydrate();
    void hydrateReports({ force: true });
  }, [hydrate, hydrateReports]);

  const filtered = useMemo(() => {
    const list = reports.length ? reports : EMPTY_REVIEW_REPORTS;
    if (boardFilter === "all") return list;
    return list.filter((report) => report.boardId === boardFilter);
  }, [reports, boardFilter]);

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)}>
          <option value="all">Wszystkie tablice</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Wczytywanie raportów…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">Brak zarchiwizowanych raportów przeglądu.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {filtered.map((report) => (
            <li key={report.id}>
              <Link
                href={`/tablice-celow/raporty/${report.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-surface-muted/40"
              >
                <span>
                  <span className="block text-sm font-medium">
                    {report.boardName ?? "Tablica celów"}
                  </span>
                  <span className="text-xs text-muted">
                    {report.completedAt
                      ? new Date(report.completedAt).toLocaleString("pl-PL")
                      : "—"}{" "}
                    · czas {formatTimerSeconds(reportActualSeconds(report))} · {report.items.length}{" "}
                    celów · {report.actions.length} zadań
                  </span>
                </span>
                <span className="text-xs text-accent">Zobacz →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
