"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  StackedDialogContent,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  REQUISITION_CATEGORIES,
  REQUISITION_CATEGORY_LABELS,
  normalizeRequisitionInput,
  type RequisitionCategory,
} from "@/lib/requisitions/types";
import { createRequisition, updateRequisitionStatus } from "@/lib/supabase/requisition-repository";
import { useAuthStore } from "@/store/auth-store";

/**
 * Popup wersja zgłoszenia zapotrzebowania — osadzana przy elemencie listy (checklista, moduł
 * dokumentacyjny), zeby zgłoszenie problemu od razu miało dalszy ciąg zamiast utykać w opisie.
 * Pełny formularz (`RequisitionForm`) zostaje na `/zapotrzebowania/nowy` bez zmian — ten dialog to
 * cieńszy wariant tego samego zapisu (`createRequisition`/`updateRequisitionStatus`), na sztywno
 * przypięty do projektu i zawsze wysyłany od razu do akceptacji.
 */
export function RequisitionQuickDialog({
  open,
  onOpenChange,
  projectId,
  initialTitle,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  initialTitle?: string;
  onCreated?: () => void;
}) {
  const displayName = useAuthStore((state) => state.displayName);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequisitionCategory>("tools");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle ?? "");
      setDescription("");
      setCategory("tools");
      setError(null);
    }
  }, [open, initialTitle]);

  async function handleSubmit() {
    const normalized = normalizeRequisitionInput({
      title,
      description,
      category,
      scope: "project",
      projectId,
      clientId: null,
    });
    if (!normalized.title) {
      setError("Podaj tytuł zapotrzebowania.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createRequisition(normalized, displayName || "Zespół");
      await updateRequisitionStatus(created.id, "submitted", displayName || "Zespół");
      onOpenChange(false);
      onCreated?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Nie udało się zapisać zapotrzebowania.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <StackedDialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Zgłoś zapotrzebowanie</DialogTitle>
          <DialogDescription>
            Trafi od razu do akceptacji, powiązane z tym projektem.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Kategoria">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as RequisitionCategory)}
            >
              {REQUISITION_CATEGORIES.map((entry) => (
                <option key={entry} value={entry}>
                  {REQUISITION_CATEGORY_LABELS[entry]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tytuł">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Np. Wiertarka udarowa, kurtka robocza L…"
            />
          </Field>
          <Field label="Opis">
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Szczegóły, rozmiar, model, uzasadnienie…"
            />
          </Field>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={saving || !title.trim()}
              onClick={() => void handleSubmit()}
            >
              {saving ? "Zapisywanie…" : "Zgłoś zapotrzebowanie"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
          </div>
        </div>
      </StackedDialogContent>
    </Dialog>
  );
}
