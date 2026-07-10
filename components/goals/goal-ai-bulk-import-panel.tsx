"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import type { GoalAiGeneratedDraft } from "@/lib/ai/goal-bulk-generator";
import {
  GOAL_LEVEL_LABELS,
  GOAL_LEVELS,
  GOAL_PERIOD_TYPE_LABELS,
  GOAL_PERIOD_TYPES,
  GOAL_PRIORITY_LABELS,
  GOAL_PRIORITIES,
  type GoalLevel,
  type GoalPeriodType,
  type GoalPriority,
} from "@/lib/goals/types";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";

type DraftGoal = GoalAiGeneratedDraft & {
  draftId: string;
  selected: boolean;
  ownerId: string;
  projectId: string;
};

function toDraftGoals(goals: GoalAiGeneratedDraft[], defaultOwnerId: string): DraftGoal[] {
  return goals.map((goal) => ({
    ...goal,
    draftId: crypto.randomUUID(),
    selected: true,
    ownerId: defaultOwnerId,
    projectId: "",
  }));
}

export function GoalAiBulkImportPanel({
  boardId,
  boardKind,
  onCreated,
}: {
  boardId: string;
  boardKind: string;
  onCreated: () => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const boardKinds = useGoalStore((state) => state.boardKinds);
  const methodologies = useGoalStore((state) => state.methodologies);
  const teamProfiles = useGoalStore((state) => state.teamProfiles);
  const createGoal = useGoalStore((state) => state.createGoal);
  const projectScope = useGoalStore((state) => state.moduleSettings.projectScope);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);

  const selectableProjects = useMemo(
    () => (projectScope === "active" ? projects.filter((entry) => entry.isActive) : projects),
    [projects, projectScope],
  );
  const boardKindLabel = useMemo(
    () => boardKinds.find((entry) => entry.code === boardKind)?.label ?? "Cele",
    [boardKinds, boardKind],
  );

  const [open, setOpen] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [drafts, setDrafts] = useState<DraftGoal[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const draftsPreviewRef = useRef<HTMLDivElement | null>(null);

  const selectedCount = useMemo(() => drafts.filter((draft) => draft.selected && draft.title.trim()).length, [drafts]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/goals/ai/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notesText, boardKindLabel }),
      });
      const payload = (await response.json()) as { goals?: GoalAiGeneratedDraft[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wygenerować celów.");
      }
      if (!payload.goals?.length) {
        throw new Error("AI nie zwróciło żadnych celów.");
      }
      setDrafts(toDraftGoals(payload.goals, profile?.id ?? ""));
      setMessage(`Wygenerowano ${payload.goals.length} propozycji celów — sprawdź przed dodaniem.`);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Błąd generowania celów.");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!drafts.length) return;
    draftsPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [drafts.length]);

  function updateDraft(draftId: string, patch: Partial<DraftGoal>) {
    setDrafts((current) => current.map((draft) => (draft.draftId === draftId ? { ...draft, ...patch } : draft)));
  }

  function removeDraft(draftId: string) {
    setDrafts((current) => current.filter((draft) => draft.draftId !== draftId));
  }

  async function handleCreateSelected() {
    const selected = drafts.filter((draft) => draft.selected && draft.title.trim());
    if (!selected.length) {
      setError("Zaznacz co najmniej jeden cel.");
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      for (const draft of selected) {
        await createGoal({
          boardId,
          level: draft.level,
          name: draft.title.trim(),
          description: draft.description.trim(),
          ownerId: draft.ownerId || null,
          priority: draft.priority,
          status: "planned",
          periodType: draft.periodType,
          periodStart: draft.periodStart,
          periodEnd: draft.periodEnd,
          methodologyId: draft.methodologyCode,
          isRecurring: draft.isRecurring,
          projectId: draft.projectId || null,
          createdBy: profile?.id ?? null,
        });
      }
      setNotesText("");
      setDrafts([]);
      setMessage(`Dodano ${selected.length} celów do tablicy.`);
      onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Błąd tworzenia celów.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mb-3 grid min-w-0 gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          AI: notatka → wiele celów
        </span>
        <span className="text-xs text-muted">{open ? "Zwiń" : "Rozwiń"}</span>
      </button>

      {open ? (
        <div className="grid gap-3">
          <p className="text-xs text-muted">
            Wklej notatkę (np. z burzy mózgów, spotkania, planu na kwartał) — AI wyłapie odrębne cele, zaproponuje
            metodologię i sformułuje tytuł zgodnie z zasadami dobrze zdefiniowanego celu. Przydziel właściciela,
            projekt i cykl przed dodaniem.
          </p>

          <Field label="Notatka">
            <textarea
              value={notesText}
              onChange={(event) => setNotesText(event.target.value)}
              rows={5}
              placeholder="Np. Zespół sprzedaży: zwiększyć liczbę ofert wysłanych w miesiącu, poprawić czas odpowiedzi na leady. Zespół techniczny: ograniczyć liczbę reklamacji w Q3…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={generating || creating || !notesText.trim()}
              onClick={() => void handleGenerate()}
            >
              {generating ? "Generowanie…" : "Wygeneruj cele"}
            </Button>
            {drafts.length ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={creating || generating || !selectedCount}
                onClick={() => void handleCreateSelected()}
              >
                {creating ? "Dodawanie…" : `Dodaj ${selectedCount} celów`}
              </Button>
            ) : null}
          </div>

          {drafts.length ? (
            <div ref={draftsPreviewRef} className="grid max-h-[min(65vh,640px)] gap-2 overflow-y-auto overscroll-y-contain pr-1">
              {drafts.map((draft) => (
                <div key={draft.draftId} className="grid gap-2 rounded-lg border border-border/60 bg-surface/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.selected}
                        onChange={(event) => updateDraft(draft.draftId, { selected: event.target.checked })}
                      />
                      Cel
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="ml-auto"
                      onClick={() => removeDraft(draft.draftId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={draft.title}
                    onChange={(event) => updateDraft(draft.draftId, { title: event.target.value })}
                    placeholder="Tytuł celu"
                  />
                  <Textarea
                    value={draft.description}
                    onChange={(event) => updateDraft(draft.draftId, { description: event.target.value })}
                    rows={2}
                    placeholder="Opis celu"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label="Metodologia">
                      <Select
                        value={draft.methodologyCode ?? ""}
                        onChange={(event) => updateDraft(draft.draftId, { methodologyCode: event.target.value || null })}
                      >
                        <option value="">— bez metodologii —</option>
                        {methodologies.map((entry) => (
                          <option key={entry.code} value={entry.code}>
                            {entry.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Poziom">
                      <Select
                        value={draft.level}
                        onChange={(event) => updateDraft(draft.draftId, { level: event.target.value as GoalLevel })}
                      >
                        {GOAL_LEVELS.map((entry) => (
                          <option key={entry} value={entry}>
                            {GOAL_LEVEL_LABELS[entry]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Priorytet">
                      <Select
                        value={draft.priority}
                        onChange={(event) => updateDraft(draft.draftId, { priority: event.target.value as GoalPriority })}
                      >
                        {GOAL_PRIORITIES.map((entry) => (
                          <option key={entry} value={entry}>
                            {GOAL_PRIORITY_LABELS[entry]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label="Okres">
                      <Select
                        value={draft.periodType}
                        onChange={(event) => updateDraft(draft.draftId, { periodType: event.target.value as GoalPeriodType })}
                      >
                        {GOAL_PERIOD_TYPES.map((entry) => (
                          <option key={entry} value={entry}>
                            {GOAL_PERIOD_TYPE_LABELS[entry]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Start">
                      <Input
                        type="date"
                        value={draft.periodStart}
                        onChange={(event) => updateDraft(draft.draftId, { periodStart: event.target.value })}
                      />
                    </Field>
                    <Field label="Termin">
                      <Input
                        type="date"
                        value={draft.periodEnd}
                        onChange={(event) => updateDraft(draft.draftId, { periodEnd: event.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Właściciel">
                      <Select
                        value={draft.ownerId}
                        onChange={(event) => updateDraft(draft.draftId, { ownerId: event.target.value })}
                      >
                        <option value="">— brak —</option>
                        {teamProfiles.map((member) => (
                          <option key={member.id} value={member.id}>
                            {profileToOptionLabel(member)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <ProjectSelectSearchable
                      projects={selectableProjects}
                      clients={clients}
                      value={draft.projectId || null}
                      onChange={(nextId) => updateDraft(draft.draftId, { projectId: nextId ?? "" })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-foreground/90">
                    <input
                      type="checkbox"
                      checked={draft.isRecurring}
                      onChange={(event) => updateDraft(draft.draftId, { isRecurring: event.target.checked })}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    Cel cykliczny
                  </label>
                </div>
              ))}
            </div>
          ) : null}

          {message ? <p className="text-xs text-emerald-400">{message}</p> : null}
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
