"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/auth/types";
import type { ProcessStage } from "@/lib/process/types";
import { ensureAnchoredTemplateSnapshot } from "@/lib/supabase/process-repository";
import { fetchProcessTemplateByProjectType, getOrCreateProjectProcess } from "@/lib/supabase/process-repository";
import type { ResourcePlanItem, ResourcePlanItemInput, ResourcePlanParticipant } from "@/lib/resource-plan/types";
import { resourcePlanItemToInput } from "@/lib/resource-plan/types";
import { validateResourcePlanItem } from "@/lib/resource-plan/validations";
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
    participants: [],
  };
}

export function ResourcePlanSidePanel({
  open,
  onOpenChange,
  editingItem,
  defaultStartIso,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ResourcePlanItem | null;
  defaultStartIso?: string;
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

  const createItem = useResourcePlanStore((state) => state.createItem);
  const updateItem = useResourcePlanStore((state) => state.updateItem);
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

  useEffect(() => {
    if (!open) return;
    setInput(editingItem ? resourcePlanItemToInput(editingItem) : defaultInput(defaultStartIso));
    void ensureDictionaries();
    void loadTeamProfiles();
  }, [open, editingItem, defaultStartIso, ensureDictionaries, loadTeamProfiles]);

  useEffect(() => {
    const ids = input.assigneeId ? [input.assigneeId, ...input.participants.map((p) => p.userId)] : input.participants.map((p) => p.userId);
    if (ids.length) void ensureProfiles(ids);
  }, [input.assigneeId, input.participants, ensureProfiles]);

  useEffect(() => {
    if (!input.projectId) {
      setStageOptions([]);
      setStage(null);
      return;
    }
    const project = projects.find((p) => p.id === input.projectId);
    if (!project) return;

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
    }));
  }

  const warnings = useMemo(
    () =>
      validateResourcePlanItem({
        input,
        editingId: editingItem?.id ?? null,
        otherItems: allPlanItems,
        stage,
        profilesById: Object.fromEntries(teamProfiles.map((p) => [p.id, p])),
        resourceProfilesById,
        dictionaryItems,
      }),
    [input, editingItem, allPlanItems, stage, teamProfiles, resourceProfilesById, dictionaryItems],
  );

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
    const participant: ResourcePlanParticipant = { userId: newParticipantId, roleItemId: null, isLead: false };
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
                  value={clients.find((c) => c.id === input.clientId)?.fullName ?? (project ? "—" : "")}
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
              </div>
            ) : null}

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
          </div>

          <div className="grid gap-4">
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
                  return (
                    <div key={participant.userId} className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-muted/15 p-2">
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

        <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
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
