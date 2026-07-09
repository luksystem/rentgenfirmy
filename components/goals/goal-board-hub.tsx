"use client";

import Link from "next/link";
import { BookOpen, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalBoardKindIcon } from "@/components/goals/goal-board-kind-icon";
import { CreateGoalBoardDialog } from "@/components/goals/create-goal-board-dialog";
import { useGoalStore } from "@/store/goal-store";

export function GoalBoardHub() {
  const boardKinds = useGoalStore((state) => state.boardKinds);
  const boards = useGoalStore((state) => state.boards);
  const boardCounts = useGoalStore((state) => state.boardCounts);

  const boardsByKind = new Map<string, typeof boards>();
  for (const board of boards) {
    boardsByKind.set(board.kind, [...(boardsByKind.get(board.kind) ?? []), board]);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/tablice-celow/zbiorcza"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <LayoutGrid className="h-4 w-4" />
            Widok zbiorczy
          </Link>
          <Link
            href="/tablice-celow/metodologie"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <BookOpen className="h-4 w-4" />
            Biblioteka metodologii
          </Link>
        </div>
        <CreateGoalBoardDialog boardKinds={boardKinds} />
      </div>

      <div className="grid gap-4">
        {boardKinds.map((kind) => {
          const kindBoards = boardsByKind.get(kind.code) ?? [];
          return (
            <Card key={kind.code}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-muted text-accent">
                    <GoalBoardKindIcon icon={kind.icon} className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <CardTitle>{kind.label}</CardTitle>
                    <p className="text-xs text-muted">{kind.description}</p>
                  </div>
                </div>
                {kind.visibility === "admin_only" ? (
                  <Badge tone="critical">Tylko admin</Badge>
                ) : null}
              </CardHeader>
              <CardContent className="pt-0">
                {kindBoards.length === 0 ? (
                  <p className="text-sm text-muted">Brak tablic tego typu — utwórz pierwszą.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {kindBoards.map((board) => {
                      const counts = boardCounts[board.id];
                      return (
                        <Link
                          key={board.id}
                          href={`/tablice-celow/${board.id}`}
                          className="rounded-xl border border-border/70 bg-surface-muted/30 p-3 transition hover:border-accent/40 hover:bg-surface-muted/50"
                        >
                          <p className="truncate text-sm font-semibold text-foreground">{board.name}</p>
                          {board.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{board.description}</p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-2">
                            <Badge tone="neutral">{counts?.total ?? 0} celów</Badge>
                            {counts && counts.atRisk > 0 ? (
                              <Badge tone="critical">{counts.atRisk} zagrożonych</Badge>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
