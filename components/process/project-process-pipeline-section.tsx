"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ProcessItemRepairDialog } from "@/components/process/process-item-repair-dialog";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasFullAppAccess, isAdministratorRole } from "@/lib/auth/types";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import { findReadyMilestones } from "@/lib/stage-report/ready-milestones";
import { fetchStageHealth } from "@/lib/supabase/stage-health-repository";
import {
  fetchStageReports,
  fetchStageReportsPilotEnabled,
  generateStageReport,
} from "@/lib/supabase/stage-report-repository";
import {
  fetchStageResponsible,
  indexStageResponsibleByStageId,
  type StageResponsible,
} from "@/lib/supabase/stage-responsible-repository";
import { CommunicationGateBadge } from "@/components/process/communication-gate-badge";
import {
  fetchCommunicationGateForProject,
  type ProjectCommunicationGate,
} from "@/lib/supabase/communication-gate-repository";
import type { ProjectStageHealth } from "@/lib/stage-health/types";
import { useAuthStore } from "@/store/auth-store";
import { useProcessStore } from "@/store/process-store";
import { useProjectAgreementStore } from "@/store/project-agreement-store";
import { useProjectChangeRequestStore } from "@/store/project-change-request-store";

const EMPTY_AGREEMENTS: import("@/lib/dashboard/agreement-types").ProjectClientAgreement[] = [];
const EMPTY_CHANGE_REQUESTS: import("@/lib/dashboard/change-request-types").ProjectChangeRequest[] = [];

