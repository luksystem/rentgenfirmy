"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StandardEditorForm } from "@/components/standards/standard-editor-form";
import { createStandard } from "@/lib/supabase/standards-repository";
import type { CompanyStandardInput } from "@/lib/standards/types";
import { useAuthStore } from "@/store/auth-store";

export default function NewStandardPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(input: CompanyStandardInput) {
    setSaving(true);
    setError(null);
    try {
      const created = await createStandard(input, profile?.id ?? null);
      router.push(`/standardy/${created.slug}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać standardu.");
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Standardy i procedury" title="Nowy standard" description="" />
      <Card>
        <CardContent className="py-5">
          {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
          <StandardEditorForm onSave={handleSave} saving={saving} />
        </CardContent>
      </Card>
    </>
  );
}
