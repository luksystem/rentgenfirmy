"use client";

import { useEffect, useState } from "react";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { hasFullAppAccess, isAdministratorRole } from "@/lib/auth/types";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import { useAuthStore } from "@/store/auth-store";
import { useProcessStore } from "@/store/process-store";

export function ProjectProcessPipelineSection({
  projectId,
  template,
  process,
  actorName,
}: {
  projectId: string;
  template: ProcessTemplate;
  process: ProjectProcess;
  actorName?: string;
}) {
  const profile = useAuthStore((state) => state.profile);
  const displayName = useAuthStore((state) => state.displayName);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const itemInstances = useProcessStore((state) => state.projectProcessItems[projectId]);

  const ensureProjectProcessItems = useProcessStore((state) => state.ensureProjectProcessItems);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);
  const saveChecklistPayload = useProcessStore((state) => state.saveChecklistPayload);
  const assignProcessItem = useProcessStore((state) => state.assignProcessItem);
  const signProcessItem = useProcessStore((state) => state.signProcessItem);
  const toggleItemCompletion = useProcessStore((state) => state.toggleItemCompletion);
  const saveMilestoneDate = useProcessStore((state) => state.saveMilestoneDate);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const resolvedActorName = actorName ?? displayName ?? undefined;
  const canManageAssignment = profile ? hasFullAppAccess(profile.role) : false;
  const canCustomizeChecklist = profile ? isAdministratorRole(profile.role) : false;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadTeamProfiles();
        await ensureProjectProcessItems(projectId, template);
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
  }, [ensureProjectProcessItems, loadTeamProfiles, projectId, template]);

  if (loadError) {
    return <p className="text-sm text-rose-400">{loadError}</p>;
  }

  if (!ready) {
    return <p className="text-sm text-muted">Ładowanie elementów procesu…</p>;
  }

  return (
    <ProcessPipeline
      template={template}
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
  );
}