export function ProjectProcessPipelineSection({
  projectId,
  projectType,
  liveTemplate,
  process,
  actorName,
  projectName,
  onNavigateToStageReports,
}: {
  projectId: string;
  projectType: string;
  liveTemplate: ProcessTemplate;
  process: ProjectProcess;
  actorName?: string;
  /** Wymagane tylko razem z możliwością generowania raportu wprost z widoku procesu. */
  projectName?: string;
  /** Po wygenerowaniu raportu — przejście do zakładki "Raporty etapowe", żeby dokończyć
   *  komentarz/zatwierdzenie. Brak propa = generowanie zostaje niedostępne w tym widoku. */
  onNavigateToStageReports?: () => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const displayName = useAuthStore((state) => state.displayName);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const itemInstances = useProcessStore((state) => state.projectProcessItems[projectId]);

  const loadProjectProcessItems = useProcessStore((state) => state.loadProjectProcessItems);
  const syncProjectProcessFromTemplate = useProcessStore(
    (state) => state.syncProjectProcessFromTemplate,
  );
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);
  const saveChecklistPayload = useProcessStore((state) => state.saveChecklistPayload);
  const assignProcessItem = useProcessStore((state) => state.assignProcessItem);
  const signProcessItem = useProcessStore((state) => state.signProcessItem);
  const toggleItemCompletion = useProcessStore((state) => state.toggleItemCompletion);
  const saveMilestoneDate = useProcessStore((state) => state.saveMilestoneDate);
  const setActiveStage = useProcessStore((state) => state.setActiveStage);
  const addProjectProcessItem = useProcessStore((state) => state.addProjectProcessItem);
  const removeProjectProcessItem = useProcessStore((state) => state.removeProjectProcessItem);
  const agreements = useProjectAgreementStore(
    (state) => state.byProject[projectId] ?? EMPTY_AGREEMENTS,
  );
  const ensureAgreements = useProjectAgreementStore((state) => state.ensureAgreements);
  const changeRequests = useProjectChangeRequestStore(
    (state) => state.byProject[projectId] ?? EMPTY_CHANGE_REQUESTS,
  );
  const ensureChangeRequests = useProjectChangeRequestStore((state) => state.ensureChangeRequests);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [stageHealth, setStageHealth] = useState<ProjectStageHealth | null>(null);
  // D42 pkt 4b. Świadomie pobierane TUTAJ, a nie w ProcessPipeline — ten sam pipeline renderuje
  // publiczny dashboard klienta, a nazwiska obsady to informacja wewnętrzna.
  const [stageResponsible, setStageResponsible] = useState<Record<string, StageResponsible>>({});
  // Faza 11a (D19 §6) — reżim komunikacji projektu, tylko brama. Osobny fetch z tego samego
  // powodu co stageResponsible: to informacja wewnętrzna, ProcessPipeline renderuje też publiczny
  // dashboard klienta.
  const [communicationGate, setCommunicationGate] = useState<ProjectCommunicationGate | null>(null);
  // Generowanie raportu wprost z widoku procesu — te same dane co panel "Raporty etapowe"
  // (findReadyMilestones, współdzielone), tylko pobrane tutaj zamiast zmuszać do przełączania
  // zakładki, żeby sprawdzić, czy kamień jest gotowy.
  const [readyMilestoneIds, setReadyMilestoneIds] = useState<Set<string>>(new Set());
  const [generatingMilestoneId, setGeneratingMilestoneId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [justGeneratedMilestoneId, setJustGeneratedMilestoneId] = useState<string | null>(null);

  const anchoredTemplate = useMemo(
    () => resolveAnchoredProcessTemplate(process, liveTemplate),
    [liveTemplate, process],
  );

  const resolvedActorName = actorName ?? displayName ?? undefined;
  const canManageAssignment = profile ? hasFullAppAccess(profile.role) : false;
  const canCustomizeChecklist = profile ? isAdministratorRole(profile.role) : false;
  const canSyncFromTemplate = profile ? isAdministratorRole(profile.role) : false;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadTeamProfiles();
        await loadProjectProcessItems(projectId);
        await ensureAgreements(projectId);
        await ensureChangeRequests(projectId);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Błąd ładowania elementów procesu.");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    ensureAgreements,
    ensureChangeRequests,
    loadProjectProcessItems,
    loadTeamProfiles,
    projectId,
    process.updatedAt,
  ]);

  useEffect(() => {
    let cancelled = false;
    void fetchStageHealth()
      .then((rows) => {
        if (!cancelled) {
          setStageHealth(rows.find((row) => row.projectId === projectId) ?? null);
        }
      })
      .catch(() => {
        // Zdrowie etapu to nienatrętny wskaźnik — brak danych nie blokuje pipeline'u.
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, process.activeStageId, process.updatedAt]);

  const reloadStageResponsible = useCallback(() => {
    void fetchStageResponsible(projectId)
      .then((rows) => setStageResponsible(indexStageResponsibleByStageId(rows)))
      .catch(() => {
        // Brak danych o odpowiedzialnych nie może wywalić widoku procesu — linijka po prostu
        // się nie pokaże, a etapy zostają czytelne.
      });
  }, [projectId]);

  useEffect(() => {
    reloadStageResponsible();
  }, [reloadStageResponsible]);

  useEffect(() => {
    let cancelled = false;
    void fetchCommunicationGateForProject(projectId)
      .then((gate) => {
        if (!cancelled) setCommunicationGate(gate);
      })
      .catch(() => {
        // Brama komunikacji to informacyjny badge — brak danych nie ma blokować widoku procesu.
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const reloadReadyMilestones = useCallback(() => {
    if (!onNavigateToStageReports || !anchoredTemplate) return;
    void (async () => {
      try {
        const pilotEnabled = await fetchStageReportsPilotEnabled(projectId);
        if (!pilotEnabled) {
          setReadyMilestoneIds(new Set());
          return;
        }
        const reports = await fetchStageReports(projectId);
        const existingIds = new Set(reports.map((r) => r.milestoneId));
        const ready = findReadyMilestones(anchoredTemplate, process.completions ?? {}, existingIds);
        setReadyMilestoneIds(new Set(ready.map((m) => m.milestoneId)));
      } catch {
        // Generowanie z widoku procesu jest dodatkiem — brak danych nie ma blokować pipeline'u,
        // po prostu żaden kamień nie pokaże się jako gotowy.
        setReadyMilestoneIds(new Set());
      }
    })();
  }, [anchoredTemplate, onNavigateToStageReports, process.completions, projectId]);

  useEffect(() => {
    reloadReadyMilestones();
  }, [reloadReadyMilestones]);

  async function handleGenerateReport(milestoneId: string) {
    if (!profile || !projectName || !anchoredTemplate) return;
    const stage = anchoredTemplate.stages.find((s) => s.milestones.some((m) => m.id === milestoneId));
    if (!stage) return;
    setGeneratingMilestoneId(milestoneId);
    setGenerateError(null);
    try {
      await generateStageReport(projectId, projectName, stage.id, milestoneId, profile.id);
      setReadyMilestoneIds((current) => {
        const next = new Set(current);
        next.delete(milestoneId);
        return next;
      });
      setJustGeneratedMilestoneId(milestoneId);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Nie udało się wygenerować raportu.");
    } finally {
      setGeneratingMilestoneId(null);
    }
  }

  async function handleConfirmSync() {
    setSyncing(true);
    setSyncError(null);

    try {
      await syncProjectProcessFromTemplate(projectId, projectType);
      setSyncDialogOpen(false);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Nie udało się wczytać szablonu.");
    } finally {
      setSyncing(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-rose-400">{loadError}</p>;
  }

  if (!ready || !anchoredTemplate) {
    return <p className="text-sm text-muted">Ładowanie elementów procesu…</p>;
  }

  return (
    <>
      {canSyncFromTemplate ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/20 px-3 py-3">
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">Zakotwiczony proces projektu</p>
            <p className="mt-0.5 text-muted">
              Struktura etapów jest zakotwiczona — nowe lub zmienione etapy szablonu wymagają
              ręcznego wczytania. Treść pytań checklist aktualizuje się automatycznie przy
              odświeżeniu, a zaznaczenia klienta zostają zachowane.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSyncDialogOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Wczytaj z szablonu
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setRepairDialogOpen(true)}>
              Napraw dopasowanie elementu
            </Button>
          </div>
        </div>
      ) : null}

      <CommunicationGateBadge gate={communicationGate} />

      <ProcessPipeline
        template={anchoredTemplate}
        process={process}
        projectId={projectId}
        itemInstances={itemInstances}
        teamProfiles={teamProfiles}
        currentUserId={profile?.id}
        canManageAssignment={canManageAssignment}
        canCustomizeChecklist={canCustomizeChecklist}
        interactive
        actorName={resolvedActorName}
        stageResponsible={stageResponsible}
        onStageLeadChanged={reloadStageResponsible}
        onSaveMilestoneDate={(milestoneId, date) => saveMilestoneDate(projectId, milestoneId, date)}
        onSaveChecklist={(itemId, payload) =>
          saveChecklistPayload(projectId, itemId, payload, resolvedActorName)
        }
        onAssign={(itemId, assigneeId) => assignProcessItem(projectId, itemId, assigneeId)}
        onSign={(itemId, signatureNote) => {
          if (!profile) {
            return Promise.reject(new Error("Brak zalogowanego użytkownika."));
          }
          return signProcessItem(
            projectId,
            itemId,
            { id: profile.id, name: resolvedActorName || profile.email },
            signatureNote,
          );
        }}
        onToggleItem={(itemId, completed) =>
          void toggleItemCompletion(projectId, itemId, completed, resolvedActorName)
        }
        agreements={agreements}
        changeRequests={changeRequests}
        onSetActiveStage={
          canManageAssignment ? (stageId) => setActiveStage(projectId, stageId) : undefined
        }
        onAddItem={(milestoneId, input) => addProjectProcessItem(projectId, milestoneId, input)}
        onRemoveItem={(itemId) => removeProjectProcessItem(projectId, itemId)}
        activeStageHealth={stageHealth}
        readyMilestoneIds={readyMilestoneIds}
        generatingMilestoneId={generatingMilestoneId}
        justGeneratedMilestoneId={justGeneratedMilestoneId}
        onGenerateReport={canManageAssignment ? (milestoneId) => void handleGenerateReport(milestoneId) : undefined}
        onNavigateToStageReports={onNavigateToStageReports}
      />
      {generateError ? <p className="mt-2 text-sm text-rose-400">{generateError}</p> : null}

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wczytać aktualny szablon procesu?</DialogTitle>
            <DialogDescription>
              Struktura pipeline (etapy, kamienie milowe, nowe elementy) zostanie zaktualizowana do
              bieżącego szablonu typu projektu. Uzupełnione checklisty, przypisania, podpisy i daty
              kamieni milowych zostaną zachowane tam, gdzie element nadal istnieje w szablonie.
            </DialogDescription>
          </DialogHeader>
          {syncError ? <p className="text-sm text-rose-400">{syncError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSyncDialogOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" disabled={syncing} onClick={() => void handleConfirmSync()}>
              {syncing ? "Wczytywanie…" : "Potwierdź wczytanie"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {canSyncFromTemplate ? (
        <ProcessItemRepairDialog
          projectId={projectId}
          open={repairDialogOpen}
          onOpenChange={setRepairDialogOpen}
        />
      ) : null}
    </>
  );
}
