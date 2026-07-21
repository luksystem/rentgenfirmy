"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BrandLoadingInline } from "@/components/brand-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { GoalAiReviewPanel } from "@/components/goals/goal-ai-review-panel";
import { useMentionOptionsFromProfiles } from "@/hooks/use-team-mention-options";
import { createUserMentionNotifications } from "@/lib/notifications/repository";
import { GoalDeferRevisitActions } from "@/components/goals/goal-defer-revisit-actions";
import { GoalInitiativesCard } from "@/components/goals/goal-initiatives-panel";
import { GoalLinksPanel } from "@/components/goals/goal-links-panel";
import { GoalSettlementGateDialog } from "@/components/goals/goal-settlement-gate-dialog";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { UserIdentity } from "@/components/user-avatar";
import { useDraftNumber } from "@/hooks/use-draft-number";
import { getUserDisplayName, hasFullAppAccess, isAdministratorRole, type UserProfile } from "@/lib/auth/types";
import {
  GOAL_DEFERRAL_REASON_LABELS,
  GOAL_LEVEL_LABELS,
  GOAL_PERIOD_TYPE_LABELS,
  GOAL_PRIORITIES,
  GOAL_PRIORITY_LABELS,
  GOAL_SETTLEMENT_STATUS_LABELS,
  GOAL_SETTLEMENT_STATUSES,
  GOAL_STATUS_LABELS,
  type Goal,
  type GoalComment,
  type GoalKpi,
  type GoalMethodology,
  type GoalReview,
  type GoalReviewOutcome,
  type GoalSettlementStatus,
  type GoalStatus,
  type GoalUpdateEntry,
} from "@/lib/goals/types";
import {
  addGoalComment,
  closeGoalReview,
  deleteGoalKpi,
  fetchGoalById,
  fetchGoalComments,
  fetchGoalInitiativeTaskCounts,
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
import { resolveReviewOutcomeLabel } from "@/lib/goals/module-settings";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";

type TabKey =
  | "przeglad"
  | "zadania"
  | "kpi"
  | "historia"
  | "komentarze"
  | "przeglady"
  | "powiazania"
  | "rozliczenie";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "przeglad", label: "Przegląd" },
  { key: "zadania", label: "Zadania" },
  { key: "kpi", label: "KPI" },
  { key: "historia", label: "Historia" },
  { key: "komentarze", label: "Komentarze" },
  { key: "przeglady", label: "Przeglądy" },
  { key: "powiazania", label: "Powiązania" },
  { key: "rozliczenie", label: "Rozliczenie" },
];

