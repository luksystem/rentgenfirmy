"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Scissors, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatPartyName } from "@/lib/party/display-name";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/auth/types";
import type { ProcessStage } from "@/lib/process/types";
import { ensureAnchoredTemplateSnapshot } from "@/lib/supabase/process-repository";
import { fetchProcessTemplateByProjectType, getOrCreateProjectProcess } from "@/lib/supabase/process-repository";
import { pickLinkedGroupSharedFields } from "@/lib/supabase/resource-plan-repository";
import type { ResourcePlanItem, ResourcePlanItemInput, ResourcePlanParticipant } from "@/lib/resource-plan/types";
import { resourcePlanItemToInput } from "@/lib/resource-plan/types";
import { participantContributedHours, participantEffectiveRange } from "@/lib/resource-plan/participant-contribution";
import { validateResourcePlanItem } from "@/lib/resource-plan/validations";
import type { ResourcePlanCandidate } from "@/lib/resource-plan/suggestions";
import { getActiveSuggestionProvider } from "@/lib/resource-plan/suggestion-provider";
import { TaskChecklistPanel } from "@/components/task-checklist/task-checklist-panel";
import { ResourcePlanCompetencyRequirementsEditor } from "@/components/resource-plan/resource-plan-competency-requirements-editor";
import { readPlanItemTemplateMetadata } from "@/lib/resource-plan/plan-item-template";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useResourcePlanStore } from "@/store/resource-plan-store";
import { useUserResourceStore } from "@/store/user-resource-store";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string) {
  return new Date(value).toISOString();
}

const projectStagesCache = new Map<string, ProcessStage[]>();

function defaultInput(defaultStartIso?: string): ResourcePlanItemInput {
  const start = defaultStartIso ? new Date(defaultStartIso) : new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 4);
  return {
    projectId: null,
    clientId: null,
    processStageId: null,
    taskId: null,
    serviceIntakeRequestId: null,
    workTypeItemId: null,
    title: "",
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    plannedHours: 4,
    actualHours: null,
    assigneeId: null,
    teamItemId: null,
    statusItemId: null,
    riskItemId: null,
    riskNote: "",
    laborBudget: null,
    materialBudget: null,
    travelBudget: null,
    notes: "",
    acceptedRisk: false,
    linkedGroupId: null,
    shiftWithLinkedGroup: false,
    participants: [],
    requiredCompetencies: [],
  };
}

