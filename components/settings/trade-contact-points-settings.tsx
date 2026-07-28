"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ContactPointPhotoThumbnail } from "@/components/contact-point-photo-thumbnail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  PROJECT_AGREEMENT_CATEGORIES,
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  type ProjectAgreementCategory,
} from "@/lib/dashboard/agreement-types";
import type {
  TradeContactPoint,
  TradeContactPointInput,
} from "@/lib/dashboard/trade-contact-point-types";
import { validateTradeContactPointInput } from "@/lib/dashboard/trade-contact-point-types";
import {
  createTradeContactPoint,
  deleteTradeContactPoint,
  fetchTradeContactPoints,
  removeTradeContactPointPhoto,
  updateTradeContactPoint,
  uploadTradeContactPointPhoto,
} from "@/lib/supabase/trade-contact-point-repository";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

function emptyInput(defaultProjectType: string): TradeContactPointInput {
  return {
    projectType: defaultProjectType,
    tradeNames: [],
    title: "",
    description: "",
    category: "integration",
    blockingStageId: null,
    blocksNextStage: false,
    isActive: true,
  };
}

export function TradeContactPointsSettings() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const projectTypes = fieldOptions.projectTypes;
  const tradeNames = useMemo(
    () => fieldOptions.tradeCatalogItems.map((item) => item.name),
    [fieldOptions.tradeCatalogItems],
  );

  const processHydrate = useProcessStore((state) => state.hydrate);
  const templates = useProcessStore((state) => state.templates);

  useEffect(() => {
    void processHydrate(projectTypes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processHydrate]);

  const [points, setPoints] = useState<TradeContactPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setPoints(await fetchTradeContactPoints());
      setListError(null);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Nie udało się wczytać punktów styku.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TradeContactPointInput>(emptyInput(projectTypes[0] ?? ""));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const stagesForFormType = useMemo(
    () => templates.find((template) => template.projectType === form.projectType)?.stages ?? [],
    [templates, form.projectType],
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyInput(projectTypes[0] ?? ""));
    setPhotoFile(null);
    setExistingPhotoPath(null);
    setRemovePhoto(false);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(point: TradeContactPoint) {
    setEditingId(point.id);
    setForm({
      projectType: point.projectType,
      tradeNames: point.tradeNames,
      title: point.title,
      description: point.description,
      category: point.category,
      blockingStageId: point.blockingStageId,
      blocksNextStage: point.blocksNextStage,
      isActive: point.isActive,
    });
    setPhotoFile(null);
    setExistingPhotoPath(point.photoStoragePath);
    setRemovePhoto(false);
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setPhotoFile(null);
  }

  function toggleTrade(name: string) {
    setForm((current) => ({
      ...current,
      tradeNames: current.tradeNames.includes(name)
        ? current.tradeNames.filter((entry) => entry !== name)
        : [...current.tradeNames, name],
    }));
  }

  async function handleSave() {
    const validationError = validateTradeContactPointInput(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      let saved: TradeContactPoint;
      if (editingId) {
        saved = await updateTradeContactPoint(editingId, form);
      } else {
        saved = await createTradeContactPoint(form);
      }

      if (photoFile) {
        saved = await uploadTradeContactPointPhoto(saved.id, photoFile);
      } else if (removePhoto && saved.photoStoragePath) {
        saved = await removeTradeContactPointPhoto(saved.id);
      }

      setPoints((current) => {
        const exists = current.some((entry) => entry.id === saved.id);
        return exists
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [saved, ...current];
      });
      closeDialog();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Nie udało się zapisać punktu styku.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(point: TradeContactPoint) {
    if (!window.confirm(`Usunąć punkt styku „${point.title}"?`)) {
      return;
    }
    try {
      await deleteTradeContactPoint(point.id);
      setPoints((current) => current.filter((entry) => entry.id !== point.id));
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Nie udało się usunąć punktu styku.");
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Punkt styku to kombinacja co najmniej dwóch branż dla danego typu projektu (np. Stolarka +
        Smart Home), która automatycznie podpowiada gotowe ustalenie w projekcie, gdy obie branże są
        w nim obecne — wykonawca nie musi być aktywny.
      </p>

      {listError ? <p className="text-sm text-rose-400">{listError}</p> : null}

      {loading ? (
        <p className="text-sm text-muted">Ładowanie punktów styku…</p>
      ) : points.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
          Brak punktów styku. Dodaj pierwszy, aby zespół dostawał gotowe podpowiedzi ustaleń.
        </p>
      ) : (
        <div className="grid gap-3">
          {points.map((point) => (
            <Card key={point.id} className={cn(!point.isActive && "opacity-60")}>
              <CardContent className="flex flex-wrap items-start gap-3 py-4">
                {point.photoStoragePath ? (
                  <ContactPointPhotoThumbnail storagePath={point.photoStoragePath} />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-medium text-foreground">{point.title}</p>
                    <span className="rounded-full border border-border/70 bg-surface-muted/30 px-2 py-0.5 text-[10px] font-medium text-foreground/85">
                      {point.projectType}
                    </span>
                    <span className="rounded-full border border-border/70 bg-surface-muted/30 px-2 py-0.5 text-[10px] font-medium text-foreground/85">
                      {PROJECT_AGREEMENT_CATEGORY_LABELS[point.category]}
                    </span>
                    {!point.isActive ? (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                        Nieaktywny
                      </span>
                    ) : null}
                    {point.blocksNextStage && point.blockingStageId ? (
                      <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                        Blokuje etap
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">Branże: {point.tradeNames.join(" + ")}</p>
                  {point.description ? (
                    <p className="mt-1 break-words text-sm text-foreground/90">{point.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(point)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleDelete(point)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button type="button" className="w-fit" onClick={openCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Dodaj punkt styku
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          } else {
            setDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj punkt styku" : "Nowy punkt styku"}</DialogTitle>
            <DialogDescription>
              Po zapisaniu, gdy w projekcie tego typu pojawią się wszystkie wybrane branże, zespół
              zobaczy podpowiedź gotowego ustalenia.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Field label="Typ projektu">
              <select
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                value={form.projectType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    projectType: event.target.value,
                    blockingStageId: null,
                    blocksNextStage: false,
                  }))
                }
              >
                {projectTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Branże (min. 2)">
              <div className="flex flex-wrap gap-1.5">
                {tradeNames.map((name) => {
                  const selected = form.tradeNames.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                        selected
                          ? "border-accent/50 bg-accent/10 text-foreground"
                          : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
                      )}
                      onClick={() => toggleTrade(name)}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Tytuł">
              <Input
                value={form.title}
                placeholder="np. Czujki umieszczone w meblach"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </Field>

            <Field label="Opis (treść ustalenia dla klienta)">
              <Textarea
                value={form.description}
                rows={4}
                placeholder="Szczegóły ustalenia, które powstanie w projekcie…"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>

            <Field label="Kategoria ustalenia">
              <select
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as ProjectAgreementCategory,
                  }))
                }
              >
                {PROJECT_AGREEMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {PROJECT_AGREEMENT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
              <p className="text-sm font-medium text-foreground">Etap blokujący (opcjonalnie)</p>
              <Field label="Etap procesu">
                <select
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  value={form.blockingStageId ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      blockingStageId: event.target.value || null,
                      blocksNextStage: event.target.value ? current.blocksNextStage : false,
                    }))
                  }
                >
                  <option value="">Brak (nie wiąż z etapem procesu)</option>
                  {stagesForFormType.map((stage, index) => (
                    <option key={stage.id} value={stage.id}>
                      Etap {index + 1}: {stage.title}
                    </option>
                  ))}
                </select>
              </Field>
              {!stagesForFormType.length ? (
                <p className="text-xs text-amber-400">
                  Ten typ projektu nie ma jeszcze szablonu procesu — etapy pojawią się tu po jego
                  utworzeniu w Procesy.
                </p>
              ) : null}
              <label
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                  !form.blockingStageId
                    ? "border-border/60 bg-surface-muted/20 text-muted"
                    : form.blocksNextStage
                      ? "border-rose-500/40 bg-rose-500/10"
                      : "border-border/70",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.blocksNextStage ?? false}
                  disabled={!form.blockingStageId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, blocksNextStage: event.target.checked }))
                  }
                />
                <span>
                  <span className="font-medium text-foreground">Blokuje etap</span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    Ustalenie utworzone z tej podpowiedzi zablokuje wybrany etap (i wszystkie po nim) w
                    projekcie, dopóki nie zostanie zaakceptowane.
                  </span>
                </span>
              </label>
            </div>

            <Field label="Zdjęcie referencyjne (opcjonalnie)">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  setPhotoFile(event.target.files?.[0] ?? null);
                  setRemovePhoto(false);
                }}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
              />
              {existingPhotoPath && !removePhoto && !photoFile ? (
                <div className="mt-2 flex items-center gap-2">
                  <ContactPointPhotoThumbnail storagePath={existingPhotoPath} />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setRemovePhoto(true)}
                  >
                    Usuń zdjęcie
                  </Button>
                </div>
              ) : null}
            </Field>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              Aktywny (widoczny jako podpowiedź w projektach)
            </label>

            {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj punkt styku"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeDialog}>
                Anuluj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
