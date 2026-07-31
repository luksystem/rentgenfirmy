"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  DEFAULT_POLICY_THRESHOLDS,
  type PolicyThresholds,
} from "@/lib/policy-thresholds/types";
import {
  fetchPolicyThresholds,
  savePolicyThresholds,
} from "@/lib/supabase/policy-thresholds-repository";

/**
 * D19/CLAUDE.md — "progi będące polityką firmy, nie atrybutem projektu ani szablonu" (lib/policy-thresholds/types.ts).
 * Do dziś wartości żyły wyłącznie w `app_settings` bez żadnego ekranu do edycji — czytelne i
 * zapisywalne z kodu, nieosiągalne dla kogokolwiek bez dostępu do bazy. Ten edytor domyka lukę,
 * nie dodaje nowej polityki: pola i opisy 1:1 z `PolicyThresholds`.
 */
const FIELD_META: {
  key: keyof PolicyThresholds;
  label: string;
  help: string;
}[] = [
  {
    key: "warrantyExpiryNoticeDays",
    label: "Powiadomienie przed końcem gwarancji",
    help: "Ile dni przed końcem pokrycia wysłać jedno powiadomienie (cron „warranty-expiring”).",
  },
  {
    key: "rotStagnationDays",
    label: "ROT — brak ruchu",
    help: "Pozycja bez ruchu dłużej niż tyle dni dostaje badge „bez ruchu” w rejestrze.",
  },
  {
    key: "rotReviewBufferDays",
    label: "ROT — bufor przed terminem",
    help: "Sugerowana data kontroli dla pozycji z terminem = termin minus tyle dni.",
  },
  {
    key: "rotReviewWaitingClientDays",
    label: "ROT — oczekiwanie na klienta",
    help: "Sugerowana data kontroli dla pozycji czekających na zewnętrzne, bez własnego terminu.",
  },
  {
    key: "rotReviewDefaultIntervalDays",
    label: "ROT — domyślny interwał",
    help: "Sugerowana data kontroli dla pozycji w toku bez terminu i bez oczekiwania.",
  },
  {
    key: "silenceTimeoutInProgressDays",
    label: "Bezpiecznik ciszy — projekt w trakcie",
    help: "Brak komunikatu do inwestora przez tyle dni → wymuszony status pośredni (D19 §6, faza komunikacji „w trakcie”).",
  },
  {
    key: "silenceTimeoutHoldDays",
    label: "Bezpiecznik ciszy — projekt wstrzymany",
    help: "To samo, dłuższe okno — projekt świadomie wstrzymany nie ma być traktowany jak porzucony.",
  },
  {
    key: "silenceWarningDays",
    label: "Ostrzeżenie przed bezpiecznikiem",
    help: "Ile dni przed zadziałaniem bezpiecznika ciszy pokazać ostrzeżenie.",
  },
  {
    key: "activityHysteresisLowDays",
    label: "Histereza aktywności — dolny próg",
    help: "Dni bez aktywności do przełączenia projektu w stan mniej aktywny.",
  },
  {
    key: "activityHysteresisHighDays",
    label: "Histereza aktywności — górny próg",
    help: "Dni aktywności do przełączenia projektu w stan bardziej aktywny.",
  },
  {
    key: "substituteRequiredWorkingDays",
    label: "Zastępstwo wymagane od",
    help: "Nieobecność odpowiedzialnego krótsza niż tyle dni roboczych nie wymaga formalnego zastępstwa.",
  },
];

export function PolicyThresholdsEditor({ canEdit }: { canEdit: boolean }) {
  const [draft, setDraft] = useState<PolicyThresholds>(DEFAULT_POLICY_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPolicyThresholds()
      .then((loaded) => {
        if (!cancelled) setDraft(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Nie udało się wczytać progów.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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
      const result = await savePolicyThresholds(draft);
      setDraft(result);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać progów.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Wczytywanie progów…</p>;
  }

  return (
    <Card className="border border-border/80">
      <CardContent className="space-y-4 py-4">
        <div>
          <p className="font-medium text-foreground">Progi polityki firmy</p>
          <p className="mt-1 text-sm text-muted">
            Liczby dni, które sterują powiadomieniami i bezpiecznikami w całej aplikacji — nie
            różnią się per projekt ani szablon.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {FIELD_META.map(({ key, label, help }) => (
            <Field key={key} label={label}>
              <NumericInput
                decimals={false}
                value={draft[key]}
                disabled={!canEdit || saving}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, [key]: value ?? DEFAULT_POLICY_THRESHOLDS[key] }))
                }
              />
              <p className="mt-1 text-xs text-muted">{help}</p>
            </Field>
          ))}
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-300">Zapisano.</p> : null}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" disabled={!canEdit || saving} onClick={() => void handleSave()}>
            {saving ? "Zapisywanie…" : "Zapisz progi"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
