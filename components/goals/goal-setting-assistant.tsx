"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { GoalAssistantDraft } from "@/lib/ai/goal-project-assistant";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import {
  GOAL_LEVEL_LABELS,
  GOAL_LEVELS,
  GOAL_PERIOD_TYPE_LABELS,
  GOAL_PERIOD_TYPES,
  GOAL_PRIORITY_LABELS,
  GOAL_PRIORITIES,
  type Goal,
  type GoalLevel,
  type GoalPeriodType,
  type GoalPriority,
} from "@/lib/goals/types";
import { fetchAllGoals } from "@/lib/supabase/goal-repository";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";
import { useProcessStore } from "@/store/process-store";

type DraftGoal = GoalAssistantDraft & { draftId: string; selected: boolean; ownerId: string };

function toDrafts(goals: GoalAssistantDraft[]): DraftGoal[] {
  return goals.map((goal) => ({ ...goal, draftId: crypto.randomUUID(), selected: true, ownerId: "" }));
}

export function GoalSettingAssistant() {
  const profile = useAuthStore((state) => state.profile);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const fieldOptions = useAppStore((state) => state.fieldOptions);

  const processHydrated = useProcessStore((state) => state.hydrated);
  const processHydrate = useProcessStore((state) => state.hydrate);
  const getProjectProcess = useProcessStore((state) => state.getProjectProcess);
  const getTemplateByProjectType = useProcessStore((state) => state.getTemplateByProjectType);

  const goalHydrated = useGoalStore((state) => state.hydrated);
  const goalHydrate = useGoalStore((state) => state.hydrate);
  const boards = useGoalStore((state) => state.boards);
  const teamProfiles = useGoalStore((state) => state.teamProfiles);
  const createGoal = useGoalStore((state) => state.createGoal);

  const [allGoals, setAllGoals] = useState<Goal[] | null>(null);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftGoal[]>>({});
  const [targetBoardId, setTargetBoardId] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!processHydrated) void processHydrate(fieldOptions.projectTypes);
  }, [processHydrated, processHydrate, fieldOptions.projectTypes]);

  useEffect(() => {
    if (!goalHydrated) void goalHydrate();
  }, [goalHydrated, goalHydrate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGoals(true);
      try {
        const goals = await fetchAllGoals();
        if (!cancelled) setAllGoals(goals);
      } catch {
        if (!cancelled) setAllGoals([]);
      } finally {
        if (!cancelled) setLoadingGoals(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeProjects = useMemo(() => projects.filter((project) => project.isActive), [projects]);

  const goalsByProject = useMemo(() => {
    const map = new Map<string, Goal[]>();
    for (const goal of allGoals ?? []) {
      if (!goal.projectId) continue;
      map.set(goal.projectId, [...(map.get(goal.projectId) ?? []), goal]);
    }
    return map;
  }, [allGoals]);

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  function stageContextForProject(projectId: string, projectType: string) {
    const process = getProjectProcess(projectId);
    if (!process) return { stageTitle: null, stageDescription: null };
    const liveTemplate = getTemplateByProjectType(projectType);
    const template = resolveAnchoredProcessTemplate(process, liveTemplate);
    const stage = template?.stages.find((entry) => entry.id === process.activeStageId) ?? null;
    return { stageTitle: stage?.title ?? null, stageDescription: stage?.description ?? null };
  }

  async function handleAnalyze(projectId: string) {
    const project = activeProjects.find((entry) => entry.id === projectId);
    if (!project) return;
    setExpandedProjectId(projectId);
    setGenerating((current) => ({ ...current, [projectId]: true }));
    setErrors((current) => ({ ...current, [projectId]: "" }));
    try {
      const { stageTitle, stageDescription } = stageContextForProject(projectId, project.type);
      const existingGoalTitles = (goalsByProject.get(projectId) ?? []).map((goal) => goal.name);
      const client = project.clientId ? clientsById.get(project.clientId) : null;
      const response = await fetch("/api/goals/ai/assistant-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          clientName: client?.fullName ?? null,
          projectType: project.type,
          stageTitle,
          stageDescription,
          existingGoalTitles,
        }),
      });
      const payload = (await response.json()) as { goals?: GoalAssistantDraft[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wygenerować propozycji.");
      }
      setDrafts((current) => ({ ...current, [projectId]: toDrafts(payload.goals ?? []) }));
      const defaultBoard = boards.find((board) => board.kind === "project") ?? boards[0];
      if (defaultBoard) {
        setTargetBoardId((current) => ({ ...current, [projectId]: current[projectId] ?? defaultBoard.id }));
      }
    } catch (analyzeError) {
      setErrors((current) => ({
        ...current,
        [projectId]: analyzeError instanceof Error ? analyzeError.message : "Błąd analizy AI.",
      }));
    } finally {
      setGenerating((current) => ({ ...current, [projectId]: false }));
    }
  }

  function updateDraft(projectId: string, draftId: string, patch: Partial<DraftGoal>) {
    setDrafts((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).map((draft) => (draft.draftId === draftId ? { ...draft, ...patch } : draft)),
    }));
  }

  async function handleAddSelected(projectId: string) {
    const projectDrafts = (drafts[projectId] ?? []).filter((draft) => draft.selected && draft.title.trim());
    const boardId = targetBoardId[projectId];
    if (!boardId) {
      setErrors((current) => ({ ...current, [projectId]: "Wybierz tablicę, do której dodać cele." }));
      return;
    }
    if (!projectDrafts.length) {
      setErrors((current) => ({ ...current, [projectId]: "Zaznacz co najmniej jeden cel." }));
      return;
    }
    setCreating((current) => ({ ...current, [projectId]: true }));
    setErrors((current) => ({ ...current, [projectId]: "" }));
    try {
      for (const draft of projectDrafts) {
        await createGoal({
          boardId,
          level: draft.level,
          name: draft.title.trim(),
          description: draft.description.trim(),
          ownerId: draft.ownerId || null,
          priority: draft.priority,
          status: "planned",
          periodType: draft.periodType,
          periodStart: draft.periodStart,
          periodEnd: draft.periodEnd,
          methodologyId: draft.methodologyCode,
          isRecurring: draft.isRecurring,
          projectId,
          createdBy: profile?.id ?? null,
        });
      }
      setMessage(`Dodano ${projectDrafts.length} celów.`);
      setDrafts((current) => ({ ...current, [projectId]: [] }));
      setAllGoals(await fetchAllGoals());
    } catch (createError) {
      setErrors((current) => ({
        ...current,
        [projectId]: createError instanceof Error ? createError.message : "Nie udało się dodać celów.",
      }));
    } finally {
      setCreating((current) => ({ ...current, [projectId]: false }));
    }
  }

  if (loadingGoals || !processHydrated) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie projektów i procesów...
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Asystent przechodzi po wszystkich aktywnych projektach, sprawdza czy mają wyznaczone cele i analizuje to z
        aktywnym etapem procesu (oraz jego opisem), by zaproponować, jakie cele warto ustalić i dla jakiej roli.
      </p>
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

      <div className="grid gap-3">
        {activeProjects.map((project) => {
          const client = project.clientId ? clientsById.get(project.clientId) : null;
          const { stageTitle, stageDescription } = stageContextForProject(project.id, project.type);
          const goalCount = (goalsByProject.get(project.id) ?? []).filter(
            (goal) => goal.status !== "cancelled" && goal.status !== "settled",
          ).length;
          const isExpanded = expandedProjectId === project.id;
          const projectDrafts = drafts[project.id] ?? [];

          return (
            <Card key={project.id}>
              <CardContent className="grid gap-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {project.name}
                      {client ? <span className="text-muted"> · {client.fullName}</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      Aktywny etap: {stageTitle ?? "nieustalony"}
                      {stageDescription ? ` — ${stageDescription}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {goalCount > 0 ? (
                      <Badge tone="neutral">{goalCount} aktywnych celów</Badge>
                    ) : (
                      <Badge tone="critical">Brak celów</Badge>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={generating[project.id]}
                      onClick={() => void handleAnalyze(project.id)}
                    >
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      {generating[project.id] ? "Analiza…" : "Analizuj z AI"}
                    </Button>
                  </div>
                </div>

                {errors[project.id] ? <p className="text-xs text-rose-400">{errors[project.id]}</p> : null}

                {isExpanded && projectDrafts.length > 0 ? (
                  <div className="grid gap-3 border-t border-border/60 pt-3">
                    <div className="flex flex-wrap items-end gap-3">
                      <Field label="Dodaj do tablicy" className="min-w-[220px]">
                        <Select
                          value={targetBoardId[project.id] ?? ""}
                          onChange={(event) =>
                            setTargetBoardId((current) => ({ ...current, [project.id]: event.target.value }))
                          }
                        >
                          <option value="">— wybierz tablicę —</option>
                          {boards.map((board) => (
                            <option key={board.id} value={board.id}>
                              {board.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Button
                        type="button"
                        size="sm"
                        disabled={creating[project.id]}
                        onClick={() => void handleAddSelected(project.id)}
                      >
                        {creating[project.id]
                          ? "Dodawanie…"
                          : `Dodaj ${projectDrafts.filter((draft) => draft.selected).length} celów`}
                      </Button>
                    </div>

                    {projectDrafts.map((draft) => (
                      <div key={draft.draftId} className="grid gap-2 rounded-lg border border-border/60 bg-surface/50 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={draft.selected}
                              onChange={(event) =>
                                updateDraft(project.id, draft.draftId, { selected: event.target.checked })
                              }
                            />
                            Cel
                          </label>
                          <Badge tone="blue">Dla: {draft.suggestedRole}</Badge>
                        </div>
                        <Input
                          value={draft.title}
                          onChange={(event) => updateDraft(project.id, draft.draftId, { title: event.target.value })}
                        />
                        <Textarea
                          value={draft.description}
                          rows={2}
                          onChange={(event) =>
                            updateDraft(project.id, draft.draftId, { description: event.target.value })
                          }
                        />
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Field label="Poziom">
                            <Select
                              value={draft.level}
                              onChange={(event) =>
                                updateDraft(project.id, draft.draftId, { level: event.target.value as GoalLevel })
                              }
                            >
                              {GOAL_LEVELS.map((entry) => (
                                <option key={entry} value={entry}>
                                  {GOAL_LEVEL_LABELS[entry]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Priorytet">
                            <Select
                              value={draft.priority}
                              onChange={(event) =>
                                updateDraft(project.id, draft.draftId, {
                                  priority: event.target.value as GoalPriority,
                                })
                              }
                            >
                              {GOAL_PRIORITIES.map((entry) => (
                                <option key={entry} value={entry}>
                                  {GOAL_PRIORITY_LABELS[entry]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Okres">
                            <Select
                              value={draft.periodType}
                              onChange={(event) =>
                                updateDraft(project.id, draft.draftId, {
                                  periodType: event.target.value as GoalPeriodType,
                                })
                              }
                            >
                              {GOAL_PERIOD_TYPES.map((entry) => (
                                <option key={entry} value={entry}>
                                  {GOAL_PERIOD_TYPE_LABELS[entry]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Field label="Start">
                            <Input
                              type="date"
                              value={draft.periodStart}
                              onChange={(event) =>
                                updateDraft(project.id, draft.draftId, { periodStart: event.target.value })
                              }
                            />
                          </Field>
                          <Field label="Termin">
                            <Input
                              type="date"
                              value={draft.periodEnd}
                              onChange={(event) =>
                                updateDraft(project.id, draft.draftId, { periodEnd: event.target.value })
                              }
                            />
                          </Field>
                          <Field label="Właściciel">
                            <Select
                              value={draft.ownerId}
                              onChange={(event) =>
                                updateDraft(project.id, draft.draftId, { ownerId: event.target.value })
                              }
                            >
                              <option value="">— brak —</option>
                              {teamProfiles.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {profileToOptionLabel(member)}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
        {activeProjects.length === 0 ? <p className="text-sm text-muted">Brak aktywnych projektów.</p> : null}
      </div>
    </div>
  );
}
