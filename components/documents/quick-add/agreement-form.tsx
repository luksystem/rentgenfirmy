"use client";

import { useEffect, useState } from "react";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { DEFAULT_AGREEMENT_VAT_RATE, normalizeAgreementVatRate } from "@/lib/dashboard/agreement-cost";
import {
  PROJECT_AGREEMENT_CATEGORIES,
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  normalizeProjectAgreementInput,
  type ProjectAgreementInput,
} from "@/lib/dashboard/agreement-types";
import { TEAM_APPROVER_ROLE_LABEL } from "@/lib/dashboard/agreement-collaboration-types";
import { fetchProjectAccessibleProfiles } from "@/lib/supabase/project-access-repository";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import type { UserProfile } from "@/lib/auth/types";
import { useProjectAgreementStore } from "@/store/project-agreement-store";

function emptyInput(): ProjectAgreementInput {
  return {
    title: "",
    body: "",
    category: "other",
    proposedCostNet: null,
    proposedCostGross: null,
    proposedCostVatRate: DEFAULT_AGREEMENT_VAT_RATE,
    costNote: "",
    publicEnabled: false,
    communicationProtocols: [],
    approverRoles: [
      { label: TEAM_APPROVER_ROLE_LABEL, isRequired: true, isTeamRole: true },
      { label: "Klient", isRequired: true, isClientRole: true },
    ],
    acceptanceDeadlineStageId: null,
    blocksNextStage: false,
    responsibleUserId: null,
  };
}

export function AgreementQuickCreateForm({
  projectId,
  authorName,
  onCreated,
}: {
  projectId: string;
  authorName: string;
  onCreated: () => void;
}) {
  const createAgreement = useProjectAgreementStore((state) => state.createAgreement);
  const [form, setForm] = useState<ProjectAgreementInput>(emptyInput());
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProjectAccessibleProfiles(projectId)
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, [projectId]);

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Podaj tytuł ustalenia.");
      return;
    }
    if (!form.responsibleUserId) {
      setError("Wybierz osobę odpowiedzialną.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createAgreement(projectId, normalizeProjectAgreementInput(form), {
        name: authorName,
        side: "team",
      });
      onCreated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać ustalenia.");
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
          placeholder="np. Dodatkowe gniazdo w salonie"
        />
      </Field>
      <Field label="Treść">
        <Textarea
          rows={4}
          value={form.body}
          onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
          placeholder="Opis ustalenia dla klienta…"
        />
      </Field>
      <Field label="Kategoria">
        <Select
          value={form.category}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              category: event.target.value as ProjectAgreementInput["category"],
            }))
          }
        >
          {PROJECT_AGREEMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {PROJECT_AGREEMENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Osoba odpowiedzialna">
        <Select
          value={form.responsibleUserId ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, responsibleUserId: event.target.value || null }))
          }
        >
          <option value="">Wybierz…</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profileToOptionLabel(profile)}
            </option>
          ))}
        </Select>
      </Field>
      <AgreementCostFields
        net={form.proposedCostNet ?? null}
        vatRate={normalizeAgreementVatRate(form.proposedCostVatRate)}
        onChange={(value) => setForm((current) => ({ ...current, ...value }))}
        compact
      />
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <Button type="button" disabled={saving} onClick={() => void handleSave()}>
        {saving ? "Zapisywanie…" : "Zapisz ustalenie"}
      </Button>
    </div>
  );
}
