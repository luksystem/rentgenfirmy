"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { moveItem, removeAt, withPositions } from "@/lib/process/template-editor-utils";
import {
  PROCESS_ITEM_KIND_LABELS,
  type ProcessElement,
  type ProcessItem,
  type ProcessTemplate,
} from "@/lib/process/types";

export function ProcessTemplateEditor({
  initialTemplate,
  elements,
  onSave,
}: {
  initialTemplate: ProcessTemplate;
  elements: ProcessElement[];
  onSave: (template: ProcessTemplate) => Promise<void>;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerElementId, setPickerElementId] = useState(elements[0]?.id ?? "");

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

  function placementFromElement(element: ProcessElement, milestoneId: string, position: number): ProcessItem {
    return {
      id: crypto.randomUUID(),
      milestoneId,
      elementId: element.id,
      kind: element.kind,
      title: element.title,
      position,
      defaultPayload: element.defaultPayload,
      isInternalAcceptance: element.isInternalAcceptance,
    };
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

  function addElementPlacement(stageId: string, milestoneId: string) {
    const element = elements.find((entry) => entry.id === pickerElementId);
    if (!element) {
      setError("Wybierz element procesu z katalogu.");
      return;
    }

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
            return {
              ...milestone,
              items: [
                ...milestone.items,
                placementFromElement(element, milestoneId, milestone.items.length),
              ],
            };
          }),
        };
      }),
    }));
    setError(null);
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
          <p className="text-sm text-muted">
            Elementy procesu (checklisty, protokoły) definiujesz w{" "}
            <Link href="/procesy/elementy" className="text-accent underline-offset-2 hover:underline">
              katalogu elementów
            </Link>
            , a tutaj tylko wstawiasz je w odpowiednie miejsca szablonu.
          </p>
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
          <p className="text-sm text-muted">Podgląd pipeline — daty kamieni milowych ustawiasz w projekcie.</p>
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
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-muted/20 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted">
                        {item.isInternalAcceptance
                          ? "Odbiór wewnętrzny (Quality Gate)"
                          : PROCESS_ITEM_KIND_LABELS[item.kind]}
                        {!item.isInternalAcceptance &&
                        item.kind === "checklist" &&
                        "lines" in item.defaultPayload &&
                        item.defaultPayload.lines.length
                          ? ` · ${item.defaultPayload.lines.length} pkt.`
                          : !item.isInternalAcceptance &&
                              item.kind === "kanban" &&
                              "columns" in item.defaultPayload
                            ? ` · ${item.defaultPayload.columns.length} kolumn`
                            : ""}
                      </p>
                      {item.isInternalAcceptance ? (
                        <Link
                          href={`/procesy/${encodeURIComponent(template.projectType)}/odbior/${item.id}`}
                          className="mt-1 inline-block text-xs text-accent hover:underline"
                        >
                          Konfiguruj checklistę odbioru
                        </Link>
                      ) : item.elementId ? (
                        <Link
                          href={`/procesy/elementy/${item.elementId}`}
                          className="mt-1 inline-block text-xs text-accent hover:underline"
                        >
                          Edytuj wzorzec
                        </Link>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={itemIndex === 0}
                        onClick={() => moveMilestoneItem(stage.id, milestone.id, itemIndex, "up")}
                        aria-label="Przesuń w górę"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={itemIndex === milestone.items.length - 1}
                        onClick={() => moveMilestoneItem(stage.id, milestone.id, itemIndex, "down")}
                        aria-label="Przesuń w dół"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => removeMilestoneItem(stage.id, milestone.id, itemIndex)}
                        aria-label="Usuń z szablonu"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Dodaj element z katalogu" className="min-w-[220px] flex-1">
                    <Select
                      value={pickerElementId}
                      onChange={(event) => setPickerElementId(event.target.value)}
                    >
                      {elements.length ? (
                        elements.map((element) => (
                          <option key={element.id} value={element.id}>
                            {element.title} ({PROCESS_ITEM_KIND_LABELS[element.kind]})
                          </option>
                        ))
                      ) : (
                        <option value="">Brak elementów w katalogu</option>
                      )}
                    </Select>
                  </Field>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!elements.length}
                    onClick={() => addElementPlacement(stage.id, milestone.id)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Wstaw element
                  </Button>
                  <Button type="button" size="sm" variant="secondary" asChild>
                    <Link href="/procesy/elementy/nowy">Nowy element</Link>
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
