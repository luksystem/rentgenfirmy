"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  EMPTY_WORK_ITEM_MANAGER_FORM,
  managerFormValuesToUpdateInput,
  workItemToManagerFormValues,
  WorkItemManagerForm,
} from "@/components/my-work/manager/work-item-manager-form";
import type { WorkItemView } from "@/lib/my-work/types";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useMyWorkStore } from "@/store/my-work-store";

export function EditWorkItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: WorkItemView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const loadTeamProfiles = useMyWorkStore((state) => state.loadTeamProfiles);
  const teamProfiles = useMyWorkStore((state) => state.teamProfiles);
  const updateItem = useMyWorkStore((state) => state.updateItem);
  const deleteItem = useMyWorkStore((state) => state.deleteItem);

  const [values, setValues] = useState(EMPTY_WORK_ITEM_MANAGER_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && item) {
      setValues(workItemToManagerFormValues(item));
      void loadTeamProfiles();
    }
  }, [open, item, loadTeamProfiles]);

  if (!item) return null;

  const currentItem = item;
  const isManual = currentItem.sourceType === "manual";
  const isAdmin = profile?.role === "administrator";
  const isCancelled = currentItem.status === "cancelled";
  const canHardDelete =
    isAdmin && isManual && (currentItem.status === "draft" || currentItem.status === "cancelled");

  async function handleSave() {
    if (!values.assignedUserId || !values.title.trim()) {
      window.alert("Wybierz pracownika i podaj nazwę zadania.");
      return;
    }
    const project = projects.find((entry) => entry.id === values.projectId);
    setSubmitting(true);
    try {
      await updateItem(
        currentItem.id,
        managerFormValuesToUpdateInput(values, { clientId: project?.clientId ?? currentItem.clientId }),
      );
      onOpenChange(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zapisać zmian.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelTask() {
    if (!window.confirm("Anulować to zadanie? Zniknie z list aktywnych.")) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteItem(currentItem.id, { hard: false });
      onOpenChange(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się anulować zadania.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHardDelete() {
    if (!window.confirm("Trwale usunąć to zadanie? Tej operacji nie można cofnąć.")) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteItem(currentItem.id, { hard: true });
      onOpenChange(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się usunąć zadania.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edytuj zadanie</DialogTitle>
          <DialogDescription>
            Zmień parametry zlecenia — termin, priorytet, opis i przypisanie.
          </DialogDescription>
        </DialogHeader>

        <WorkItemManagerForm
          values={values}
          onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
          teamProfiles={teamProfiles}
          projects={projects}
          clients={clients}
          isManualSource={isManual}
        />

        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {!isCancelled ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                disabled={submitting}
                onClick={() => void handleCancelTask()}
              >
                Anuluj zadanie
              </Button>
            ) : null}
            {canHardDelete ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                disabled={submitting}
                onClick={() => void handleHardDelete()}
              >
                Usuń trwale
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Zamknij
            </Button>
            <Button onClick={() => void handleSave()} disabled={submitting}>
              {submitting ? "Zapisywanie…" : "Zapisz zmiany"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
