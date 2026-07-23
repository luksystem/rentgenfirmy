"use client";

import { useState } from "react";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { DEFAULT_AGREEMENT_VAT_RATE, normalizeAgreementVatRate } from "@/lib/dashboard/agreement-cost";
import {
  normalizeProjectChangeRequestInput,
  type ProjectChangeRequestInput,
} from "@/lib/dashboard/change-request-types";
import { useProjectChangeRequestStore } from "@/store/project-change-request-store";

function emptyInput(): ProjectChangeRequestInput {
  return {
    title: "",
    body: "",
    proposedCostNet: null,
    proposedCostGross: null,
    proposedCostVatRate: DEFAULT_AGREEMENT_VAT_RATE,
    costNote: "",
    acceptanceDeadlineStageId: null,
    blocksNextStage: false,
  };
}

export function ChangeRequestQuickCreateForm({
  projectId,
  authorName,
  onCreated,
}: {
  projectId: string;
  authorName: string;
  onCreated: () => void;
}) {
  const createChangeRequest = useProjectChangeRequestStore((state) => state.createChangeRequest);
  const [form, setForm] = useState<ProjectChangeRequestInput>(emptyInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Podaj tytuł zmiany.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createChangeRequest(projectId, normalizeProjectChangeRequestInput(form), {
        name: authorName,
        side: "team",
      });
      onCreated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać zmiany.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Field label="Tytuł">
        <Input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="np. Dodatkowy panel w garażu"
        />
      </Field>
      <Field label="Treść">
        <Textarea
          rows={4}
          value={form.body}
          onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
          placeholder="Opis proponowanej zmiany dla klienta…"
        />
      </Field>
      <AgreementCostFields
        net={form.proposedCostNet ?? null}
        vatRate={normalizeAgreementVatRate(form.proposedCostVatRate)}
        onChange={(value) => setForm((current) => ({ ...current, ...value }))}
        compact
      />
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <Button type="button" disabled={saving} onClick={() => void handleSave()}>
        {saving ? "Zapisywanie…" : "Zapisz zmianę"}
      </Button>
    </div>
  );
}
