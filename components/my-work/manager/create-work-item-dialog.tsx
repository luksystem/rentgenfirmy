"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  EMPTY_WORK_ITEM_MANAGER_FORM,
  managerFormValuesToCreateInput,
  WorkItemManagerForm,
} from "@/components/my-work/manager/work-item-manager-form";
import { MyWorkAiSuggestionsPanel } from "@/components/my-work/my-work-ai-suggestions-panel";
import type { WorkTaskAiSuggestion } from "@/lib/my-work/ai-types";
import { useAppStore } from "@/store/app-store";
import { useMyWorkStore } from "@/store/my-work-store";

export function CreateWorkItemDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendImmediately, setSendImmediately] = useState(true);
  const [values, setValues] = useState(EMPTY_WORK_ITEM_MANAGER_FORM);

  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const createItem = useMyWorkStore((state) => state.createItem);
  const loadTeamProfiles = useMyWorkStore((state) => state.loadTeamProfiles);
  const teamProfiles = useMyWorkStore((state) => state.teamProfiles);

  useEffect(() => {
    if (open) {
      void loadTeamProfiles();
    }
  }, [open, loadTeamProfiles]);

  async function handleSubmit() {
    if (!values.assignedUserId || !values.title.trim()) {
      window.alert("Wybierz pracownika i podaj nazwę zadania.");
      return;
    }
    const project = projects.find((entry) => entry.id === values.projectId);
    setSubmitting(true);
    try {
      await createItem(
        managerFormValuesToCreateInput(values, {
          clientId: project?.clientId ?? null,
          sendImmediately,
          aiGenerated: values.aiGenerated,
          aiSuggestionReason: values.aiSuggestionReason,
        }),
      );
      setOpen(false);
      setValues(EMPTY_WORK_ITEM_MANAGER_FORM);
      setSendImmediately(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się utworzyć zadania.");
    } finally {
      setSubmitting(false);
    }
  }

  function applyAiSuggestion(suggestion: WorkTaskAiSuggestion) {
    setValues((current) => ({
      ...current,
      title: suggestion.title,
      description: suggestion.description,
      expectedResult: suggestion.expectedResult,
      priority: suggestion.priority,
      dueDate: suggestion.dueDate ?? current.dueDate,
      aiGenerated: true,
      aiSuggestionReason: suggestion.reason,
    }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nowe zadanie</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Przypisz zadanie</DialogTitle>
          <DialogDescription>
            Utwórz wewnętrzne zlecenie i opcjonalnie wyślij je od razu do pracownika.
          </DialogDescription>
        </DialogHeader>

        <WorkItemManagerForm
          values={values}
          onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
          teamProfiles={teamProfiles}
          projects={projects}
          clients={clients}
        />

        <MyWorkAiSuggestionsPanel
          assignedUserId={values.assignedUserId || undefined}
          onApply={applyAiSuggestion}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sendImmediately}
            onChange={(event) => setSendImmediately(event.target.checked)}
          />
          Wyślij od razu do pracownika (do zapoznania)
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Zapisywanie…" : sendImmediately ? "Utwórz i wyślij" : "Zapisz szkic"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
