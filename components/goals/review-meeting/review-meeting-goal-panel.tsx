"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import {
  GOAL_REVIEW_OUTCOME_LABELS,
  GOAL_REVIEW_OUTCOMES,
  GOAL_STATUS_LABELS,
  type Goal,
  type GoalKpi,
  type GoalMethodology,
  type GoalReviewMeetingItem,
  type GoalReviewOutcome,
  type GoalStatus,
} from "@/lib/goals/types";
import { fetchGoalKpis } from "@/lib/supabase/goal-repository";
import { fetchGoalMethodologyByCode } from "@/lib/supabase/goal-methodology-repository";
import { ReviewMeetingTaskForm } from "@/components/goals/review-meeting/review-meeting-task-form";
import { cn } from "@/lib/utils";

const SUCCESS_FIELD_HINTS = [
  "success",
  "kryter",
  "keyresult",
  "key_result",
  "measurable",
  "metric",
  "target",
  "outcome",
];

function isSuccessRelatedField(key: string, label: string) {
  const hay = `${key} ${label}`.toLowerCase();
  return SUCCESS_FIELD_HINTS.some((hint) => hay.includes(hint));
}

export function ReviewMeetingGoalPanel({
  meetingId,
  item,
  goal,
  ownerName,
  currentProfileId,
  teamProfiles,
  notes,
  onNotesChange,
  outcome,
  onOutcomeChange,
  goalStatus,
  onGoalStatusChange,
  progressPercent,
  onProgressChange,
  ownerId,
  onOwnerChange,
  onRequestSettle,
  onTaskCreated,
}: {
  meetingId: string;
  item: GoalReviewMeetingItem;
  goal: Goal;
  ownerName: string;
  currentProfileId: string | null;
  teamProfiles: UserProfile[];
  notes: string;
  onNotesChange: (notes: string) => void;
  outcome: GoalReviewOutcome | null;
  onOutcomeChange: (outcome: GoalReviewOutcome) => void;
  goalStatus: GoalStatus;
  onGoalStatusChange: (status: GoalStatus) => void;
  progressPercent: number;
  onProgressChange: (value: number) => void;
  ownerId: string | null;
  onOwnerChange: (ownerId: string | null) => void;
  onRequestSettle: () => void;
  onTaskCreated: () => void;
}) {
  const [methodology, setMethodology] = useState<GoalMethodology | null>(null);
  const [kpis, setKpis] = useState<GoalKpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [methodologyRecord, kpiList] = await Promise.all([
          goal.methodologyId
            ? fetchGoalMethodologyByCode(goal.methodologyId)
            : Promise.resolve(null),
          fetchGoalKpis(goal.id),
        ]);
        if (!cancelled) {
          setMethodology(methodologyRecord);
          setKpis(kpiList);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [goal.id, goal.methodologyId]);

  const successFields = useMemo(() => {
    if (!methodology) return [];
    const preferred = methodology.fieldSchema.filter((field) =>
      isSuccessRelatedField(field.key, field.label),
    );
    return preferred.length > 0 ? preferred : methodology.fieldSchema;
  }, [methodology]);

  const isOwner = Boolean(currentProfileId && ownerId === currentProfileId);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Właściciel celu</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{ownerName}</p>
        {isOwner ? (
          <p className="mt-0.5 text-xs text-muted">To Ty — możesz prowadzić notatki jako właściciel.</p>
        ) : (
          <p className="mt-0.5 text-xs text-muted">Notatki może uzupełnić także inny uczestnik.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Właściciel (można zmienić)">
          <Select
            value={ownerId ?? ""}
            onChange={(e) => onOwnerChange(e.target.value || null)}
          >
            <option value="">Brak właściciela</option>
            {teamProfiles.map((member) => (
              <option key={member.id} value={member.id}>
                {getUserDisplayName(member)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Postęp (%)">
          <Input
            type="number"
            min={0}
            max={100}
            value={progressPercent}
            onChange={(e) => onProgressChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border px-3 py-2">
          <p className="text-xs text-muted">Status</p>
          <p className="text-sm font-medium">{GOAL_STATUS_LABELS[goalStatus]}</p>
        </div>
        <div className="rounded-xl border border-border px-3 py-2">
          <p className="text-xs text-muted">Realizacja</p>
          <p className="text-sm font-medium">{progressPercent}%</p>
        </div>
        <div className="rounded-xl border border-border px-3 py-2">
          <p className="text-xs text-muted">Okres</p>
          <p className="text-sm font-medium">
            {goal.periodStart} → {goal.periodEnd}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Wczytywanie kryteriów sukcesu…
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-muted/20 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Kryteria sukcesu
            {methodology ? ` · ${methodology.name}` : ""}
          </p>
          {successFields.length === 0 && kpis.length === 0 ? (
            <p className="text-sm text-muted">
              Brak zdefiniowanych kryteriów metodologii / KPI dla tego celu.
            </p>
          ) : (
            <div className="space-y-2">
              {successFields.map((field) => (
                <div key={field.key} className="text-sm">
                  <span className="text-muted">{field.label}: </span>
                  <span className="text-foreground/90">
                    {String(goal.methodologyFields[field.key] ?? "—")}
                  </span>
                </div>
              ))}
              {kpis.map((kpi) => (
                <div key={kpi.id} className="text-sm">
                  <span className="text-muted">{kpi.name}: </span>
                  <span className="text-foreground/90">
                    {kpi.currentValue}
                    {kpi.unit ? ` ${kpi.unit}` : ""}
                    {kpi.targetValue != null ? ` / cel ${kpi.targetValue}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Ocena przeglądu musi wynikać z powyższych kryteriów sukcesu metodologii — nie z ogólnego
            wrażenia.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Wynik przeglądu względem kryteriów">
          <Select
            value={outcome ?? ""}
            onChange={(e) => onOutcomeChange(e.target.value as GoalReviewOutcome)}
          >
            <option value="" disabled>
              Wybierz…
            </option>
            {GOAL_REVIEW_OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {GOAL_REVIEW_OUTCOME_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status celu (opcjonalna zmiana)">
          <Select
            value={goalStatus === "settled" ? "settled" : goalStatus}
            onChange={(e) => {
              const next = e.target.value as GoalStatus | "settle_gate";
              if (next === "settle_gate" || next === "settled") {
                onRequestSettle();
                return;
              }
              onGoalStatusChange(next);
            }}
          >
            {(["planned", "in_progress", "at_risk", "on_hold"] as GoalStatus[]).map((status) => (
              <option key={status} value={status}>
                {GOAL_STATUS_LABELS[status]}
              </option>
            ))}
            <option value="settle_gate">{GOAL_STATUS_LABELS.settled}…</option>
          </Select>
        </Field>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onRequestSettle}>
        Rozlicz cel (etap „Rozliczony”)
      </Button>

      <Field
        label={
          isOwner
            ? "Notatki ze spotkania (właściciel)"
            : `Notatki ze spotkania (piszesz jako uczestnik · właściciel: ${ownerName})`
        }
      >
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={6}
          placeholder="Ustalenia, ryzyka, decyzje, uzasadnienie oceny względem kryteriów sukcesu…"
          className={cn(isOwner && "border-accent/40")}
        />
      </Field>

      <ReviewMeetingTaskForm
        meetingId={meetingId}
        goalId={goal.id}
        itemId={item.id}
        projectId={goal.projectId}
        onCreated={onTaskCreated}
      />
    </div>
  );
}
