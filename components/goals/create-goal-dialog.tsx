"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  GOAL_LEVEL_LABELS,
  GOAL_LEVELS,
  GOAL_PERIOD_TYPE_LABELS,
  GOAL_PERIOD_TYPES,
  GOAL_PRIORITIES,
  GOAL_PRIORITY_LABELS,
  type GoalLevel,
  type GoalPeriodType,
  type GoalPriority,
} from "@/lib/goals/types";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultPeriodEnd(periodType: GoalPeriodType) {
  const end = new Date();
  switch (periodType) {
    case "daily":
      break;
    case "weekly":
      end.setDate(end.getDate() + 6);
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      break;
    case "quarterly":
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      break;
    case "annual":
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      break;
  }
  return end.toISOString().slice(0, 10);
}

export function CreateGoalDialog({ boardId }: { boardId: string }) {
  const profile = useAuthStore((state) => state.profile);
  const teamProfiles = useGoalStore((state) => state.teamProfiles);
  const methodologies = useGoalStore((state) => state.methodologies);
  const createGoal = useGoalStore((state) => state.createGoal);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<GoalLevel>("individual");
  const [ownerId, setOwnerId] = useState(profile?.id ?? "");
  const [priority, setPriority] = useState<GoalPriority>("normal");
  const [periodType, setPeriodType] = useState<GoalPeriodType>("monthly");
  const [periodStart, setPeriodStart] = useState(todayIso());
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd("monthly"));
  const [isRecurring, setIsRecurring] = useState(false);
  const [methodologyId, setMethodologyId] = useState("");
  const [methodologyFields, setMethodologyFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMethodology = useMemo(
    () => methodologies.find((entry) => entry.code === methodologyId) ?? null,
    [methodologies, methodologyId],
  );

  function handlePeriodTypeChange(next: GoalPeriodType) {
    setPeriodType(next);
    setPeriodEnd(defaultPeriodEnd(next));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Podaj nazwę celu.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createGoal({
        boardId,
        level,
        name: name.trim(),
        description: description.trim(),
        ownerId: ownerId || null,
        priority,
        status: "planned",
        periodType,
        periodStart,
        periodEnd,
        methodologyId: methodologyId || null,
        methodologyFields,
        isRecurring,
        createdBy: profile?.id ?? null,
      });
      setOpen(false);
      setName("");
      setDescription("");
      setMethodologyFields({});
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się utworzyć celu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="mr-2 h-4 w-4" />
          Nowy cel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nowy cel</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Nazwa celu">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Opis">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Np. Chcemy skrócić czas realizacji projektu z 8 do 6 miesięcy."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Poziom">
              <Select value={level} onChange={(event) => setLevel(event.target.value as GoalLevel)}>
                {GOAL_LEVELS.map((entry) => (
                  <option key={entry} value={entry}>
                    {GOAL_LEVEL_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priorytet">
              <Select
                value={priority}
                onChange={(event) => setPriority(event.target.value as GoalPriority)}
              >
                {GOAL_PRIORITIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {GOAL_PRIORITY_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Właściciel">
              <Select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                <option value="">— wybierz —</option>
                {teamProfiles.map((member) => (
                  <option key={member.id} value={member.id}>
                    {profileToOptionLabel(member)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Okres">
              <Select
                value={periodType}
                onChange={(event) => handlePeriodTypeChange(event.target.value as GoalPeriodType)}
              >
                {GOAL_PERIOD_TYPES.map((entry) => (
                  <option key={entry} value={entry}>
                    {GOAL_PERIOD_TYPE_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data rozpoczęcia">
              <Input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
            </Field>
            <Field label="Planowane zakończenie">
              <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(event) => setIsRecurring(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Cel cykliczny — po rozliczeniu automatycznie utwórz następny okres
          </label>

          <Field label="Metodologia (opcjonalnie)">
            <Select value={methodologyId} onChange={(event) => setMethodologyId(event.target.value)}>
              <option value="">— bez metodologii —</option>
              {methodologies.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.name}
                </option>
              ))}
            </Select>
          </Field>

          {selectedMethodology && selectedMethodology.fieldSchema.length > 0 ? (
            <div className="grid gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Szablon: {selectedMethodology.name}
              </p>
              {selectedMethodology.fieldSchema.map((field) => (
                <Field key={field.key} label={field.label}>
                  {field.type === "textarea" || field.type === "list" ? (
                    <Textarea
                      rows={2}
                      value={methodologyFields[field.key] ?? ""}
                      onChange={(event) =>
                        setMethodologyFields((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={methodologyFields[field.key] ?? ""}
                      onChange={(event) =>
                        setMethodologyFields((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Zapisywanie..." : "Utwórz cel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
