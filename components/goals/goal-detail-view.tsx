"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { GoalAiReviewPanel } from "@/components/goals/goal-ai-review-panel";
import {
  GOAL_LEVEL_LABELS,
  GOAL_PERIOD_TYPE_LABELS,
  GOAL_PRIORITIES,
  GOAL_PRIORITY_LABELS,
  GOAL_REVIEW_OUTCOME_LABELS,
  GOAL_REVIEW_OUTCOMES,
  GOAL_SETTLEMENT_STATUS_LABELS,
  GOAL_SETTLEMENT_STATUSES,
  GOAL_STATUS_LABELS,
  GOAL_STATUSES,
  type Goal,
  type GoalComment,
  type GoalKpi,
  type GoalReview,
  type GoalReviewOutcome,
  type GoalSettlementStatus,
  type GoalStatus,
  type GoalUpdateEntry,
} from "@/lib/goals/types";
import { getUserDisplayName, hasFullAppAccess } from "@/lib/auth/types";
import {
  addGoalComment,
  closeGoalReview,
  deleteGoalKpi,
  fetchGoalById,
  fetchGoalComments,
  fetchGoalKpis,
  fetchGoalReviews,
  fetchGoalUpdates,
  scheduleGoalReview,
  settleGoal,
  updateGoal,
  updateGoalProgress,
  upsertGoalKpi,
} from "@/lib/supabase/goal-repository";
import { fetchGoalMethodologyByCode } from "@/lib/supabase/goal-methodology-repository";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";
import type { GoalMethodology } from "@/lib/goals/types";

type TabKey = "przeglad" | "kpi" | "historia" | "komentarze" | "przeglady" | "rozliczenie";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "przeglad", label: "Przegląd" },
  { key: "kpi", label: "KPI" },
  { key: "historia", label: "Historia" },
  { key: "komentarze", label: "Komentarze" },
  { key: "przeglady", label: "Przeglądy" },
  { key: "rozliczenie", label: "Rozliczenie" },
];

export function GoalDetailView({ goalId }: { goalId: string }) {
  const profile = useAuthStore((state) => state.profile);
  const teamProfiles = useGoalStore((state) => state.teamProfiles);
  const boards = useGoalStore((state) => state.boards);
  const getOwnerName = useGoalStore((state) => state.getOwnerName);
  const upsertGoalInStore = useGoalStore((state) => state.upsertGoalInStore);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [methodology, setMethodology] = useState<GoalMethodology | null>(null);
  const [kpis, setKpis] = useState<GoalKpi[]>([]);
  const [updates, setUpdates] = useState<GoalUpdateEntry[]>([]);
  const [comments, setComments] = useState<GoalComment[]>([]);
  const [reviews, setReviews] = useState<GoalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("przeglad");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const record = await fetchGoalById(goalId);
      setGoal(record);
      const [kpiList, updateList, commentList, reviewList, methodologyRecord] = await Promise.all([
        fetchGoalKpis(goalId),
        fetchGoalUpdates(goalId),
        fetchGoalComments(goalId),
        fetchGoalReviews(goalId),
        record?.methodologyId ? fetchGoalMethodologyByCode(record.methodologyId) : Promise.resolve(null),
      ]);
      setKpis(kpiList);
      setUpdates(updateList);
      setComments(commentList);
      setReviews(reviewList);
      setMethodology(methodologyRecord);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać celu.");
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    void load();
  }, [load]);

  function syncGoal(next: Goal) {
    setGoal(next);
    upsertGoalInStore(next);
  }

  const canCloseReview = useMemo(() => {
    if (!profile || !goal) return false;
    if (profile.id === goal.ownerId) return true;
    return hasFullAppAccess(profile.role);
  }, [profile, goal]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie celu...
      </div>
    );
  }

  if (!goal) {
    return <p className="text-sm text-rose-400">{error ?? "Cel nie został znaleziony."}</p>;
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{GOAL_LEVEL_LABELS[goal.level]}</Badge>
        <Badge tone="neutral">{GOAL_STATUS_LABELS[goal.status]}</Badge>
        <Badge tone="neutral">{GOAL_PRIORITY_LABELS[goal.priority]}</Badge>
        <Badge tone="neutral">{GOAL_PERIOD_TYPE_LABELS[goal.periodType]}</Badge>
        {goal.isRecurring ? <Badge tone="blue">Cykliczny</Badge> : null}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border/70 pb-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === entry.key
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "przeglad" ? (
        <OverviewTab
          goal={goal}
          methodology={methodology}
          ownerName={getOwnerName(goal.ownerId)}
          teamProfiles={teamProfiles}
          boardKind={boards.find((entry) => entry.id === goal.boardId)?.kind ?? ""}
          onChanged={syncGoal}
          currentProfileId={profile?.id ?? null}
        />
      ) : null}

      {tab === "kpi" ? (
        <KpiTab
          goalId={goal.id}
          kpis={kpis}
          onChanged={async () => setKpis(await fetchGoalKpis(goal.id))}
        />
      ) : null}

      {tab === "historia" ? <HistoryTab updates={updates} getOwnerName={getOwnerName} /> : null}

      {tab === "komentarze" ? (
        <CommentsTab
          goalId={goal.id}
          comments={comments}
          authorId={profile?.id ?? null}
          authorName={profile ? getUserDisplayName(profile) : "Użytkownik"}
          onChanged={async () => setComments(await fetchGoalComments(goal.id))}
        />
      ) : null}

      {tab === "przeglady" ? (
        <ReviewsTab
          goalId={goal.id}
          reviews={reviews}
          canClose={canCloseReview}
          currentProfileId={profile?.id ?? null}
          onChanged={async () => setReviews(await fetchGoalReviews(goal.id))}
        />
      ) : null}

      {tab === "rozliczenie" ? (
        <SettlementTab goal={goal} currentProfileId={profile?.id ?? null} onChanged={syncGoal} />
      ) : null}
    </div>
  );
}

