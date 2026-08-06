"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { DEFAULT_CONTRACT_MODULE_SETTINGS, type ContractModuleSettings } from "@/lib/contracts/module-settings";
import {
  fetchContractModuleSettings,
  saveContractModuleSettings,
} from "@/lib/supabase/contract-module-settings-repository";

export default function ContractSettingsPage() {
  const [settings, setSettings] = useState<ContractModuleSettings>(DEFAULT_CONTRACT_MODULE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchContractModuleSettings()
      .then(setSettings)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać ustawień."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveContractModuleSettings(settings);
      setSettings(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać ustawień.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Sprzedaż"
        title="Ustawienia umów"
        description="Domyślne progi rabatowe dla kategorii tabel opcjonalnych oraz rozliczenia płatności „inne”."
        action={
          <Button variant="secondary" asChild>
            <Link href="/umowy">Umowy</Link>
          </Button>
        }
      />

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      <Card>
        <CardContent className="grid gap-6 py-5">
          <section className="grid gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Progi rabatowe kategorii</h2>
              <p className="mt-1 text-sm text-muted">
                Wartości domyślne podpowiadane przy oznaczaniu tabeli opcjonalnej daną kategorią —
                każdą umowę/tabelę można potem dostosować indywidualnie.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instalacja (kompleksowa) — rabat %">
                <NumericInput
                  value={settings.instalacjaDiscountPercent}
                  disabled={loading}
                  onChange={(value) => setSettings({ ...settings, instalacjaDiscountPercent: Math.min(100, Math.max(0, value)) })}
                />
              </Field>
              <Field label="Instalacje dodatkowe — rabat %">
                <NumericInput
                  value={settings.instalacjeDodatkoweDiscountPercent}
                  disabled={loading}
                  onChange={(value) =>
                    setSettings({ ...settings, instalacjeDodatkoweDiscountPercent: Math.min(100, Math.max(0, value)) })
                  }
                />
              </Field>
              <Field label="Dodatki — rabat %">
                <NumericInput
                  value={settings.dodatkiDiscountPercent}
                  disabled={loading}
                  onChange={(value) => setSettings({ ...settings, dodatkiDiscountPercent: Math.min(100, Math.max(0, value)) })}
                />
              </Field>
            </div>
          </section>

          <section className="grid gap-4 border-t border-border/60 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Rozliczenie „inne” (gotówka, 0% VAT)</h2>
              <p className="mt-1 text-sm text-muted">
                Dodatkowy rabat naliczany od kwoty, którą klient przy podpisywaniu przypisze do
                rozliczenia „inne”.
              </p>
            </div>
            <Field label="Rabat od kwoty „inne” %" className="sm:max-w-xs">
              <NumericInput
                value={settings.inneDiscountPercent}
                disabled={loading}
                onChange={(value) => setSettings({ ...settings, inneDiscountPercent: Math.min(100, Math.max(0, value)) })}
              />
            </Field>
          </section>

          <div className="border-t border-border/60 pt-6">
            <Button disabled={saving || loading} onClick={() => void handleSave()}>
              {saving ? "Zapisywanie…" : "Zapisz ustawienia"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
