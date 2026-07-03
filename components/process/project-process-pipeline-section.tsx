"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
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
import { useAuthStore } from "@/store/auth-store";
import { useProcessStore } from "@/store/process-store";

export function ProjectProcessPipelineSection({
  projectId,
  projectType,
  liveTemplate,
  process,
  actorName,
}: {
  projectId: string;
  projectType: string;
  liveTemplate: ProcessTemplate;
  process: ProjectProcess;
  actorName?: string;
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

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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
  }, [loadProjectProcessItems, loadTeamProfiles, projectId, process.updatedAt]);

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
              Zmiany w szablonie nie aktualizują tego projektu automatycznie. Uzupełnione listy i
              postęp zostają po ręcznym wczytaniu.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setSyncDialogOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Wczytaj z szablonu
          </Button>
        </div>
      ) : null}

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
      />

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
    </>
  );
}
