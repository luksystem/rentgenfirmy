"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoalDetailView } from "@/components/goals/goal-detail-view";

export function GoalDetailDialog({
  goalId,
  goalName,
  open,
  onOpenChange,
}: {
  goalId: string | null;
  goalName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{goalName ?? "Szczegóły celu"}</DialogTitle>
        </DialogHeader>
        {goalId ? <GoalDetailView goalId={goalId} onDeleted={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
