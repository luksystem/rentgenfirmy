"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatPartyName } from "@/lib/party/display-name";
import { GoalAiAdvisorPanel } from "@/components/goals/goal-ai-advisor-panel";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import {
  GOAL_LEVEL_LABELS,
  GOAL_LEVELS,
  GOAL_PERIOD_TYPE_LABELS,
  GOAL_PERIOD_TYPES,
  GOAL_PRIORITIES,
  GOAL_PRIORITY_LABELS,
  type GoalAiAdviceResponse,
  type GoalLevel,
  type GoalPeriodType,
  type GoalPriority,
} from "@/lib/goals/types";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import { addGoalInitiative, upsertGoalKpi, markGoalAiSuggestionAccepted } from "@/lib/supabase/goal-repository";
import {
  ensureAnchoredTemplateSnapshot,
  fetchProcessTemplateByProjectType,
  getOrCreateProjectProcess,
} from "@/lib/supabase/process-repository";
import type { ProcessStage } from "@/lib/process/types";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultPeriodEnd(periodType: GoalPeriodType) {
  const end = new Date();
  switch (periodType) {
    case "daily":
      break;
    case "weekly":
      end.setDate(end.getDate() + 6);
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      break;
    case "quarterly":
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      break;
    case "annual":
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      break;
  }
  return end.toISOString().slice(0, 10);
}

