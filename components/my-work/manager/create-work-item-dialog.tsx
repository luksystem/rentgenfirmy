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
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_PRIORITY_LABELS,
  type CreateWorkItemInput,
} from "@/lib/my-work/types";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { useAppStore } from "@/store/app-store";
import { useMyWorkStore } from "@/store/my-work-store";

export function CreateWorkItemDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const createItem = useMyWorkStore((state) => state.createItem);
  const loadTeamProfiles = useMyWorkStore((state) => state.loadTeamProfiles);
  const teamProfiles = useMyWorkStore((state) => state.teamProfiles);

  const [assignedUserId, setAssignedUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [completionCriteria, setCompletionCriteria] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [priority, setPriority] = useState<CreateWorkItemInput["priority"]>("normal");
  const [sendImmediately, setSendImmediately] = useState(true);

  useEffect(() => {
    if (open) {
      void loadTeamProfiles();
    }
  }, [open, loadTeamProfiles]);

  async function handleSubmit() {
    if (!assignedUserId || !title.trim()) {
      window.alert("Wybierz pracownika i podaj nazwę zadania.");
      return;
    }
    const project = projects.find((entry) => entry.id === projectId);
    setSubmitting(true);
    try {
      await createItem({
        assignedUserId,
        projectId: projectId || null,
        clientId: project?.clientId ?? null,
        title: title.trim(),
        description,
        expectedResult,
        completionCriteria,
        dueDate: dueDate || null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        priority,
        sendImmediately,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setExpectedResult("");
      setCompletionCriteria("");
      setDueDate("");
      setEstimatedMinutes("");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się utworzyć zadania.");
    } finally {
      setSubmitting(false);
    }
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

        <div className="grid gap-3">
          <Field label="Pracownik">
            <Select value={assignedUserId} onChange={(event) => setAssignedUserId(event.target.value)}>
              <option value="">Wybierz…</option>
              {teamProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profileToOptionLabel(profile)}
                </option>
              ))}
            </Select>
          </Field>

          <ProjectSelectSearchable
            projects={projects}
            clients={clients}
            value={projectId || null}
            onChange={(id) => setProjectId(id ?? "")}
            emptyLabel="Bez projektu"
            label="Projekt (opcjonalnie)"
          />

          <Field label="Nazwa zadania">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>

          <Field label="Opis">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </Field>

          <Field label="Oczekiwany rezultat">
            <Textarea value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} rows={2} />
          </Field>

          <Field label="Kryterium zakończenia">
            <Textarea
              value={completionCriteria}
              onChange={(event) => setCompletionCriteria(event.target.value)}
              rows={2}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Termin">
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
            <Field label="Szacowany czas (min)">
              <Input
                type="number"
                min={0}
                value={estimatedMinutes}
                onChange={(event) => setEstimatedMinutes(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Priorytet">
            <Select
              value={priority ?? "normal"}
              onChange={(event) => setPriority(event.target.value as CreateWorkItemInput["priority"])}
            >
              {WORK_ITEM_PRIORITIES.map((entry) => (
                <option key={entry} value={entry}>
                  {WORK_ITEM_PRIORITY_LABELS[entry]}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendImmediately}
              onChange={(event) => setSendImmediately(event.target.checked)}
            />
            Wyślij od razu do pracownika (do zapoznania)
          </label>
        </div>

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
