"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchMonthlyReviewSettings,
  saveMonthlyReviewSettings,
} from "@/lib/supabase/monthly-review-repository";
import type { MonthlyReviewSettings } from "@/lib/monthly-reviews/settings";
import { defaultMonthlyReviewSettings } from "@/lib/monthly-reviews/settings";
import { useAuthStore } from "@/store/auth-store";

export default function MonthlyReviewSettingsPage() {
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const [settings, setSettings] = useState<MonthlyReviewSettings>(defaultMonthlyReviewSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchMonthlyReviewSettings()
      .then((result) => {
        if (!cancelled) {
          setSettings(result);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać ustawień.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await saveMonthlyReviewSettings(settings);
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
        eyebrow="Ustawienia"
        title="Oceny miesięczne"
        description="Widoczność oceny przełożonego dla pracownika. Raport AI udostępnia się osobno, decyzją administratora przy konkretnej ocenie."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia">Wróć do ustawień</Link>
          </Button>
        }
      />

      <Card className="border border-border/80">
        <CardContent className="space-y-4 py-4">
          {loading ? (
            <p className="text-sm text-muted">Wczytywanie…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    Pracownik widzi ocenę przełożonego
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Gdy włączone, pracownik zobaczy ocenę (liczbę + komentarz) wystawioną przez
                    przełożonego dopiero po tym, jak obie strony złożą swoje oceny za dany miesiąc.
                    Gdy wyłączone, ocenę przełożonego widzi tylko manager/administrator.
                  </p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border bg-surface-muted text-accent focus:ring-accent/30"
                    checked={settings.employeeCanSeeManagerAssessment}
                    disabled={!isAdministrator || saving}
                    onChange={(event) => {
                      setSettings({ employeeCanSeeManagerAssessment: event.target.checked });
                      setSaved(false);
                    }}
                  />
                  Widoczna
                </label>
              </div>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              {saved ? <p className="text-sm text-emerald-300">Zapisano.</p> : null}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!isAdministrator || saving}
                  onClick={() => void handleSave()}
                >
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
