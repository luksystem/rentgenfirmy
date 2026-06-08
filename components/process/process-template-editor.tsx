"use client";

import { useState } from "react";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { inputToMilestoneDate, milestoneDateToInput } from "@/lib/process/dates";
import {
  PROCESS_ITEM_KINDS,
  PROCESS_ITEM_KIND_LABELS,
  type ProcessItemKind,
  type ProcessTemplate,
} from "@/lib/process/types";

export function ProcessTemplateEditor({
  initialTemplate,
  onSave,
}: {
  initialTemplate: ProcessTemplate;
  onSave: (template: ProcessTemplate) => Promise<void>;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await onSave({ ...template, updatedAt: new Date().toISOString() });
      setMessage("Szablon zapisany.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu szablonu.");
    } finally {
      setIsSaving(false);
    }
  }

  function addStage() {
    const stageId = crypto.randomUUID();
    const milestoneId = crypto.randomUUID();
    setTemplate((current) => ({
      ...current,
      stages: [
        ...current.stages,
        {
          id: stageId,
          templateId: current.id,
          title: `Etap ${current.stages.length + 1}`,
          position: current.stages.length,
          milestones: [
            {
              id: milestoneId,
              stageId,
              title: "Kamień milowy",
              position: 0,
              plannedDate: null,
              items: [],
            },
          ],
        },
      ],
    }));
  }

  function addMilestone(stageId: string) {
    setTemplate((current) => ({
      ...current,
      stages: current.stages.map((stage) => {
        if (stage.id !== stageId) {
          return stage;
        }
        const milestoneId = crypto.randomUUID();
        return {
          ...stage,
          milestones: [
            ...stage.milestones,
            {
              id: milestoneId,
              stageId,
              title: "Nowy kamień milowy",
              position: stage.milestones.length,
              plannedDate: null,
              items: [],
            },
          ],
        };
      }),
    }));
  }

  function addItem(stageId: string, milestoneId: string, kind: ProcessItemKind) {
    setTemplate((current) => ({
      ...current,
      stages: current.stages.map((stage) => {
        if (stage.id !== stageId) {
          return stage;
        }
        return {
          ...stage,
          milestones: stage.milestones.map((milestone) => {
            if (milestone.id !== milestoneId) {
              return milestone;
            }
            const itemId = crypto.randomUUID();
            return {
              ...milestone,
              items: [
                ...milestone.items,
                {
                  id: itemId,
                  milestoneId,
                  kind,
                  title:
                    kind === "protocol"
                      ? "Protokół odbioru"
                      : kind === "settlement"
                        ? "Rozliczenie"
                        : "Nowa checklista",
                  position: milestone.items.length,
                },
              ],
            };
          }),
        };
      }),
    }));
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-4 py-5">
          <Field label="Nazwa szablonu">
            <Input
              value={template.name}
              onChange={(event) => setTemplate({ ...template, name: event.target.value })}
            />
          </Field>
          <Field label="Opis">
            <Input
              value={template.description}
              onChange={(event) =>
                setTemplate({ ...template, description: event.target.value })
              }
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={addStage}>
              Dodaj etap
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? "Zapisywanie…" : "Zapisz szablon"}
            </Button>
          </div>
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 py-5">
          <ProcessPipeline template={template} />
        </CardContent>
      </Card>

      {template.stages.map((stage) => (
        <Card key={stage.id}>
          <CardContent className="grid gap-4 py-5">
            <Field label={`Etap ${stage.position + 1}`}>
              <Input
                value={stage.title}
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    stages: current.stages.map((entry) =>
                      entry.id === stage.id ? { ...entry, title: event.target.value } : entry,
                    ),
                  }))
                }
              />
            </Field>
            <Button type="button" variant="secondary" size="sm" onClick={() => addMilestone(stage.id)}>
              Dodaj kamień milowy
            </Button>

            {stage.milestones.map((milestone) => (
              <div key={milestone.id} className="grid gap-3 rounded-xl border border-border/70 p-4">
                <Field label="Kamień milowy">
                  <Input
                    value={milestone.title}
                    onChange={(event) =>
                      setTemplate((current) => ({
                        ...current,
                        stages: current.stages.map((stageEntry) =>
                          stageEntry.id !== stage.id
                            ? stageEntry
                            : {
                                ...stageEntry,
                                milestones: stageEntry.milestones.map((milestoneEntry) =>
                                  milestoneEntry.id === milestone.id
                                    ? { ...milestoneEntry, title: event.target.value }
                                    : milestoneEntry,
                                ),
                              },
                        ),
                      }))
                    }
                  />
                </Field>

                <Field label="Planowana data">
                  <Input
                    type="date"
                    value={milestoneDateToInput(milestone.plannedDate)}
                    onChange={(event) =>
                      setTemplate((current) => ({
                        ...current,
                        stages: current.stages.map((stageEntry) =>
                          stageEntry.id !== stage.id
                            ? stageEntry
                            : {
                                ...stageEntry,
                                milestones: stageEntry.milestones.map((milestoneEntry) =>
                                  milestoneEntry.id === milestone.id
                                    ? {
                                        ...milestoneEntry,
                                        plannedDate: inputToMilestoneDate(event.target.value),
                                      }
                                    : milestoneEntry,
                                ),
                              },
                        ),
                      }))
                    }
                  />
                </Field>

                {milestone.items.map((item) => (
                  <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_180px]">
                    <Field label="Element">
                      <Input
                        value={item.title}
                        onChange={(event) =>
                          setTemplate((current) => ({
                            ...current,
                            stages: current.stages.map((stageEntry) =>
                              stageEntry.id !== stage.id
                                ? stageEntry
                                : {
                                    ...stageEntry,
                                    milestones: stageEntry.milestones.map((milestoneEntry) =>
                                      milestoneEntry.id !== milestone.id
                                        ? milestoneEntry
                                        : {
                                            ...milestoneEntry,
                                            items: milestoneEntry.items.map((itemEntry) =>
                                              itemEntry.id === item.id
                                                ? { ...itemEntry, title: event.target.value }
                                                : itemEntry,
                                            ),
                                          },
                                    ),
                                  },
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Typ">
                      <Select
                        value={item.kind}
                        onChange={(event) =>
                          setTemplate((current) => ({
                            ...current,
                            stages: current.stages.map((stageEntry) =>
                              stageEntry.id !== stage.id
                                ? stageEntry
                                : {
                                    ...stageEntry,
                                    milestones: stageEntry.milestones.map((milestoneEntry) =>
                                      milestoneEntry.id !== milestone.id
                                        ? milestoneEntry
                                        : {
                                            ...milestoneEntry,
                                            items: milestoneEntry.items.map((itemEntry) =>
                                              itemEntry.id === item.id
                                                ? {
                                                    ...itemEntry,
                                                    kind: event.target.value as ProcessItemKind,
                                                  }
                                                : itemEntry,
                                            ),
                                          },
                                    ),
                                  },
                            ),
                          }))
                        }
                      >
                        {PROCESS_ITEM_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {PROCESS_ITEM_KIND_LABELS[kind]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => addItem(stage.id, milestone.id, "checklist")}
                  >
                    + Checklista
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => addItem(stage.id, milestone.id, "protocol")}
                  >
                    + Protokół
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => addItem(stage.id, milestone.id, "settlement")}
                  >
                    + Rozliczenie
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
