"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  computePlanningAssistantProposal,
  type PlanningAssistantProposal,
  type PlanningAssistantProposalItem,
} from "@/lib/resource-plan/planning-assistant";
import type { ResourcePlanItemInput } from "@/lib/resource-plan/types";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useProcessStore } from "@/store/process-store";
import { useResourcePlanStore } from "@/store/resource-plan-store";
import { useUserResourceStore } from "@/store/user-resource-store";
import { useAppStore } from "@/store/app-store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function MatchBadge({ item }: { item: PlanningAssistantProposalItem }) {
  if (item.matchQuality === "full") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
        <ShieldCheck className="h-3 w-3" /> Pełne dopasowanie
      </span>
    );
  }
  if (item.matchQuality === "partial") {
    return (
      <span
        className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300"
        title={`Brakuje: ${item.missingCompetencyNames.join(", ")}`}
      >
        <ShieldQuestion className="h-3 w-3" /> Częściowe dopasowanie
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300"
      title={`Brakuje: ${item.missingCompetencyNames.join(", ")}`}
    >
      <ShieldAlert className="h-3 w-3" /> Brak dopasowania
    </span>
  );
}

export function PlanningAssistantDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const templateOptions = useDictionaryStore((state) => state.byKey("plan_item_template"));
  const competencyOptions = useDictionaryStore((state) => state.byKey("competency"));
  const competencyLevelOptions = useDictionaryStore((state) => state.byKey("competency_level"));
  const ensureDictionaries = useDictionaryStore((state) => state.ensure);

  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);

  const resourceProfilesById = useUserResourceStore((state) => state.byUser);
  const ensureProfiles = useUserResourceStore((state) => state.ensureProfiles);

  const projects = useAppStore((state) => state.projects);

  const allItems = useResourcePlanStore((state) => state.allItems());
  const createItem = useResourcePlanStore((state) => state.createItem);

  const [templateId, setTemplateId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [deadline, setDeadline] = useState("");
  const [projectId, setProjectId] = useState("");
  const [proposal, setProposal] = useState<PlanningAssistantProposal | null>(null);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void ensureDictionaries();
    void loadTeamProfiles();
  }, [open, ensureDictionaries, loadTeamProfiles]);

  useEffect(() => {
    const ids = teamProfiles.map((profile) => profile.id);
    if (ids.length > 0) void ensureProfiles(ids);
  }, [teamProfiles, ensureProfiles]);

  useEffect(() => {
    if (!open) {
      setProposal(null);
      setRemovedKeys(new Set());
      setError(null);
    }
  }, [open]);

  const selectedTemplate = templateOptions.find((option) => option.id === templateId) ?? null;
  const visibleItems = proposal ? proposal.items.filter((item) => !removedKeys.has(item.key)) : [];

  function buildProposal() {
    setError(null);
    if (!selectedTemplate) {
      setError("Wybierz szablon.");
      return;
    }
    if (!deadline) {
      setError("Podaj termin.");
      return;
    }
    if (quantity < 1) {
      setError("Ilość musi być co najmniej 1.");
      return;
    }

    const result = computePlanningAssistantProposal({
      input: {
        templateItem: selectedTemplate,
        quantity,
        deadlineIso: deadline,
        startFromIso: todayIso(),
      },
      teamProfiles,
      resourceProfilesById,
      existingItems: allItems,
      competencyOptions,
      competencyLevelOptions,
    });
    setProposal(result);
    setRemovedKeys(new Set());
  }

  async function approveProposal() {
    if (!selectedTemplate || visibleItems.length === 0) return;
    setSaving(true);
    setError(null);
    const project = projects.find((p) => p.id === projectId) ?? null;
    const meta = selectedTemplate.metadata as Record<string, unknown>;
    try {
      for (const item of visibleItems) {
        const input: ResourcePlanItemInput = {
          projectId: project?.id ?? null,
          clientId: project?.clientId ?? null,
          processStageId: null,
          taskId: null,
          serviceIntakeRequestId: null,
          inspectionId: null,
          inspectionDateConfirmed: null,
          workTypeItemId: (meta.workTypeItemId as string | null) ?? null,
          title: item.title,
          startAt: item.startAt,
          endAt: item.endAt,
          plannedHours: item.plannedHours,
          actualHours: null,
          assigneeId: item.assigneeId,
          teamItemId: null,
          statusItemId: null,
          riskItemId: (meta.riskItemId as string | null) ?? null,
          riskNote: "",
          laborBudget: (meta.laborBudget as number | null) ?? null,
          materialBudget: (meta.materialBudget as number | null) ?? null,
          travelBudget: (meta.travelBudget as number | null) ?? null,
          notes: `Wygenerowane przez asystenta planowania — ${selectedTemplate.name} (${item.unitIndex}/${quantity}).`,
          completionFeedback: "",
          acceptedRisk: false,
          linkedGroupId: null,
          shiftWithLinkedGroup: false,
          participants: [],
          requiredCompetencies: (meta.requiredCompetencies as ResourcePlanItemInput["requiredCompetencies"]) ?? [],
        };
        await createItem(input);
      }
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć elementów planu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Asystent planowania
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <p className="text-xs text-muted">
            Podaj co i ile trzeba zrobić do kiedy — asystent dobierze wykonawców po kompetencjach z szablonu i
            obłożeniu, i ułoży propozycję terminów. Nic nie zapisuje samodzielnie — dopiero po Twoim zatwierdzeniu.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Szablon">
              <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                <option value="">Wybierz szablon…</option>
                {templateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ilość sztuk">
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              />
            </Field>
            <Field label="Termin (do kiedy)">
              <Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </Field>
            <Field label="Projekt (opcjonalnie)">
              <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">Bez projektu</option>
                {projects
                  .filter((project) => project.isActive)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          ) : null}

          <Button type="button" variant="secondary" onClick={buildProposal}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Zaproponuj plan
          </Button>

          {proposal ? (
            <div className="grid gap-3">
              {proposal.warnings.length > 0 ? (
                <div className="grid gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {proposal.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-2">
                {visibleItems.length === 0 ? (
                  <p className="text-sm text-muted">Brak propozycji do pokazania.</p>
                ) : (
                  visibleItems.map((item) => (
                    <div
                      key={item.key}
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-surface p-2 text-xs",
                      )}
                    >
                      <span className="font-medium text-foreground">{item.title}</span>
                      <span className="text-muted">
                        {new Date(item.startAt).toLocaleDateString("pl-PL")} –{" "}
                        {new Date(item.endAt).toLocaleDateString("pl-PL")}
                      </span>
                      <span className="text-muted">{item.assigneeName}</span>
                      <MatchBadge item={item} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => setRemovedKeys((current) => new Set(current).add(item.key))}
                      >
                        Usuń
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <Button type="button" disabled={saving || visibleItems.length === 0} onClick={() => void approveProposal()}>
                {saving ? "Zapisywanie…" : `Zatwierdź i utwórz ${visibleItems.length} element(ów) planu`}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
