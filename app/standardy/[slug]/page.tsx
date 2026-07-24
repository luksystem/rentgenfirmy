"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardEditorForm } from "@/components/standards/standard-editor-form";
import {
  deleteStandard,
  fetchStandardBySlug,
  updateStandard,
} from "@/lib/supabase/standards-repository";
import type { CompanyStandard, CompanyStandardInput } from "@/lib/standards/types";
import { isAdministratorRole } from "@/lib/auth/types";
import { useAuthStore } from "@/store/auth-store";

export default function StandardDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = Boolean(profile && isAdministratorRole(profile.role));
  const [standard, setStandard] = useState<CompanyStandard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setStandard(await fetchStandardBySlug(params.slug));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać standardu.");
    } finally {
      setIsLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(input: CompanyStandardInput) {
    if (!standard) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStandard(standard.id, input);
      setStandard(updated);
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać zmian.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!standard || !window.confirm(`Usunąć standard „${standard.title}”?`)) return;
    await deleteStandard(standard.id);
    router.push("/standardy");
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">Wczytywanie...</CardContent>
      </Card>
    );
  }

  if (!standard) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-rose-400">
          {error ?? "Nie znaleziono standardu."}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Standardy i procedury"
        title={standard.title}
        description={standard.summary}
        action={
          isAdmin ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing((prev) => !prev)}>
                <Pencil className="h-4 w-4" />
                {editing ? "Anuluj" : "Edytuj"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void handleDelete()}>
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </div>
          ) : null
        }
      />

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      {editing ? (
        <Card>
          <CardContent className="py-5">
            <StandardEditorForm initial={standard} onSave={handleSave} saving={saving} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Badge tone={standard.status === "published" ? "active" : "neutral"}>
            {standard.status === "published" ? "Opublikowany" : "Szkic"}
          </Badge>

          {standard.contextHtml ? (
            <Card>
              <CardHeader>
                <CardTitle>Kontekst</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted">
                {standard.contextHtml}
              </CardContent>
            </Card>
          ) : null}

          {standard.steps.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Kroki</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {standard.steps.map((step, index) => (
                  <div key={index} className="rounded-lg border border-border p-3">
                    <p className="font-medium text-foreground">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{step.bodyHtml}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {standard.tipsHtml ? (
            <Card>
              <CardHeader>
                <CardTitle>Wskazówki</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted">
                {standard.tipsHtml}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
