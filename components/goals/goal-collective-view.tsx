"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { fetchAllGoals } from "@/lib/supabase/goal-repository";
import {
  GOAL_LEVEL_LABELS,
  GOAL_STATUS_LABELS,
  GOAL_STATUSES,
  type Goal,
  type GoalStatus,
} from "@/lib/goals/types";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useGoalStore } from "@/store/goal-store";

export function GoalCollectiveView({
  projectId: fixedProjectId,
  clientId: fixedClientId,
}: {
  projectId?: string;
  clientId?: string;
} = {}) {
  const boards = useGoalStore((state) => state.boards);
  const boardKinds = useGoalStore((state) => state.boardKinds);
  const getOwnerName = useGoalStore((state) => state.getOwnerName);
  const hydrateGoalStore = useGoalStore((state) => state.hydrate);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const searchParams = useSearchParams();

  // Widok bywa osadzany poza `/tablice-celow` (np. zakładka „Cele” w dashboardzie klienta),
  // gdzie `GoalHydrator` nie jest zamontowany — dociągamy katalog tablic/metodologii samodzielnie.
  useEffect(() => {
    void hydrateGoalStore();
  }, [hydrateGoalStore]);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [contextProjectId, setContextProjectId] = useState<string | null>(
    fixedProjectId ?? searchParams?.get("projectId") ?? null,
  );
  const [contextClientId, setContextClientId] = useState<string | null>(
    fixedClientId ?? searchParams?.get("clientId") ?? null,
  );
  const canClearContext = !fixedProjectId && !fixedClientId;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setGoals(await fetchAllGoals());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać celów.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const boardsById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);
  const kindsByCode = useMemo(() => new Map(boardKinds.map((kind) => [kind.code, kind])), [boardKinds]);
  const contextProjectName = useMemo(
    () => (contextProjectId ? projects.find((entry) => entry.id === contextProjectId)?.name ?? null : null),
    [projects, contextProjectId],
  );
  const contextClientName = useMemo(
    () => (contextClientId ? clients.find((entry) => entry.id === contextClientId)?.fullName ?? null : null),
    [clients, contextClientId],
  );

  const filtered = goals.filter((goal) => {
    if (statusFilter !== "all" && goal.status !== statusFilter) return false;
    if (boardFilter !== "all" && goal.boardId !== boardFilter) return false;
    if (contextProjectId && goal.projectId !== contextProjectId) return false;
    if (contextClientId && goal.clientId !== contextClientId) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie wszystkich celów...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }

  return (
    <div className="grid gap-4">
      {contextProjectId || contextClientId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground/90">
          <span className="font-medium">Filtr kontekstowy:</span>
          {contextProjectName || contextProjectId ? (
            <Badge tone="blue">Projekt: {contextProjectName ?? contextProjectId}</Badge>
          ) : null}
          {contextClientName || contextClientId ? (
            <Badge tone="blue">Klient: {contextClientName ?? contextClientId}</Badge>
          ) : null}
          {canClearContext ? (
            <button
              type="button"
              onClick={() => {
                setContextProjectId(null);
                setContextClientId(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Wyczyść
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as GoalStatus | "all")}
          className="w-auto"
        >
          <option value="all">Wszystkie statusy</option>
          {GOAL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {GOAL_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
        <Select value={boardFilter} onChange={(event) => setBoardFilter(event.target.value)} className="w-auto">
          <option value="all">Wszystkie tablice</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/40 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Cel</th>
              <th className="px-3 py-2">Tablica</th>
              <th className="px-3 py-2">Poziom</th>
              <th className="px-3 py-2">Właściciel</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Realizacja</th>
              <th className="px-3 py-2">Okres</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((goal) => {
              const board = boardsById.get(goal.boardId);
              const kind = board ? kindsByCode.get(board.kind) : undefined;
              return (
                <tr key={goal.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted/20">
                  <td className="px-3 py-2">
                    <Link
                      href={`/tablice-celow/${goal.boardId}/${goal.id}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {goal.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {board?.name ?? "—"} {kind ? `(${kind.label})` : ""}
                  </td>
                  <td className="px-3 py-2 text-muted">{GOAL_LEVEL_LABELS[goal.level]}</td>
                  <td className="px-3 py-2 text-muted">{getOwnerName(goal.ownerId)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={goal.status === "at_risk" ? "critical" : "neutral"}>
                      {GOAL_STATUS_LABELS[goal.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted">{goal.progressPercent}%</td>
                  <td className="px-3 py-2 text-muted">
                    {formatDate(goal.periodStart)} — {formatDate(goal.periodEnd)}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted">
                  Brak celów spełniających wybrane filtry.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