export function ResourcePlanSidePanel({
  open,
  onOpenChange,
  editingItem,
  defaultStartIso,
  initialTemplateId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ResourcePlanItem | null;
  defaultStartIso?: string;
  /** Szablon do automatycznego zastosowania przy otwarciu (szybkie dodawanie z toolbara). */
  initialTemplateId?: string;
  onSaved?: (item: ResourcePlanItem) => void;
}) {
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);

  const ensureDictionaries = useDictionaryStore((state) => state.ensure);
  const dictionaryItems = useDictionaryStore((state) => state.items);
  const workTypeOptions = useDictionaryStore((state) => state.byKey("work_type"));
  const statusOptions = useDictionaryStore((state) => state.byKey("plan_status"));
  const riskOptions = useDictionaryStore((state) => state.byKey("risk_level"));
  const teamOptions = useDictionaryStore((state) => state.byKey("team"));
  const roleOptions = useDictionaryStore((state) => state.byKey("operational_role"));
  const competencyOptions = useDictionaryStore((state) => state.byKey("competency"));
  const competencyLevelOptions = useDictionaryStore((state) => state.byKey("competency_level"));

  const createItem = useResourcePlanStore((state) => state.createItem);
  const updateItem = useResourcePlanStore((state) => state.updateItem);
  const splitItem = useResourcePlanStore((state) => state.splitItem);
  const applyToLinkedGroup = useResourcePlanStore((state) => state.applyToLinkedGroup);
  const mergeLinkedGroup = useResourcePlanStore((state) => state.mergeLinkedGroup);
  const setLinkedGroupShiftEnabled = useResourcePlanStore((state) => state.setLinkedGroupShiftEnabled);
  const allPlanItems = useResourcePlanStore((state) => state.allItems());

  const ensureProfiles = useUserResourceStore((state) => state.ensureProfiles);
  const resourceProfilesById = useUserResourceStore((state) => state.byUser);

  const [input, setInput] = useState<ResourcePlanItemInput>(() =>
    editingItem ? resourcePlanItemToInput(editingItem) : defaultInput(defaultStartIso),
  );
  const [stage, setStage] = useState<ProcessStage | null>(null);
  const [stageOptions, setStageOptions] = useState<ProcessStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [newParticipantId, setNewParticipantId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [applySharedFieldsToGroup, setApplySharedFieldsToGroup] = useState(true);
  const [splitDraftIso, setSplitDraftIso] = useState<string | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [confirmingMerge, setConfirmingMerge] = useState(false);
  const [merging, setMerging] = useState(false);
  const [shiftTogglePending, setShiftTogglePending] = useState(false);

  const templateOptions = useDictionaryStore((state) => state.byKey("plan_item_template"));
  const completedStatus = useMemo(
    () => statusOptions.find((option) => option.name === "Zakończone") ?? null,
    [statusOptions],
  );
  const isAlreadyCompleted = Boolean(
    completedStatus && (input.statusItemId === completedStatus.id || editingItem?.statusItemId === completedStatus.id),
  );

  function applyTemplate(template: DictionaryItem) {
    const meta = readPlanItemTemplateMetadata(template.metadata);
    setInput((current) => ({
      ...current,
      title: template.name,
      workTypeItemId: meta.workTypeItemId,
      plannedHours: meta.plannedHours ?? current.plannedHours,
      laborBudget: meta.laborBudget,
      materialBudget: meta.materialBudget,
      travelBudget: meta.travelBudget,
      riskItemId: meta.riskItemId,
      riskNote: meta.riskItemId ? current.riskNote : "",
      notes: meta.notes || current.notes,
      requiredCompetencies: meta.requiredCompetencies,
    }));
  }

  useEffect(() => {
    if (!open) return;
    setInput(editingItem ? resourcePlanItemToInput(editingItem) : defaultInput(defaultStartIso));
    setSelectedTemplateId("");
    setSplitDraftIso(null);
    setApplySharedFieldsToGroup(true);
    setConfirmingMerge(false);
    void ensureDictionaries();
    void loadTeamProfiles();
  }, [open, editingItem, defaultStartIso, ensureDictionaries, loadTeamProfiles]);

  useEffect(() => {
    if (!open || editingItem || !initialTemplateId) return;
    const template = templateOptions.find((option) => option.id === initialTemplateId);
    if (template) applyTemplate(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingItem, initialTemplateId, templateOptions.length]);

  useEffect(() => {
    const ids = input.assigneeId ? [input.assigneeId, ...input.participants.map((p) => p.userId)] : input.participants.map((p) => p.userId);
    if (ids.length) void ensureProfiles(ids);
  }, [input.assigneeId, input.participants, ensureProfiles]);

  // Do rankingu sugestii (Etap 7) potrzebujemy profili zasobowych całej wspólnej listy osób, nie
  // tylko już przypisanych — zapytanie jest deduplikowane w `ensureProfiles`, więc kolejne otwarcia
  // panelu nie generują powtórnych fetchy.
  useEffect(() => {
    if (!open) return;
    const ids = teamProfiles.map((p) => p.id);
    if (ids.length) void ensureProfiles(ids);
  }, [open, teamProfiles, ensureProfiles]);

  useEffect(() => {
    const projectId = input.projectId;
    if (!projectId) {
      setStageOptions([]);
      setStage(null);
      return;
    }
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const cachedStages = projectStagesCache.get(projectId);
    if (cachedStages) {
      setStageOptions(cachedStages);
      setStage(cachedStages.find((entry) => entry.id === input.processStageId) ?? null);
      return;
    }

    let cancelled = false;
    setLoadingStages(true);
    (async () => {
      try {
        const liveTemplate = await fetchProcessTemplateByProjectType(project.type);
        const process = await getOrCreateProjectProcess(project.id, project.type);
        const anchored = process.templateSnapshot
          ? process
          : liveTemplate
            ? await ensureAnchoredTemplateSnapshot(project.id, liveTemplate)
            : process;
        if (cancelled) return;
        const stages = anchored.templateSnapshot?.stages ?? liveTemplate?.stages ?? [];
        projectStagesCache.set(projectId, stages);
        setStageOptions(stages);
        const matched = stages.find((s) => s.id === input.processStageId) ?? null;
        setStage(matched);
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
  }, [input.projectId]);

  function applyStageSuggestions(selectedStage: ProcessStage | null) {
    if (!selectedStage) return;
    setInput((current) => ({
      ...current,
      plannedHours: current.plannedHours ?? selectedStage.estimatedLaborHours ?? current.plannedHours,
      laborBudget: current.laborBudget ?? selectedStage.defaultLaborBudget ?? current.laborBudget,
      materialBudget: current.materialBudget ?? selectedStage.defaultMaterialBudget ?? current.materialBudget,
      riskItemId: current.riskItemId ?? selectedStage.defaultRiskItemId ?? current.riskItemId,
      requiredCompetencies:
        current.requiredCompetencies.length > 0
          ? current.requiredCompetencies
          : (selectedStage.requiredCompetencies ?? []).map((requirement) => ({
              competencyItemId: requirement.competencyItemId,
              minLevelItemId: requirement.minLevelItemId,
            })),
    }));
  }

  const profilesById = useMemo(() => Object.fromEntries(teamProfiles.map((p) => [p.id, p])), [teamProfiles]);

  const warnings = useMemo(
    () =>
      validateResourcePlanItem({
        input,
        editingId: editingItem?.id ?? null,
        otherItems: allPlanItems,
        stage,
        profilesById,
        resourceProfilesById,
        dictionaryItems,
      }),
    [input, editingItem, allPlanItems, stage, profilesById, resourceProfilesById, dictionaryItems],
  );

  // Ranking kandydatów do przypisania jako osoba odpowiedzialna — pochodzi z aktywnego dostawcy
  // sugestii (Etap 7: regułowy; Etap 8: punkt rozszerzenia pod AI, patrz `suggestion-provider.ts`).
  // Interfejs dostawcy jest asynchroniczny, więc `useEffect` + `useState`, nie `useMemo`.
  const [suggestions, setSuggestions] = useState<ResourcePlanCandidate[]>([]);
  useEffect(() => {
    if (!open) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    getActiveSuggestionProvider()
      .getCandidates({
        input,
        editingId: editingItem?.id ?? null,
        candidateUserIds: teamProfiles.map((p) => p.id),
        otherItems: allPlanItems,
        stage,
        profilesById,
        resourceProfilesById,
        dictionaryItems,
        limit: 5,
      })
      .then((result) => {
        if (!cancelled) setSuggestions(result);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, input, editingItem, teamProfiles, allPlanItems, stage, profilesById, resourceProfilesById, dictionaryItems]);

  const project = projects.find((p) => p.id === input.projectId) ?? null;

  function selectProject(projectId: string) {
    const nextProject = projects.find((p) => p.id === projectId) ?? null;
    setInput((current) => ({
      ...current,
      projectId: projectId || null,
      clientId: nextProject?.clientId ?? null,
      processStageId: null,
    }));
    setStage(null);
  }

  function selectStage(stageId: string) {
    const selected = stageOptions.find((s) => s.id === stageId) ?? null;
    setStage(selected);
    setInput((current) => ({ ...current, processStageId: stageId || null }));
    applyStageSuggestions(selected);
  }

  function addParticipant() {
    if (!newParticipantId) return;
    if (input.participants.some((p) => p.userId === newParticipantId)) return;
    const participant: ResourcePlanParticipant = {
      userId: newParticipantId,
      roleItemId: null,
      isLead: false,
      involvementPercent: 100,
      startAt: null,
      endAt: null,
    };
    setInput((current) => ({ ...current, participants: [...current.participants, participant] }));
    setNewParticipantId("");
  }

  function updateParticipant(userId: string, patch: Partial<ResourcePlanParticipant>) {
    setInput((current) => ({
      ...current,
      participants: current.participants.map((p) => (p.userId === userId ? { ...p, ...patch } : p)),
    }));
  }

  function removeParticipant(userId: string) {
    setInput((current) => ({ ...current, participants: current.participants.filter((p) => p.userId !== userId) }));
  }

  const linkedGroupMembers = useMemo(
    () =>
      editingItem?.linkedGroupId
        ? allPlanItems
            .filter((planItem) => planItem.linkedGroupId === editingItem.linkedGroupId)
            .sort((a, b) => a.startAt.localeCompare(b.startAt))
        : [],
    [allPlanItems, editingItem],
  );

  async function handleSplit() {
    if (!editingItem || !splitDraftIso) return;
    setSplitting(true);
    setError(null);
    try {
      await splitItem(editingItem, splitDraftIso);
      onSaved?.(editingItem);
      onOpenChange(false);
    } catch (splitError) {
      setError(splitError instanceof Error ? splitError.message : "Nie udało się podzielić przydziału.");
    } finally {
      setSplitting(false);
    }
  }

  async function handleMerge() {
    if (!editingItem?.linkedGroupId) return;
    setMerging(true);
    setError(null);
    try {
      const merged = await mergeLinkedGroup(editingItem.linkedGroupId);
      onSaved?.(merged);
      onOpenChange(false);
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : "Nie udało się scalić przydziału.");
    } finally {
      setMerging(false);
      setConfirmingMerge(false);
    }
  }

  async function handleToggleShift(enabled: boolean) {
    if (!editingItem?.linkedGroupId) return;
    setInput((current) => ({ ...current, shiftWithLinkedGroup: enabled }));
    setShiftTogglePending(true);
    try {
      await setLinkedGroupShiftEnabled(editingItem.linkedGroupId, enabled);
    } catch {
      setInput((current) => ({ ...current, shiftWithLinkedGroup: !enabled }));
    } finally {
      setShiftTogglePending(false);
    }
  }

  async function handleMarkCompleted() {
    if (!editingItem || !completedStatus) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await updateItem(editingItem.id, {
        ...input,
        statusItemId: completedStatus.id,
      });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zakończyć przydziału.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const hasBlockingWarnings = warnings.some((w) => w.severity === "danger");
      if (hasBlockingWarnings && !input.acceptedRisk) {
        setError("Są ostrzeżenia wymagające uwagi — zaznacz „Akceptuję ostrzeżenia i zapisuję mimo to”, aby kontynuować.");
        setSaving(false);
        return;
      }
      const saved = editingItem ? await updateItem(editingItem.id, input) : await createItem(input);
      if (saved.linkedGroupId && applySharedFieldsToGroup) {
        await applyToLinkedGroup(saved.linkedGroupId, saved.id, pickLinkedGroupSharedFields(input));
      }
      onSaved?.(saved);
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu elementu planu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullscreen>
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edytuj element planu" : "Nowy element planu"}</DialogTitle>
        </DialogHeader>

        <div className="grid flex-1 gap-4 overflow-y-auto pb-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4">
            {templateOptions.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-surface-muted/10 p-3 sm:flex-row sm:items-end">
                <Field label="Szablon elementu planu" className="flex-1">
                  <Select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                    <option value="">Wybierz szablon…</option>
                    {templateOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={!selectedTemplateId}
                  onClick={() => {
                    const template = templateOptions.find((option) => option.id === selectedTemplateId);
                    if (template) applyTemplate(template);
                  }}
                >
                  Zastosuj
                </Button>
              </div>
            ) : null}

            <Field label="Tytuł">
              <Input value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Projekt">
                <Select value={input.projectId ?? ""} onChange={(event) => selectProject(event.target.value)}>
                  <option value="">Brak (praca wewnętrzna)</option>
                  {projects.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Klient">
                <Input
                  disabled
                  value={(() => {
                    const client = clients.find((c) => c.id === input.clientId);
                    return client ? formatPartyName(client) : project ? "—" : "";
                  })()}
                />
              </Field>
            </div>

            <Field label="Etap procesu">
              <Select
                value={input.processStageId ?? ""}
                disabled={!input.projectId || loadingStages}
                onChange={(event) => selectStage(event.target.value)}
              >
                <option value="">{loadingStages ? "Ładowanie…" : "Brak"}</option>
                {stageOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </Select>
            </Field>

            {stage ? (
              <div className="rounded-xl border border-border/60 bg-surface-muted/15 p-3 text-xs text-muted">
                Podpowiedzi z etapu: min. {stage.minPeopleCount ?? 1} os.
                {stage.estimatedLaborHours ? ` · ~${stage.estimatedLaborHours}h` : ""}
                {stage.requiresLeader ? " · wymaga lidera" : ""}
                {(stage.requiredRoles ?? []).length > 0
                  ? ` · role: ${(stage.requiredRoles ?? [])
                      .map((r) => roleOptions.find((o) => o.id === r.roleItemId)?.name ?? "—")
                      .join(", ")}`
                  : ""}
                {(stage.requiredCompetencies ?? []).length > 0
                  ? ` · kompetencje: ${(stage.requiredCompetencies ?? [])
                      .map((requirement) => {
                        const name =
                          competencyOptions.find((option) => option.id === requirement.competencyItemId)?.name ?? "—";
                        const level = competencyLevelOptions.find(
                          (option) => option.id === requirement.minLevelItemId,
                        )?.name;
                        return level ? `${name} (min. ${level})` : name;
                      })
                      .join(", ")}`
                  : ""}
              </div>
            ) : null}

            <ResourcePlanCompetencyRequirementsEditor
              value={input.requiredCompetencies}
              onChange={(requiredCompetencies) => setInput({ ...input, requiredCompetencies })}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Typ pracy">
                <Select value={input.workTypeItemId ?? ""} onChange={(event) => setInput({ ...input, workTypeItemId: event.target.value || null })}>
                  <option value="">Brak</option>
                  {workTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Zespół">
                <Select value={input.teamItemId ?? ""} onChange={(event) => setInput({ ...input, teamItemId: event.target.value || null })}>
                  <option value="">Brak</option>
                  {teamOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start">
                <Input
                  type="datetime-local"
                  value={toLocalInputValue(input.startAt)}
                  onChange={(event) => setInput({ ...input, startAt: fromLocalInputValue(event.target.value) })}
                />
              </Field>
              <Field label="Koniec">
                <Input
                  type="datetime-local"
                  value={toLocalInputValue(input.endAt)}
                  onChange={(event) => setInput({ ...input, endAt: fromLocalInputValue(event.target.value) })}
                />
              </Field>
            </div>

            {editingItem ? (
              <div className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground/90">
                  <Scissors className="h-4 w-4 text-muted" />
                  Podziel przydział na dwie części
                </p>
                <p className="text-xs text-muted">
                  Powstaną dwa elementy planu (ten sam „przydział” — te same pola wspólne,
                  osobne terminy/godziny) połączone jako części jednej całości.
                  {editingItem.linkedGroupId ? " Ten element już jest częścią podzielonego przydziału." : ""}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field label="Podziel w momencie" className="flex-1">
                    <Input
                      type="datetime-local"
                      min={toLocalInputValue(input.startAt)}
                      max={toLocalInputValue(input.endAt)}
                      value={splitDraftIso ? toLocalInputValue(splitDraftIso) : ""}
                      onChange={(event) =>
                        setSplitDraftIso(event.target.value ? fromLocalInputValue(event.target.value) : null)
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={
                      !splitDraftIso || splitting || !(splitDraftIso > input.startAt && splitDraftIso < input.endAt)
                    }
                    onClick={() => void handleSplit()}
                  >
                    {splitting ? "Dzielenie…" : "Podziel"}
                  </Button>
                </div>
              </div>
            ) : null}

            {editingItem?.linkedGroupId ? (
              <div className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
                <p className="text-xs text-muted">
                  Ten element jest częścią podzielonego przydziału ({linkedGroupMembers.length}{" "}
                  {linkedGroupMembers.length === 1 ? "część" : "części"}).
                </p>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={applySharedFieldsToGroup}
                    onChange={(event) => setApplySharedFieldsToGroup(event.target.checked)}
                  />
                  Zastosuj zmiany wspólnych pól (tytuł, status, ryzyko, notatki…) do innych części tego przydziału
                </label>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={input.shiftWithLinkedGroup}
                    disabled={shiftTogglePending}
                    onChange={(event) => void handleToggleShift(event.target.checked)}
                  />
                  Włącz zależność pociętych — przesunięcie/rozciągnięcie tej części w Gantcie przesunie też
                  kolejne części, zachowując odstępy czasu
                </label>
                {linkedGroupMembers.length > 1 ? (
                  confirmingMerge ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-amber-300">
                        Scalić wszystkie {linkedGroupMembers.length} części z powrotem w jeden przydział?
                      </span>
                      <Button type="button" size="sm" variant="secondary" disabled={merging} onClick={() => void handleMerge()}>
                        {merging ? "Scalanie…" : "Tak, scal"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled={merging} onClick={() => setConfirmingMerge(false)}>
                        Nie
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="w-fit"
                      onClick={() => setConfirmingMerge(true)}
                    >
                      Scal części z powrotem w jeden przydział
                    </Button>
                  )
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Planowane godziny">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={input.plannedHours ?? ""}
                  onChange={(event) => setInput({ ...input, plannedHours: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </Field>
              <Field label="Rzeczywiste godziny">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={input.actualHours ?? ""}
                  onChange={(event) => setInput({ ...input, actualHours: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <Select value={input.statusItemId ?? ""} onChange={(event) => setInput({ ...input, statusItemId: event.target.value || null })}>
                  <option value="">Brak</option>
                  {statusOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ryzyko">
                <Select value={input.riskItemId ?? ""} onChange={(event) => setInput({ ...input, riskItemId: event.target.value || null })}>
                  <option value="">Brak</option>
                  {riskOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {input.riskItemId ? (
              <Field label="Notatka o ryzyku">
                <Textarea value={input.riskNote} onChange={(event) => setInput({ ...input, riskNote: event.target.value })} rows={2} />
              </Field>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Budżet robocizny">
                <Input
                  type="number"
                  min={0}
                  value={input.laborBudget ?? ""}
                  onChange={(event) => setInput({ ...input, laborBudget: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </Field>
              <Field label="Budżet materiałów">
                <Input
                  type="number"
                  min={0}
                  value={input.materialBudget ?? ""}
                  onChange={(event) => setInput({ ...input, materialBudget: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </Field>
              <Field label="Budżet dojazdu">
                <Input
                  type="number"
                  min={0}
                  value={input.travelBudget ?? ""}
                  onChange={(event) => setInput({ ...input, travelBudget: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </Field>
            </div>

            <Field label="Notatki">
              <Textarea value={input.notes} onChange={(event) => setInput({ ...input, notes: event.target.value })} rows={3} />
            </Field>

            <TaskChecklistPanel
              parent={editingItem ? { kind: "resource_plan_item", id: editingItem.id } : null}
            />
          </div>

          <div className="grid gap-4">
            {suggestions.length > 0 ? (
              <div className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground/90">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Sugerowane osoby
                </p>
                <div className="grid gap-1.5">
                  {suggestions.map((candidate) => (
                    <button
                      key={candidate.userId}
                      type="button"
                      title={candidate.reasons.join("\n")}
                      onClick={() => setInput((current) => ({ ...current, assigneeId: candidate.userId }))}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border px-2.5 py-1.5 text-left text-xs transition hover:bg-surface-muted/30",
                        input.assigneeId === candidate.userId
                          ? "border-accent/50 bg-accent/10"
                          : "border-border/50 bg-transparent",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{candidate.name}</span>
                        {candidate.isOnLeave ? <span className="shrink-0 text-rose-300">nieobecność</span> : null}
                        {candidate.conflictCount > 0 ? (
                          <span className="shrink-0 text-amber-300">{candidate.conflictCount} konfl.</span>
                        ) : null}
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 font-semibold",
                            candidate.score >= 80
                              ? "bg-emerald-500/15 text-emerald-300"
                              : candidate.score >= 50
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-rose-500/15 text-rose-300",
                          )}
                        >
                          {candidate.score}%
                        </span>
                      </div>
                      {candidate.matchedCompetencyNames.length > 0 || candidate.missingCompetencyNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {candidate.matchedCompetencyNames.map((name) => (
                            <span key={`match-${candidate.userId}-${name}`} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                              ✓ {name}
                            </span>
                          ))}
                          {candidate.missingCompetencyNames.map((name) => (
                            <span key={`miss-${candidate.userId}-${name}`} className="rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-300">
                              ✗ {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground/90">Osoba odpowiedzialna</p>
              <Select value={input.assigneeId ?? ""} onChange={(event) => setInput({ ...input, assigneeId: event.target.value || null })}>
                <option value="">Brak</option>
                {teamProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {getUserDisplayName(profile)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground/90">Osoby zaangażowane</p>
              <div className="grid gap-2">
                {input.participants.map((participant) => {
                  const profile = teamProfiles.find((p) => p.id === participant.userId);
                  const hasCustomRange = Boolean(participant.startAt || participant.endAt);
                  const effectiveRange = participantEffectiveRange(input, participant);
                  const contributedHours = participantContributedHours(input, participant);
                  return (
                    <div key={participant.userId} className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/15 p-2">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {profile ? getUserDisplayName(profile) : "—"}
                        </span>
                        <label className="flex items-center gap-1 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={participant.isLead}
                            onChange={(event) => updateParticipant(participant.userId, { isLead: event.target.checked })}
                          />
                          Lider
                        </label>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeParticipant(participant.userId)}>
                          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>Zaangażowanie</span>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={participant.involvementPercent}
                          className="h-7 w-16 px-2 text-xs"
                          onChange={(event) => {
                            const next = Math.min(100, Math.max(1, Number(event.target.value) || 1));
                            updateParticipant(participant.userId, { involvementPercent: next });
                          }}
                        />
                        <span>% ≈ {contributedHours.toFixed(1)} h</span>
                        <label className="ml-auto flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={hasCustomRange}
                            onChange={(event) =>
                              updateParticipant(
                                participant.userId,
                                event.target.checked
                                  ? { startAt: input.startAt, endAt: input.endAt }
                                  : { startAt: null, endAt: null },
                              )
                            }
                          />
                          Własny zakres dat
                        </label>
                      </div>
                      {hasCustomRange ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Field label="Od" className="text-xs">
                            <Input
                              type="datetime-local"
                              min={toLocalInputValue(input.startAt)}
                              max={toLocalInputValue(input.endAt)}
                              value={toLocalInputValue(effectiveRange.startAt)}
                              onChange={(event) =>
                                updateParticipant(participant.userId, { startAt: fromLocalInputValue(event.target.value) })
                              }
                            />
                          </Field>
                          <Field label="Do" className="text-xs">
                            <Input
                              type="datetime-local"
                              min={toLocalInputValue(input.startAt)}
                              max={toLocalInputValue(input.endAt)}
                              value={toLocalInputValue(effectiveRange.endAt)}
                              onChange={(event) =>
                                updateParticipant(participant.userId, { endAt: fromLocalInputValue(event.target.value) })
                              }
                            />
                          </Field>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Select value={newParticipantId} onChange={(event) => setNewParticipantId(event.target.value)}>
                  <option value="">Wybierz osobę…</option>
                  {teamProfiles
                    .filter((p) => p.id !== input.assigneeId && !input.participants.some((existing) => existing.userId === p.id))
                    .map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {getUserDisplayName(profile)}
                      </option>
                    ))}
                </Select>
                <Button type="button" size="sm" variant="secondary" disabled={!newParticipantId} onClick={addParticipant}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground/90">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Ostrzeżenia ({warnings.length})
              </p>
              {warnings.length === 0 ? (
                <p className="text-xs text-muted">Brak ostrzeżeń.</p>
              ) : (
                <ul className="grid gap-1.5">
                  {warnings.map((warning, index) => (
                    <li
                      key={`${warning.code}-${index}`}
                      className={cn(
                        "flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs",
                        warning.severity === "danger" ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300",
                      )}
                    >
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {warning.message}
                    </li>
                  ))}
                </ul>
              )}
              {warnings.length > 0 ? (
                <label className="mt-1 flex items-center gap-2 text-xs font-medium text-foreground/90">
                  <input
                    type="checkbox"
                    checked={input.acceptedRisk}
                    onChange={(event) => setInput({ ...input, acceptedRisk: event.target.checked })}
                  />
                  Akceptuję ostrzeżenia i zapisuję mimo to
                </label>
              ) : null}
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
          {editingItem && completedStatus && !isAlreadyCompleted ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void handleMarkCompleted()}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Oznacz jako zakończone
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Zapisywanie…" : "Zapisz"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
