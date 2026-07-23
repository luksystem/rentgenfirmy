"use client";

import { useState } from "react";
import {
  CredentialFormFields,
  emptyCredentialInput,
} from "@/components/dashboard/project-system-credentials-panel";
import { Button } from "@/components/ui/button";
import type { SystemCredentialInput } from "@/lib/dashboard/system-credentials-types";

export function CredentialQuickCreateForm({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<SystemCredentialInput>(emptyCredentialInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!form.label.trim() || !form.password.trim()) {
      setError("Podaj nazwę systemu i hasło.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/project-system-credentials/${encodeURIComponent(projectId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się dodać hasła.");
      }
      onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Błąd zapisu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <CredentialFormFields form={form} onChange={setForm} includePassword passwordRequired />
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <Button
        type="button"
        disabled={saving || !form.label.trim() || !form.password.trim()}
        onClick={() => void handleCreate()}
      >
        {saving ? "Zapisywanie…" : "Zapisz hasło"}
      </Button>
    </div>
  );
}
