"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_ADDON_LABELS,
  CALCULATOR_FUNCTIONAL_CATEGORIES,
  CALCULATOR_FUNCTIONAL_CATEGORY_LABELS,
  CALCULATOR_HOUSE_SIZE_TIERS,
  CALCULATOR_HOUSE_SIZE_TIER_LABELS,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  CALCULATOR_OTHER_SYSTEM_LABELS,
} from "@/lib/calculator/types";
import { DEFAULT_CALCULATOR_SETTINGS, type CalculatorSettings } from "@/lib/calculator/settings";
import { fetchCalculatorSettings, saveCalculatorSettings } from "@/lib/supabase/calculator-settings-repository";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border/60 pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function CalculatorSettingsPage() {
  const [settings, setSettings] = useState<CalculatorSettings>(DEFAULT_CALCULATOR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCalculatorSettings()
      .then(setSettings)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać ustawień."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveCalculatorSettings(settings);
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
        title="Ustawienia kalkulatora ofert"
        description="Cennik pakietu OPTIMUM — progi metrażowe, poziomy kategorii, dodatki i rabaty. Wartości startowe z pliku ofertowego, do zweryfikowania."
        action={
          <Button variant="secondary" asChild>
            <Link href="/kalkulacje">Kalkulacje</Link>
          </Button>
        }
      />

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      <Card>
        <CardContent className="grid gap-6 py-5">
          <Section title="Rozdzielnica — sprzęt" description="Skrzynka + zugi + zabezpieczenia + materiały, wg progu metrażowego.">
            <div className="grid gap-4 sm:grid-cols-3">
              {CALCULATOR_HOUSE_SIZE_TIERS.map((tier) => (
                <Field key={tier} label={CALCULATOR_HOUSE_SIZE_TIER_LABELS[tier]}>
                  <NumericInput
                    value={settings.baseSystem.rozdzielnicaSprzet[tier]}
                    disabled={loading}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        baseSystem: {
                          ...settings.baseSystem,
                          rozdzielnicaSprzet: { ...settings.baseSystem.rozdzielnicaSprzet, [tier]: v },
                        },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Automatyka — baza i zasilanie" description="Sterownik + zasilanie buforowe/rezerwowe/KNX + zasilacze LED.">
            <div className="grid gap-4 sm:grid-cols-3">
              {CALCULATOR_HOUSE_SIZE_TIERS.map((tier) => (
                <Field key={tier} label={CALCULATOR_HOUSE_SIZE_TIER_LABELS[tier]}>
                  <NumericInput
                    value={settings.baseSystem.automatykaBaza[tier]}
                    disabled={loading}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        baseSystem: { ...settings.baseSystem, automatykaBaza: { ...settings.baseSystem.automatykaBaza, [tier]: v } },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Projekt — dom jednokondygnacyjny">
            <div className="grid gap-4 sm:grid-cols-3">
              {CALCULATOR_HOUSE_SIZE_TIERS.map((tier) => (
                <Field key={tier} label={CALCULATOR_HOUSE_SIZE_TIER_LABELS[tier]}>
                  <NumericInput
                    value={settings.baseSystem.projektJednaKondygnacja[tier]}
                    disabled={loading}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        baseSystem: {
                          ...settings.baseSystem,
                          projektJednaKondygnacja: { ...settings.baseSystem.projektJednaKondygnacja, [tier]: v },
                        },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Projekt — dom wielokondygnacyjny">
            <div className="grid gap-4 sm:grid-cols-3">
              {CALCULATOR_HOUSE_SIZE_TIERS.map((tier) => (
                <Field key={tier} label={CALCULATOR_HOUSE_SIZE_TIER_LABELS[tier]}>
                  <NumericInput
                    value={settings.baseSystem.projektWieleKondygnacji[tier]}
                    disabled={loading}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        baseSystem: {
                          ...settings.baseSystem,
                          projektWieleKondygnacji: { ...settings.baseSystem.projektWieleKondygnacji, [tier]: v },
                        },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Wykonanie rozdzielni na budowie" description="Progi wg liczby punktów elektrycznych.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="< 300 pkt">
                <NumericInput
                  value={settings.baseSystem.wykonanieRozdzielniProg1}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, wykonanieRozdzielniProg1: v } })}
                />
              </Field>
              <Field label="< 600 pkt">
                <NumericInput
                  value={settings.baseSystem.wykonanieRozdzielniProg2}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, wykonanieRozdzielniProg2: v } })}
                />
              </Field>
              <Field label="≥ 600 pkt">
                <NumericInput
                  value={settings.baseSystem.wykonanieRozdzielniProg3}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, wykonanieRozdzielniProg3: v } })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Wstępna konfiguracja">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dom jednokondygnacyjny">
                <NumericInput
                  value={settings.baseSystem.konfiguracjaJednaKondygnacja}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, konfiguracjaJednaKondygnacja: v } })}
                />
              </Field>
              <Field label="Dom wielokondygnacyjny">
                <NumericInput
                  value={settings.baseSystem.konfiguracjaWieleKondygnacji}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, konfiguracjaWieleKondygnacji: v } })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Kategorie funkcjonalne" description="Cena za wybrany poziom (Podstawa/Komfort/Prestiż).">
            <div className="grid gap-4">
              {CALCULATOR_FUNCTIONAL_CATEGORIES.map((category) => (
                <div key={category} className="grid gap-2 rounded-xl border border-border/60 p-3">
                  <p className="text-sm font-medium text-foreground">{CALCULATOR_FUNCTIONAL_CATEGORY_LABELS[category]}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(["podstawa", "komfort", "prestiz"] as const).map((level) => (
                      <Field key={level} label={level === "podstawa" ? "Podstawa" : level === "komfort" ? "Komfort" : "Prestiż"}>
                        <NumericInput
                          value={settings.functional[category][level]}
                          disabled={loading}
                          onChange={(v) =>
                            setSettings({
                              ...settings,
                              functional: {
                                ...settings.functional,
                                [category]: { ...settings.functional[category], [level]: v },
                              },
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Dodatki" description="Cena jednostkowa netto per pozycja.">
            <div className="grid gap-4 sm:grid-cols-3">
              {CALCULATOR_ADDON_KEYS.map((key) => (
                <Field key={key} label={CALCULATOR_ADDON_LABELS[key]}>
                  <NumericInput
                    value={settings.addons[key]}
                    disabled={loading}
                    onChange={(v) => setSettings({ ...settings, addons: { ...settings.addons, [key]: v } })}
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Inne systemy" description="Cena bazowa per system (dla domyślnych ilości).">
            <div className="grid gap-4 sm:grid-cols-3">
              {CALCULATOR_OTHER_SYSTEM_KEYS.map((key) => (
                <Field key={key} label={CALCULATOR_OTHER_SYSTEM_LABELS[key]}>
                  <NumericInput
                    value={settings.otherSystems[key]}
                    disabled={loading}
                    onChange={(v) => setSettings({ ...settings, otherSystems: { ...settings.otherSystems, [key]: v } })}
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Instalacja elektryczna" description="Zryczałtowana cena za punkt (uproszczenie modelu 5-stawkowego).">
            <Field label="Cena za punkt [netto]" className="sm:max-w-xs">
              <NumericInput
                value={settings.electrical.cenaZaPunkt}
                disabled={loading}
                onChange={(v) => setSettings({ ...settings, electrical: { ...settings.electrical, cenaZaPunkt: v } })}
              />
            </Field>
          </Section>

          <Section title="Rabaty">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Projekt przy kompleksowej instalacji [%]">
                <NumericInput
                  value={settings.discounts.projektKompleksowaPercent}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({ ...settings, discounts: { ...settings.discounts, projektKompleksowaPercent: Math.min(100, Math.max(0, v)) } })
                  }
                />
              </Field>
              <Field label="Instalacja elektryczna przy kompleksowości [%]">
                <NumericInput
                  value={settings.discounts.instalacjaKompleksowaPercent}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      discounts: { ...settings.discounts, instalacjaKompleksowaPercent: Math.min(100, Math.max(0, v)) },
                    })
                  }
                />
              </Field>
              <Field label="Płatność z góry [%]">
                <NumericInput
                  value={settings.discounts.platnoscZGoryPercent}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({ ...settings, discounts: { ...settings.discounts, platnoscZGoryPercent: Math.min(100, Math.max(0, v)) } })
                  }
                />
              </Field>
              <Field label="Max rabat na inne systemy [%, proporcjonalnie]">
                <NumericInput
                  value={settings.discounts.inneSystemyMaxPercent}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({ ...settings, discounts: { ...settings.discounts, inneSystemyMaxPercent: Math.min(100, Math.max(0, v)) } })
                  }
                />
              </Field>
            </div>
          </Section>

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
