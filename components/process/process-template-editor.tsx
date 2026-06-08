"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { TemplateChecklistLinesEditor } from "@/components/process/template-checklist-lines-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { templatePayloadFromTitle } from "@/lib/process/item-payload";
import { moveItem, removeAt, withPositions } from "@/lib/process/template-editor-utils";
import {
  PROCESS_ITEM_KINDS,
  PROCESS_ITEM_KIND_LABELS,
  type ChecklistItemPayload,
  type ProcessItem,
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
              items: [],
            },
          ],
        };
      }),
    }));
  }

  function addItem(stageId: string, milestoneId: string, kind: ProcessItemKind) {
    const title =
      kind === "protocol" ? "Protokół odbioru" : kind === "settlement" ? "Rozliczenie" : "Nowa checklista";

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
                  title,
                  position: milestone.items.length,
                  defaultPayload: templatePayloadFromTitle(title, kind),
                },
              ],
            };
          }),
        };
      }),
    }));
  }

  function updateItem(
    stageId: string,
    milestoneId: string,
    itemId: string,
    patch: Partial<ProcessItem>,
  ) {
    setTemplate((current) => ({
      ...current,
      stages: current.stages.map((stage) =>
        stage.id !== stageId
          ? stage
          : {
              ...stage,
              milestones: stage.milestones.map((milestone) =>
                milestone.id !== milestoneId
                  ? milestone
                  : {
                      ...milestone,
                      items: milestone.items.map((item) =>
                        item.id !== itemId ? item : { ...item, ...patch },
                      ),
                    },
              ),
            },
      ),
    }));
  }

  function updateItemPayload(
    stageId: string,
    milestoneId: string,
    itemId: string,
    defaultPayload: ChecklistItemPayload,
  ) {
    updateItem(stageId, milestoneId, itemId, { defaultPayload });
  }

  function moveMilestoneItem(
    stageId: string,
    milestoneId: string,
    itemIndex: number,
    direction: "up" | "down",
  ) {
    setTemplate((current) => ({
      ...current,
      stages: current.stages.map((stage) =>
        stage.id !== stageId
          ? stage
          : {
              ...stage,
              milestones: stage.milestones.map((milestone) =>
                milestone.id !== milestoneId
                  ? milestone
                  : {
                      ...milestone,
                      items: withPositions(moveItem(milestone.items, itemIndex, direction)),
                    },
              ),
            },
      ),
    }));
  }

  function removeMilestoneItem(stageId: string, milestoneId: string, itemIndex: number) {
    setTemplate((current) => ({
      ...current,
      stages: current.stages.map((stage) =>
        stage.id !== stageId
          ? stage
          : {
              ...stage,
              milestones: stage.milestones.map((milestone) =>
                milestone.id !== milestoneId
                  ? milestone
                  : {
                      ...milestone,
                      items: withPositions(removeAt(milestone.items, itemIndex)),
                    },
              ),
            },
      ),
    }));
  }

  function updateItemKind(
    stageId: string,
    milestoneId: string,
    itemId: string,
    kind: ProcessItemKind,
    title: string,
  ) {
    updateItem(stageId, milestoneId, itemId, {
      kind,
      defaultPayload: templatePayloadFromTitle(title, kind),
    });
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
          <p className="text-sm text-muted">
            Podgląd pipeline — daty kamieni milowych ustawiasz w projekcie, nie w szablonie.
          </p>
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

                {milestone.items.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-xl border border-border/60 bg-surface-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Element {itemIndex + 1}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={itemIndex === 0}
                          onClick={() => moveMilestoneItem(stage.id, milestone.id, itemIndex, "up")}
                          aria-label="Przesuń element w górę"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={itemIndex === milestone.items.length - 1}
                          onClick={() => moveMilestoneItem(stage.id, milestone.id, itemIndex, "down")}
                          aria-label="Przesuń element w dół"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => removeMilestoneItem(stage.id, milestone.id, itemIndex)}
                          aria-label="Usuń element"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                      <Field label="Nazwa elementu">
                        <Input
                          value={item.title}
                          onChange={(event) =>
                            updateItem(stage.id, milestone.id, item.id, { title: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Typ">
                        <Select
                          value={item.kind}
                          onChange={(event) =>
                            updateItemKind(
                              stage.id,
                              milestone.id,
                              item.id,
                              event.target.value as ProcessItemKind,
                              item.title,
                            )
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

                    {item.kind === "checklist" ? (
                      <TemplateChecklistLinesEditor
                        payload={item.defaultPayload}
                        onChange={(defaultPayload) =>
                          updateItemPayload(stage.id, milestone.id, item.id, defaultPayload)
                        }
                      />
                    ) : (
                      <p className="text-xs text-muted">
                        Wzorzec dla tego typu elementu opiera się na nazwie — szczegóły uzupełnisz w
                        projekcie.
                      </p>
                    )}
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
