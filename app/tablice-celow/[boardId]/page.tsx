"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GoalBoardView } from "@/components/goals/goal-board-view";
import { PageHeader } from "@/components/page-header";
import { useGoalStore } from "@/store/goal-store";

export default function GoalBoardPage() {
  const params = useParams();
  const boardId = String(params.boardId);
  const board = useGoalStore((state) => state.boards.find((entry) => entry.id === boardId));
  const boardKind = useGoalStore((state) =>
    state.boardKinds.find((entry) => entry.code === board?.kind),
  );

  return (
    <>
      <PageHeader
        eyebrow={boardKind?.label ?? "Tablica celów"}
        title={board?.name ?? "Tablica celów"}
        description={board?.description || undefined}
        headerClassName="mb-4 gap-3"
        descriptionClassName="line-clamp-2 sm:line-clamp-none"
        action={
          <Link
            href="/tablice-celow"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Wszystkie tablice
          </Link>
        }
      />
      <GoalBoardView boardId={boardId} />
    </>
  );
}