export function CreateGoalDialog({
  boardId,
  triggerClassName,
}: {
  boardId: string;
  triggerClassName?: string;
}) {
  const profile = useAuthStore((state) => state.profile);
  const teamProfiles = useGoalStore((state) => state.teamProfiles);
  const methodologies = useGoalStore((state) => state.methodologies);
  const boards = useGoalStore((state) => state.boards);
  const createGoal = useGoalStore((state) => state.createGoal);
  const projectScope = useGoalStore((state) => state.moduleSettings.projectScope);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);

  const board = useMemo(() => boards.find((entry) => entry.id === boardId) ?? null, [boards, boardId]);
  const selectableProjects = useMemo(
    () => (projectScope === "active" ? projects.filter((entry) => entry.isActive) : projects),
    [projects, projectScope],
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<GoalLevel>("individual");
  const [ownerId, setOwnerId] = useState(profile?.id ?? "");
  const [priority, setPriority] = useState<GoalPriority>("normal");
  const [periodType, setPeriodType] = useState<GoalPeriodType>("monthly");
  const [periodStart, setPeriodStart] = useState(todayIso());
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd("monthly"));
  const [isRecurring, setIsRecurring] = useState(false);
  const [methodologyId, setMethodologyId] = useState("");
  const [methodologyFields, setMethodologyFields] = useState<Record<string, string>>({});
  const [pendingAiAdvice, setPendingAiAdvice] = useState<GoalAiAdviceResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [processStageId, setProcessStageId] = useState("");
  const [processMilestoneId, setProcessMilestoneId] = useState("");
  const [stageOptions, setStageOptions] = useState<ProcessStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  const selectedMethodology = useMemo(
    () => methodologies.find((entry) => entry.code === methodologyId) ?? null,
    [methodologies, methodologyId],
  );

  const milestoneOptions = useMemo(
    () => stageOptions.find((stage) => stage.id === processStageId)?.milestones ?? [],
    [stageOptions, processStageId],
  );

  useEffect(() => {
    if (!projectId) {
      setStageOptions([]);
      setProcessStageId("");
      setProcessMilestoneId("");
      return;
    }
    const project = projects.find((entry) => entry.id === projectId);
    if (!project) return;

    if (project.clientId) {
      setClientId(project.clientId);
    }

    let cancelled = false;
    setLoadingStages(true);
    (async () => {
      try {
        const liveTemplate = await fetchProcessTemplateByProjectType(project.type);
        const projectProcess = await getOrCreateProjectProcess(project.id, project.type);
        const anchored = projectProcess.templateSnapshot
          ? projectProcess
          : liveTemplate
            ? await ensureAnchoredTemplateSnapshot(project.id, liveTemplate)
            : projectProcess;
        if (cancelled) return;
        const stages = anchored.templateSnapshot?.stages ?? liveTemplate?.stages ?? [];
        setStageOptions(stages);
      } catch {
        if (!cancelled) setStageOptions([]);
      } finally {
        if (!cancelled) setLoadingStages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId);
    setProcessStageId("");
    setProcessMilestoneId("");
    if (!nextProjectId) {
      setClientId("");
    }
  }

  function handleStageChange(stageId: string) {
    setProcessStageId(stageId);
    setProcessMilestoneId("");
  }

  function handleApplyAiAdvice(advice: GoalAiAdviceResponse) {
    if (advice.recommendedMethodologyCode) {
      setMethodologyId(advice.recommendedMethodologyCode);
    }
    setMethodologyFields((prev) => ({ ...prev, ...advice.structure.fields }));
    setPendingAiAdvice(advice);
  }

  function handlePeriodTypeChange(next: GoalPeriodType) {
    setPeriodType(next);
    setPeriodEnd(defaultPeriodEnd(next));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Podaj nazwę celu.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const goal = await createGoal({
        boardId,
        level,
        name: name.trim(),
        description: description.trim(),
        ownerId: ownerId || null,
        priority,
        status: "planned",
        periodType,
        periodStart,
        periodEnd,
        methodologyId: methodologyId || null,
        methodologyFields,
        isRecurring,
        projectId: projectId || null,
        clientId: clientId || null,
        processStageId: processStageId || null,
        processMilestoneId: processMilestoneId || null,
        createdBy: profile?.id ?? null,
      });

      if (pendingAiAdvice) {
        const structure = pendingAiAdvice.structure;
        await Promise.all([
          markGoalAiSuggestionAccepted(pendingAiAdvice.suggestionId, goal.id),
          ...structure.kpis.map((kpi, index) =>
            upsertGoalKpi({
              goalId: goal.id,
              name: kpi.name,
              unit: kpi.unit,
              targetValue: kpi.target,
              currentValue: 0,
              source: "system",
              position: index,
            }),
          ),
          ...structure.initiatives.map((title) =>
            addGoalInitiative({ goalId: goal.id, kind: "initiative", title, source: "ai" }),
          ),
          ...structure.tasks.map((title) =>
            addGoalInitiative({ goalId: goal.id, kind: "task", title, source: "ai" }),
          ),
          ...structure.resources.map((title) =>
            addGoalInitiative({ goalId: goal.id, kind: "resource", title, source: "ai" }),
          ),
          ...(structure.budgetEstimate.amount > 0
            ? [
                addGoalInitiative({
                  goalId: goal.id,
                  kind: "budget",
                  title: `Budżet: ${structure.budgetEstimate.amount} ${structure.budgetEstimate.currency}`,
                  description: structure.budgetEstimate.note,
                  estimatedValue: structure.budgetEstimate.amount,
                  estimatedUnit: structure.budgetEstimate.currency,
                  source: "ai" as const,
                }),
              ]
            : []),
        ]);
      }

      setOpen(false);
      setName("");
      setDescription("");
      setMethodologyFields({});
      setPendingAiAdvice(null);
      setProjectId("");
      setClientId("");
      setProcessStageId("");
      setProcessMilestoneId("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się utworzyć celu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className={triggerClassName}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy cel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nowy cel</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Nazwa celu">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Opis">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Np. Chcemy skrócić czas realizacji projektu z 8 do 6 miesięcy."
            />
          </Field>

          <GoalAiAdvisorPanel
            description={`${name}\n${description}`.trim()}
            level={level}
            boardKind={board?.kind ?? ""}
            methodologies={methodologies}
            onApply={handleApplyAiAdvice}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Poziom">
              <Select value={level} onChange={(event) => setLevel(event.target.value as GoalLevel)}>
                {GOAL_LEVELS.map((entry) => (
                  <option key={entry} value={entry}>
                    {GOAL_LEVEL_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priorytet">
              <Select
                value={priority}
                onChange={(event) => setPriority(event.target.value as GoalPriority)}
              >
                {GOAL_PRIORITIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {GOAL_PRIORITY_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Właściciel">
              <Select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                <option value="">— wybierz —</option>
                {teamProfiles.map((member) => (
                  <option key={member.id} value={member.id}>
                    {profileToOptionLabel(member)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Okres">
              <Select
                value={periodType}
                onChange={(event) => handlePeriodTypeChange(event.target.value as GoalPeriodType)}
              >
                {GOAL_PERIOD_TYPES.map((entry) => (
                  <option key={entry} value={entry}>
                    {GOAL_PERIOD_TYPE_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data rozpoczęcia">
              <Input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
            </Field>
            <Field label="Planowane zakończenie">
              <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(event) => setIsRecurring(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Cel cykliczny — po rozliczeniu automatycznie utwórz następny okres
          </label>

          <div className="grid gap-3 overflow-visible rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Powiązania (opcjonalnie)
            </p>
            <div className="grid gap-3 overflow-visible sm:grid-cols-2">
              <div className="relative z-20 overflow-visible">
                <ProjectSelectSearchable
                  projects={selectableProjects}
                  clients={clients}
                  value={projectId || null}
                  onChange={(nextId) => handleProjectChange(nextId ?? "")}
                  usePortal={false}
                />
                {selectableProjects.length === 0 ? (
                  <p className="mt-1 text-xs font-normal text-muted">
                    Brak projektów do wyboru
                    {projectScope === "active"
                      ? " (w ustawieniach modułu możesz włączyć także nieaktywne projekty)."
                      : "."}
                  </p>
                ) : null}
              </div>
              <Field label="Klient">
                <Select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                  <option value="">— brak —</option>
                  {clients.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {formatPartyName(entry)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Etap procesu">
                <Select
                  value={processStageId}
                  disabled={!projectId || loadingStages}
                  onChange={(event) => handleStageChange(event.target.value)}
                >
                  <option value="">
                    {!projectId
                      ? "Wybierz projekt"
                      : loadingStages
                        ? "Ładowanie..."
                        : stageOptions.length === 0
                          ? "Brak etapów w procesie"
                          : "— brak —"}
                  </option>
                  {stageOptions.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Kamień milowy">
                <Select
                  value={processMilestoneId}
                  disabled={!processStageId}
                  onChange={(event) => setProcessMilestoneId(event.target.value)}
                >
                  <option value="">— brak —</option>
                  {milestoneOptions.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <Field label="Metodologia (opcjonalnie)">
            <Select value={methodologyId} onChange={(event) => setMethodologyId(event.target.value)}>
              <option value="">— bez metodologii —</option>
              {methodologies.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.name}
                </option>
              ))}
            </Select>
          </Field>

          {selectedMethodology && selectedMethodology.fieldSchema.length > 0 ? (
            <div className="grid gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Szablon: {selectedMethodology.name}
              </p>
              {selectedMethodology.fieldSchema.map((field) => (
                <Field key={field.key} label={field.label}>
                  {field.type === "textarea" || field.type === "list" ? (
                    <Textarea
                      rows={2}
                      value={methodologyFields[field.key] ?? ""}
                      onChange={(event) =>
                        setMethodologyFields((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={methodologyFields[field.key] ?? ""}
                      onChange={(event) =>
                        setMethodologyFields((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Zapisywanie..." : "Utwórz cel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
