"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GoalDetailView } from "@/components/goals/goal-detail-view";
import { PageHeader } from "@/components/page-header";
import { useGoalStore } from "@/store/goal-store";

export default function GoalDetailPage() {
  const params = useParams();
  const boardId = String(params.boardId);
  const goalId = String(params.goalId);
  const goal = useGoalStore((state) =>
    (state.goalsByBoard[boardId] ?? []).find((entry) => entry.id === goalId),
  );

  return (
    <>
      <PageHeader
        eyebrow="Tablica celów"
        title={goal?.name ?? "Cel"}
        action={
          <Link
            href={`/tablice-celow/${boardId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do tablicy
          </Link>
        }
      />
      <GoalDetailView goalId={goalId} />
    </>
  );
}