export function GoalDetailView({ goalId, onDeleted }: { goalId: string; onDeleted?: () => void }) {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const teamProfiles = useGoalStore((state) => state.teamProfiles);
  const boards = useGoalStore((state) => state.boards);
  const getOwnerName = useGoalStore((state) => state.getOwnerName);
  const upsertGoalInStore = useGoalStore((state) => state.upsertGoalInStore);
  const removeGoal = useGoalStore((state) => state.removeGoal);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [methodology, setMethodology] = useState<GoalMethodology | null>(null);
  const [kpis, setKpis] = useState<GoalKpi[]>([]);
  const [updates, setUpdates] = useState<GoalUpdateEntry[]>([]);
  const [comments, setComments] = useState<GoalComment[]>([]);
  const [reviews, setReviews] = useState<GoalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("przeglad");
  const [deleting, setDeleting] = useState(false);
  const [openTaskCount, setOpenTaskCount] = useState(0);

  const isAdmin = Boolean(profile && isAdministratorRole(profile.role));

  async function handleDelete() {
    if (!goal) return;
    if (!window.confirm(`Usunąć cel „${goal.name}”? Tej operacji nie można odwrócić.`)) {
      return;
    }
    setDeleting(true);
    try {
      await removeGoal(goal.boardId, goal.id);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push(`/tablice-celow/${goal.boardId}`);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć celu.");
      setDeleting(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const record = await fetchGoalById(goalId);
      setGoal(record);
      const [kpiList, updateList, commentList, reviewList, methodologyRecord, taskCounts] =
        await Promise.all([
          fetchGoalKpis(goalId),
          fetchGoalUpdates(goalId),
          fetchGoalComments(goalId),
          fetchGoalReviews(goalId),
          record?.methodologyId
            ? fetchGoalMethodologyByCode(record.methodologyId)
            : Promise.resolve(null),
          fetchGoalInitiativeTaskCounts([goalId]),
        ]);
      setKpis(kpiList);
      setUpdates(updateList);
      setComments(commentList);
      setReviews(reviewList);
      setMethodology(methodologyRecord);
      const counts = taskCounts[goalId];
      setOpenTaskCount(counts ? Math.max(0, counts.total - counts.done) : 0);
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

  const handleTaskCountsChange = useCallback((done: number, total: number) => {
    setOpenTaskCount(Math.max(0, total - done));
  }, []);

  const canCloseReview = useMemo(() => {
    if (!profile || !goal) return false;
    if (profile.id === goal.ownerId) return true;
    return hasFullAppAccess(profile.role);
  }, [profile, goal]);

  if (loading) {
    return <BrandLoadingInline label="Wczytywanie celu…" />;
  }

  if (!goal) {
    return <p className="text-sm text-rose-400">{error ?? "Cel nie został znaleziony."}</p>;
  }

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-clip">
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge tone="blue">{GOAL_LEVEL_LABELS[goal.level]}</Badge>
          <Badge tone="neutral">{GOAL_STATUS_LABELS[goal.status]}</Badge>
          <Badge tone="neutral">{GOAL_PRIORITY_LABELS[goal.priority]}</Badge>
          <Badge tone="neutral">{GOAL_PERIOD_TYPE_LABELS[goal.periodType]}</Badge>
          {goal.isRecurring ? <Badge tone="blue">Cykliczny</Badge> : null}
        </div>
        {isAdmin ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={() => void handleDelete()}
            className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Usuwanie..." : "Usuń cel"}
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-wrap gap-1.5 border-b border-border/70 pb-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === entry.key
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {entry.label}
            {entry.key === "zadania" && openTaskCount > 0 ? (
              <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-300">
                {openTaskCount}
              </span>
            ) : null}
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

      {tab === "zadania" ? (
        <GoalInitiativesCard
          goalId={goal.id}
          onCountsChange={handleTaskCountsChange}
        />
      ) : null}

      {tab === "kpi" ? (
        <KpiTab
          goalId={goal.id}
          kpis={kpis}
          onChanged={async () => setKpis(await fetchGoalKpis(goal.id))}
        />
      ) : null}

      {tab === "historia" ? (
        <HistoryTab updates={updates} teamProfiles={teamProfiles} getOwnerName={getOwnerName} />
      ) : null}

      {tab === "komentarze" ? (
        <CommentsTab
          goalId={goal.id}
          comments={comments}
          authorId={profile?.id ?? null}
          authorName={profile ? getUserDisplayName(profile) : "Użytkownik"}
          teamProfiles={teamProfiles}
          boardId={goal.boardId}
          goalTitle={goal.name}
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

      {tab === "powiazania" ? <GoalLinksPanel goalId={goal.id} projectId={goal.projectId} /> : null}

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
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description);
  const [priority, setPriority] = useState(goal.priority);
  const [ownerId, setOwnerId] = useState(goal.ownerId ?? "");
  const [status, setStatus] = useState<GoalStatus>(goal.status);
  const [progress, setProgress] = useState(goal.progressPercent);
  const progressInput = useDraftNumber(progress, setProgress, {
    min: 0,
    max: 100,
    emptyFallback: 0,
  });
  const [periodStart, setPeriodStart] = useState(goal.periodStart.slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(goal.periodEnd.slice(0, 10));
  const [projectId, setProjectId] = useState<string | null>(goal.projectId);
  const [isRecurring, setIsRecurring] = useState(goal.isRecurring);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const reviewOutcomes = useGoalStore((state) => state.moduleSettings.reviewOutcomes);

  useEffect(() => {
    setStatus(goal.status);
    setProgress(goal.progressPercent);
    setIsRecurring(goal.isRecurring);
  }, [goal.id, goal.status, goal.progressPercent, goal.isRecurring]);

  function beginEditing() {
    setName(goal.name);
    setDescription(goal.description);
    setPriority(goal.priority);
    setOwnerId(goal.ownerId ?? "");
    setStatus(goal.status);
    setProgress(goal.progressPercent);
    setPeriodStart(goal.periodStart.slice(0, 10));
    setPeriodEnd(goal.periodEnd.slice(0, 10));
    setProjectId(goal.projectId);
    setIsRecurring(goal.isRecurring);
    setNote("");
    setError(null);
    setEditing(true);
  }

  async function applyStatusChange(nextStatus: GoalStatus) {
    if (nextStatus === goal.status) {
      return;
    }
    if (nextStatus === "settled") {
      setSettlementOpen(true);
      return;
    }
    setStatusSaving(true);
    setError(null);
    try {
      const result = await updateGoalProgress(goal.id, {
        status: nextStatus,
        authorId: currentProfileId,
      });
      setStatus(result.goal.status);
      setProgress(result.goal.progressPercent);
      onChanged(result.goal);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Nie udało się zmienić statusu.");
      setStatus(goal.status);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleApplyAiStatusSuggestion(outcome: GoalReviewOutcome) {
    const nextStatus: GoalStatus = outcome === "on_track" ? "in_progress" : "at_risk";
    try {
      const result = await updateGoalProgress(goal.id, {
        status: nextStatus,
        note: `AI (przegląd): sugerowany wynik — ${resolveReviewOutcomeLabel(outcome, reviewOutcomes)}.`,
        authorId: currentProfileId,
      });
      onChanged(result.goal);
    } catch {
      // brak akcji — użytkownik może wprowadzić zmianę statusu ręcznie
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Nazwa celu jest wymagana.");
      return;
    }
    if (periodEnd < periodStart) {
      setError("Data docelowa nie może być wcześniejsza niż data początkowa.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateGoal(goal.id, {
        name,
        description,
        priority,
        ownerId: ownerId || null,
        periodStart,
        periodEnd,
        projectId,
        isRecurring,
      });
      let final = updated;
      if (status !== goal.status || progress !== goal.progressPercent) {
        const result = await updateGoalProgress(goal.id, {
          status,
          progressPercent: status === "settled" ? 100 : progress,
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
    <Card className="min-w-0 max-w-full overflow-hidden">
      <CardContent className="grid min-w-0 max-w-full gap-4 overflow-x-clip">
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
              {goal.needsRevisit ? (
                <p className="text-violet-300 sm:col-span-2">
                  Trzeba wrócić{goal.revisitAt ? ` · ${formatDate(goal.revisitAt)}` : ""}
                </p>
              ) : null}
              {goal.deferralCount > 0 ? (
                <p className="text-amber-300 sm:col-span-2">
                  Przekładany {goal.deferralCount}×
                  {goal.lastDeferralReason
                    ? ` · ${GOAL_DEFERRAL_REASON_LABELS[goal.lastDeferralReason]}`
                    : ""}
                </p>
              ) : null}
            </div>

            <Field label="Status">
              <Select
                value={goal.status === "settled" ? "settled" : status}
                disabled={statusSaving}
                onChange={(event) => {
                  const next = event.target.value as GoalStatus | "settle_gate";
                  if (next === "settle_gate" || next === "settled") {
                    void applyStatusChange("settled");
                    return;
                  }
                  setStatus(next);
                  void applyStatusChange(next);
                }}
              >
                {(["planned", "in_progress", "at_risk", "on_hold", "cancelled"] as GoalStatus[]).map(
                  (entry) => (
                    <option key={entry} value={entry}>
                      {GOAL_STATUS_LABELS[entry]}
                    </option>
                  ),
                )}
                {goal.status === "settled" ? (
                  <option value="settled">{GOAL_STATUS_LABELS.settled}</option>
                ) : (
                  <option value="settle_gate">{GOAL_STATUS_LABELS.settled}…</option>
                )}
              </Select>
            </Field>

            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-foreground">{goal.progressPercent}% realizacji</p>

            <GoalDeferRevisitActions
              goal={goal}
              authorId={currentProfileId}
              onChanged={onChanged}
            />

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

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <div>
              <Button type="button" variant="secondary" onClick={beginEditing}>
                Edytuj
              </Button>
            </div>

            <GoalSettlementGateDialog
              goal={goal}
              open={settlementOpen}
              onOpenChange={setSettlementOpen}
              currentProfileId={currentProfileId}
              onSettled={(settledGoal) => {
                setSettlementOpen(false);
                if (settledGoal) {
                  setStatus(settledGoal.status);
                  setProgress(settledGoal.progressPercent);
                  onChanged(settledGoal);
                }
              }}
            />
          </>
        ) : (
          <div className="grid min-w-0 max-w-full gap-4 overflow-x-clip">
            <Field label="Nazwa celu" className="min-w-0">
              <Input
                className="min-w-0 max-w-full"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Opis" className="min-w-0">
              <Textarea
                className="min-w-0 max-w-full"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </Field>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Data początkowa" className="min-w-0">
                <Input
                  type="date"
                  className="min-w-0 max-w-full"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                />
              </Field>
              <Field label="Data docelowa" className="min-w-0">
                <Input
                  type="date"
                  className="min-w-0 max-w-full"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                />
              </Field>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Priorytet" className="min-w-0">
                <Select
                  className="min-w-0 max-w-full"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Goal["priority"])}
                >
                  {GOAL_PRIORITIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {GOAL_PRIORITY_LABELS[entry]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Właściciel" className="min-w-0">
                <Select
                  className="min-w-0 max-w-full"
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                >
                  <option value="">— brak —</option>
                  {teamProfiles.map((member) => (
                    <option key={member.id} value={member.id}>
                      {getUserDisplayName(member)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" className="min-w-0">
                <Select
                  className="min-w-0 max-w-full"
                  value={status === "settled" ? "settled" : status}
                  onChange={(event) => {
                    const next = event.target.value as GoalStatus | "settle_gate";
                    if (next === "settle_gate" || next === "settled") {
                      setSettlementOpen(true);
                      return;
                    }
                    setStatus(next);
                  }}
                >
                  {(["planned", "in_progress", "at_risk", "on_hold", "cancelled"] as GoalStatus[]).map(
                    (entry) => (
                      <option key={entry} value={entry}>
                        {GOAL_STATUS_LABELS[entry]}
                      </option>
                    ),
                  )}
                  {status === "settled" || goal.status === "settled" ? (
                    <option value="settled">{GOAL_STATUS_LABELS.settled}</option>
                  ) : (
                    <option value="settle_gate">{GOAL_STATUS_LABELS.settled}…</option>
                  )}
                </Select>
              </Field>
              <Field label="Procent realizacji" className="min-w-0">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="min-w-0 max-w-full"
                  value={progressInput.value}
                  onChange={(event) => progressInput.onChange(event.target.value)}
                  onBlur={progressInput.onBlur}
                />
              </Field>
            </div>
            <div className="min-w-0 max-w-full">
              <ProjectSelectSearchable
                projects={projects}
                clients={clients}
                value={projectId}
                onChange={setProjectId}
                usePortal={false}
                className="min-w-0 max-w-full"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-foreground/90">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              />
              <span>
                Cel cykliczny — po rozliczeniu automatycznie utwórz następny okres
                {!isRecurring && goal.isRecurring ? (
                  <span className="mt-0.5 block text-xs text-amber-300/90">
                    Wyłączenie cykliczności zatrzyma tworzenie kolejnych okresów po rozliczeniu.
                  </span>
                ) : null}
              </span>
            </label>
            <Field label="Notatka do zmiany (opcjonalnie)" className="min-w-0">
              <Textarea
                className="min-w-0 max-w-full"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
              />
            </Field>

            <GoalDeferRevisitActions
              goal={{
                ...goal,
                status,
                periodStart,
                periodEnd,
                progressPercent: progress,
                projectId,
                ownerId: ownerId || null,
              }}
              authorId={currentProfileId}
              onChanged={(updated) => {
                onChanged(updated);
                setStatus(updated.status);
                setPeriodStart(updated.periodStart.slice(0, 10));
                setPeriodEnd(updated.periodEnd.slice(0, 10));
                setProgress(updated.progressPercent);
                setProjectId(updated.projectId);
                setOwnerId(updated.ownerId ?? "");
              }}
            />

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Anuluj
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>

            <GoalSettlementGateDialog
              goal={goal}
              open={settlementOpen}
              onOpenChange={setSettlementOpen}
              currentProfileId={currentProfileId}
              onSettled={(settledGoal) => {
                setSettlementOpen(false);
                setEditing(false);
                if (settledGoal) {
                  setStatus(settledGoal.status);
                  setProgress(settledGoal.progressPercent);
                  onChanged(settledGoal);
                }
              }}
            />
          </div>
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
  teamProfiles,
  getOwnerName,
}: {
  updates: GoalUpdateEntry[];
  teamProfiles: UserProfile[];
  getOwnerName: (id: string | null) => string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        {updates.length === 0 ? <p className="text-sm text-muted">Brak zapisanej historii zmian.</p> : null}
        {updates.map((entry) => {
          const authorProfile = entry.authorId
            ? teamProfiles.find((member) => member.id === entry.authorId) ?? null
            : null;
          return (
            <div key={entry.id} className="rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm">
              <UserIdentity
                profile={authorProfile}
                name={getOwnerName(entry.authorId)}
                size="xs"
                subtitle={formatDateTime(entry.createdAt)}
              />
              <p className="mt-2 text-foreground/90">
                {entry.previousStatus !== entry.newStatus && entry.newStatus ? (
                  <>Status: {GOAL_STATUS_LABELS[entry.previousStatus as GoalStatus] ?? "—"} → {GOAL_STATUS_LABELS[entry.newStatus]}. </>
                ) : null}
                {entry.previousProgress !== entry.newProgress ? (
                  <>Realizacja: {entry.previousProgress ?? 0}% → {entry.newProgress ?? 0}%.</>
                ) : null}
              </p>
              {entry.note ? <p className="mt-1 text-muted">{entry.note}</p> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CommentsTab({
  goalId,
  comments,
  authorId,
  authorName,
  teamProfiles,
  boardId,
  goalTitle,
  onChanged,
}: {
  goalId: string;
  comments: GoalComment[];
  authorId: string | null;
  authorName: string;
  teamProfiles: UserProfile[];
  boardId: string;
  goalTitle: string;
  onChanged: () => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const { candidates, mentionOptions } = useMentionOptionsFromProfiles(teamProfiles);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const comment = await addGoalComment({ goalId, authorId, authorName, body });
      void createUserMentionNotifications({
        sourceId: comment.id,
        authorName,
        body,
        candidates,
        contextLabel: "w komentarzu do celu",
        subjectLabel: goalTitle,
        linkUrl: `/tablice-celow/${boardId}/${goalId}`,
        excludeProfileIds: authorId ? [authorId] : [],
      }).catch(() => undefined);
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
        {comments.map((comment) => {
          const authorProfile = teamProfiles.find((member) => member.id === comment.authorId) ?? null;
          return (
            <div key={comment.id} className="rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm">
              <UserIdentity
                profile={authorProfile}
                name={comment.authorName}
                size="xs"
                subtitle={formatDateTime(comment.createdAt)}
              />
              <p className="mt-2 text-foreground/90">{comment.body}</p>
            </div>
          );
        })}
        <div className="flex gap-2 border-t border-border/60 pt-3">
          <MentionTextarea
            value={body}
            onChange={setBody}
            mentionOptions={mentionOptions}
            rows={2}
            placeholder="Napisz komentarz… użyj @ aby oznaczyć"
            className="min-h-[4.5rem] flex-1"
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
  const reviewOutcomes = useGoalStore((state) => state.moduleSettings.reviewOutcomes);
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
                  {resolveReviewOutcomeLabel(review.outcome, reviewOutcomes)}
                </p>
              ) : (
                <p className="text-xs text-amber-300">Otwarty — wymaga akcji</p>
              )}
            </div>
            {!review.completedAt && canClose ? (
              <div className="flex flex-wrap gap-1.5">
                {reviewOutcomes.map((entry) => (
                  <Button
                    key={entry.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleClose(review, entry.id)}
                  >
                    {entry.label}
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
