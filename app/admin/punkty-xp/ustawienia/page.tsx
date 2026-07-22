"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { fetchXpSettings, saveXpSettings } from "@/lib/supabase/xp-repository";
import { defaultXpSettings, type XpSettings } from "@/lib/xp/settings";

export default function XpSettingsPage() {
  const [settings, setSettings] = useState<XpSettings>(defaultXpSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetchXpSettings()
      .then(setSettings)
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać ustawień.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await saveXpSettings(settings);
      setSettings(result);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać ustawień.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administracja"
        title="Ustawienia punktów XP"
        description="Waga punktu w zł i sugerowane limity — miękkie wskazówki widoczne w formularzu wymiany, nie blokada."
        action={
          <Button variant="secondary" asChild>
            <Link href="/admin/punkty-xp">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 py-4">
          {loading ? (
            <p className="text-sm text-muted">Wczytywanie…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Wartość 1 punktu (zł)">
                  <NumericInput
                    value={settings.pointWeightPln}
                    onChange={(value) => {
                      setSettings((current) => ({ ...current, pointWeightPln: value }));
                      setSaved(false);
                    }}
                  />
                </Field>
                <Field label="Sugerowana maks. kwota wymiany (zł)">
                  <NumericInput
                    value={settings.suggestedMaxAmountPln}
                    onChange={(value) => {
                      setSettings((current) => ({ ...current, suggestedMaxAmountPln: value }));
                      setSaved(false);
                    }}
                  />
                </Field>
              </div>
              <Field label="Sugerowana częstotliwość wymiany">
                <Input
                  value={settings.suggestedFrequencyLabel}
                  onChange={(event) => {
                    setSettings((current) => ({ ...current, suggestedFrequencyLabel: event.target.value }));
                    setSaved(false);
                  }}
                  placeholder="np. Kwartalnie"
                />
              </Field>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              {saved ? <p className="text-sm text-emerald-300">Zapisano.</p> : null}

              <div className="flex justify-end">
                <Button type="button" variant="secondary" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "Zapisywanie…" : "Zapisz ustawienia"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