function OverviewTab({
  goal,
  methodology,
  ownerName,
  teamProfiles,
  boardKind,
  onChanged,
  currentProfileId,
}: {
  goal: Goal;
  methodology: GoalMethodology | null;
  ownerName: string;
  teamProfiles: ReturnType<typeof useGoalStore.getState>["teamProfiles"];
  boardKind: string;
  onChanged: (goal: Goal) => void;
  currentProfileId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(goal.description);
  const [priority, setPriority] = useState(goal.priority);
  const [ownerId, setOwnerId] = useState(goal.ownerId ?? "");
  const [status, setStatus] = useState<GoalStatus>(goal.status);
  const [progress, setProgress] = useState(goal.progressPercent);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApplyAiStatusSuggestion(outcome: GoalReviewOutcome) {
    const nextStatus: GoalStatus = outcome === "on_track" ? "in_progress" : "at_risk";
    try {
      const result = await updateGoalProgress(goal.id, {
        status: nextStatus,
        note: `AI (przegląd): sugerowany wynik — ${GOAL_REVIEW_OUTCOME_LABELS[outcome]}.`,
        authorId: currentProfileId,
      });
      onChanged(result.goal);
    } catch {
      // brak akcji — użytkownik może wprowadzić zmianę statusu ręcznie w edycji
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateGoal(goal.id, {
        description,
        priority,
        ownerId: ownerId || null,
      });
      let final = updated;
      if (status !== goal.status || progress !== goal.progressPercent) {
        const result = await updateGoalProgress(goal.id, {
          status,
          progressPercent: progress,
          note: note.trim() || undefined,
          authorId: currentProfileId,
        });
        final = result.goal;
      }
      onChanged(final);
      setEditing(false);
      setNote("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać zmian.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4">
        {!editing ? (
          <>
            <p className="text-sm leading-6 text-foreground/90">{goal.description || "Brak opisu."}</p>
            <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
              <p>Właściciel: <span className="text-foreground">{ownerName}</span></p>
              <p>
                Okres:{" "}
                <span className="text-foreground">
                  {formatDate(goal.periodStart)} — {formatDate(goal.periodEnd)}
                </span>
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-foreground">{goal.progressPercent}% realizacji</p>

            {goal.status !== "settled" && goal.status !== "cancelled" ? (
              <GoalAiReviewPanel
                goalId={goal.id}
                description={goal.description}
                level={goal.level}
                boardKind={boardKind}
                onApplyStatusSuggestion={handleApplyAiStatusSuggestion}
              />
            ) : null}

            {methodology ? (
              <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Metodologia: {methodology.name}
                </p>
                <div className="grid gap-2">
                  {methodology.fieldSchema.map((field) => (
                    <div key={field.key} className="text-sm">
                      <span className="text-muted">{field.label}: </span>
                      <span className="text-foreground/90">
                        {String(goal.methodologyFields[field.key] ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                Edytuj
              </Button>
            </div>
          </>
        ) : (
          <>
            <Field label="Opis">
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Priorytet">
                <Select value={priority} onChange={(event) => setPriority(event.target.value as Goal["priority"])}>
                  {GOAL_PRIORITIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {GOAL_PRIORITY_LABELS[entry]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Właściciel">
                <Select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                  <option value="">— brak —</option>
                  {teamProfiles.map((member) => (
                    <option key={member.id} value={member.id}>
                      {getUserDisplayName(member)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onChange={(event) => setStatus(event.target.value as GoalStatus)}>
                  {GOAL_STATUSES.map((entry) => (
                    <option key={entry} value={entry}>
                      {GOAL_STATUS_LABELS[entry]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Procent realizacji">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                />
              </Field>
            </div>
            <Field label="Notatka do zmiany (opcjonalnie)">
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
            </Field>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Anuluj
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KpiTab({
  goalId,
  kpis,
  onChanged,
}: {
  goalId: string;
  kpis: GoalKpi[];
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await upsertGoalKpi({ goalId, name, unit, targetValue: target ? Number(target) : null });
      setName("");
      setUnit("");
      setTarget("");
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCurrent(kpi: GoalKpi, value: number) {
    await upsertGoalKpi({ ...kpi, currentValue: value });
    await onChanged();
  }

  return (
    <Card>
      <CardContent className="grid gap-3">
        {kpis.length === 0 ? <p className="text-sm text-muted">Brak KPI — dodaj pierwszy wskaźnik.</p> : null}
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{kpi.name}</p>
              <p className="text-xs text-muted">
                Cel: {kpi.targetValue ?? "—"} {kpi.unit}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                defaultValue={kpi.currentValue}
                className="h-9 w-24"
                onBlur={(event) => void handleUpdateCurrent(kpi, Number(event.target.value))}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await deleteGoalKpi(kpi.id);
                  await onChanged();
                }}
              >
                Usuń
              </Button>
            </div>
          </div>
        ))}

        <div className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-4">
          <Input placeholder="Nazwa KPI" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="Jednostka" value={unit} onChange={(event) => setUnit(event.target.value)} />
          <Input
            placeholder="Wartość docelowa"
            type="number"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <Button type="button" onClick={handleAdd} disabled={saving}>
            Dodaj KPI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryTab({
  updates,
  getOwnerName,
}: {
  updates: GoalUpdateEntry[];
  getOwnerName: (id: string | null) => string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        {updates.length === 0 ? <p className="text-sm text-muted">Brak zapisanej historii zmian.</p> : null}
        {updates.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm">
            <p className="text-xs text-muted">{formatDateTime(entry.createdAt)} — {getOwnerName(entry.authorId)}</p>
            <p className="mt-1 text-foreground/90">
              {entry.previousStatus !== entry.newStatus && entry.newStatus ? (
                <>Status: {GOAL_STATUS_LABELS[entry.previousStatus as GoalStatus] ?? "—"} → {GOAL_STATUS_LABELS[entry.newStatus]}. </>
              ) : null}
              {entry.previousProgress !== entry.newProgress ? (
                <>Realizacja: {entry.previousProgress ?? 0}% → {entry.newProgress ?? 0}%.</>
              ) : null}
            </p>
            {entry.note ? <p className="mt-1 text-muted">{entry.note}</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CommentsTab({
  goalId,
  comments,
  authorId,
  authorName,
  onChanged,
}: {
  goalId: string;
  comments: GoalComment[];
  authorId: string | null;
  authorName: string;
  onChanged: () => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await addGoalComment({ goalId, authorId, authorName, body });
      setBody("");
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-3">
        {comments.length === 0 ? <p className="text-sm text-muted">Brak komentarzy.</p> : null}
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm">
            <p className="text-xs text-muted">
              {comment.authorName} · {formatDateTime(comment.createdAt)}
            </p>
            <p className="mt-1 text-foreground/90">{comment.body}</p>
          </div>
        ))}
        <div className="flex gap-2 border-t border-border/60 pt-3">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            placeholder="Napisz komentarz..."
            className="flex-1"
          />
          <Button type="button" onClick={handleSubmit} disabled={saving} className="self-end">
            Dodaj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewsTab({
  goalId,
  reviews,
  canClose,
  currentProfileId,
  onChanged,
}: {
  goalId: string;
  reviews: GoalReview[];
  canClose: boolean;
  currentProfileId: string | null;
  onChanged: () => Promise<void>;
}) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSchedule() {
    if (!scheduledAt) return;
    setSaving(true);
    try {
      await scheduleGoalReview({ goalId, scheduledAt });
      setScheduledAt("");
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(review: GoalReview, outcome: GoalReviewOutcome) {
    await closeGoalReview({ id: review.id, closedBy: currentProfileId, outcome });
    await onChanged();
  }

  return (
    <Card>
      <CardContent className="grid gap-3">
        {reviews.length === 0 ? <p className="text-sm text-muted">Brak zaplanowanych przeglądów.</p> : null}
        {reviews.map((review) => (
          <div
            key={review.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm"
          >
            <div>
              <p className="font-semibold text-foreground">Termin: {formatDate(review.scheduledAt)}</p>
              {review.completedAt ? (
                <p className="text-xs text-muted">
                  Zamknięty {formatDateTime(review.completedAt)} —{" "}
                  {review.outcome ? GOAL_REVIEW_OUTCOME_LABELS[review.outcome] : "—"}
                </p>
              ) : (
                <p className="text-xs text-amber-300">Otwarty — wymaga akcji</p>
              )}
            </div>
            {!review.completedAt && canClose ? (
              <div className="flex gap-1.5">
                {GOAL_REVIEW_OUTCOMES.map((outcome) => (
                  <Button
                    key={outcome}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleClose(review, outcome)}
                  >
                    {GOAL_REVIEW_OUTCOME_LABELS[outcome]}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        <div className="flex flex-wrap items-end gap-2 border-t border-border/60 pt-3">
          <Field label="Zaplanuj kolejny przegląd">
            <Input type="date" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          </Field>
          <Button type="button" onClick={handleSchedule} disabled={saving}>
            Zaplanuj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SettlementTab({
  goal,
  currentProfileId,
  onChanged,
}: {
  goal: Goal;
  currentProfileId: string | null;
  onChanged: (goal: Goal) => void;
}) {
  const [settlementStatus, setSettlementStatus] = useState<GoalSettlementStatus>(
    goal.settlementStatus ?? "achieved",
  );
  const [whatWorked, setWhatWorked] = useState(goal.settlementWhatWorked ?? "");
  const [whatFailed, setWhatFailed] = useState(goal.settlementWhatFailed ?? "");
  const [conclusions, setConclusions] = useState(goal.settlementConclusions ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recurringCreated, setRecurringCreated] = useState(false);

  const alreadySettled = goal.status === "settled";

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const result = await settleGoal({
        id: goal.id,
        settlementStatus,
        settlementWhatWorked: whatWorked,
        settlementWhatFailed: whatFailed,
        settlementConclusions: conclusions,
        settledBy: currentProfileId,
      });
      onChanged(result.goal);
      setRecurringCreated(Boolean(result.nextRecurringGoal));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać rozliczenia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4">
        {recurringCreated ? (
          <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
            Cel jest cykliczny — utworzono automatycznie kolejną instancję na następny okres.
          </p>
        ) : null}

        <Field label="Wynik rozliczenia">
          <Select
            value={settlementStatus}
            disabled={alreadySettled}
            onChange={(event) => setSettlementStatus(event.target.value as GoalSettlementStatus)}
          >
            {GOAL_SETTLEMENT_STATUSES.map((entry) => (
              <option key={entry} value={entry}>
                {GOAL_SETTLEMENT_STATUS_LABELS[entry]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Co się udało">
          <Textarea
            value={whatWorked}
            disabled={alreadySettled}
            onChange={(event) => setWhatWorked(event.target.value)}
            rows={2}
          />
        </Field>
        <Field label="Co się nie udało">
          <Textarea
            value={whatFailed}
            disabled={alreadySettled}
            onChange={(event) => setWhatFailed(event.target.value)}
            rows={2}
          />
        </Field>
        <Field label="Wnioski">
          <Textarea
            value={conclusions}
            disabled={alreadySettled}
            onChange={(event) => setConclusions(event.target.value)}
            rows={2}
          />
        </Field>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {!alreadySettled ? (
          <div className="flex justify-end">
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? "Zapisywanie..." : "Rozlicz cel"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Cel rozliczony {goal.settledAt ? formatDateTime(goal.settledAt) : ""}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
