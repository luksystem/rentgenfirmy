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
  CALCULATOR_ELECTRICAL_RATE_TYPES,
  CALCULATOR_ELECTRICAL_RATE_TYPE_LABELS,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  CALCULATOR_OTHER_SYSTEM_LABELS,
} from "@/lib/calculator/types";
import {
  CALCULATOR_HARDWARE_LABELS,
  DEFAULT_CALCULATOR_SETTINGS,
  DEFAULT_HARDWARE_CATALOG,
  type CalculatorHardwareCatalog,
  type CalculatorSettings,
} from "@/lib/calculator/settings";
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
        description="Cennik pakietu OPTIMUM — baza systemu, kategorie funkcjonalne, instalacja elektryczna, dodatki i rabaty. Wartości startowe zweryfikowane przeciw plikowi ofertowemu."
        action={
          <Button variant="secondary" asChild>
            <Link href="/kalkulacje">Kalkulacje</Link>
          </Button>
        }
      />

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      <Card>
        <CardContent className="grid gap-6 py-5">
          <Section title="Baza systemu" description="Projekt / wykonanie rozdzielni / sterownik i zasilanie — wg liczby kondygnacji.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Projekt — jedna kondygnacja">
                <NumericInput
                  value={settings.baseSystem.projektJednaKondygnacja}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, projektJednaKondygnacja: v } })}
                />
              </Field>
              <Field label="Projekt — wiele kondygnacji">
                <NumericInput
                  value={settings.baseSystem.projektWieleKondygnacji}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, projektWieleKondygnacji: v } })}
                />
              </Field>
              <Field label="Próg dopłaty za duży dom [m²]">
                <NumericInput
                  value={settings.baseSystem.projektDuzyDomProgM2}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, projektDuzyDomProgM2: v } })}
                />
              </Field>
              <Field label="Dopłata za duży dom">
                <NumericInput
                  value={settings.baseSystem.projektDuzyDomDoplata}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, projektDuzyDomDoplata: v } })}
                />
              </Field>
              <Field label="Baza — sterownik/zasilanie — jedna kondygnacja">
                <NumericInput
                  value={settings.baseSystem.bazaZasilanieJednaKondygnacja}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, bazaZasilanieJednaKondygnacja: v } })}
                />
              </Field>
              <Field label="Baza — sterownik/zasilanie — wiele kondygnacji">
                <NumericInput
                  value={settings.baseSystem.bazaZasilanieWieleKondygnacji}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, baseSystem: { ...settings.baseSystem, bazaZasilanieWieleKondygnacji: v } })}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Wykonanie rozdzielni"
            description="Sprzęt rozdzielni wg liczby kondygnacji + cena progowa wg całkowitej liczby punktów elektrycznych w instalacji (silnik liczy ją automatycznie z odpowiedzi ankiety)."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Sprzęt rozdzielni — jedna kondygnacja">
                <NumericInput
                  value={settings.rozdzielnia.sprzetJednaKondygnacja}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, sprzetJednaKondygnacja: v } })}
                />
              </Field>
              <Field label="Sprzęt rozdzielni — wiele kondygnacji">
                <NumericInput
                  value={settings.rozdzielnia.sprzetWieleKondygnacji}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, sprzetWieleKondygnacji: v } })}
                />
              </Field>
              <Field label="Wzrost cen sprzętu [%]">
                <NumericInput
                  value={settings.rozdzielnia.wzrostCenProcent}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, wzrostCenProcent: v } })}
                />
              </Field>
              <Field label="Próg punktów — niski">
                <NumericInput
                  value={settings.rozdzielnia.progPunktowNiski}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, progPunktowNiski: v } })}
                />
              </Field>
              <Field label="Próg punktów — wysoki">
                <NumericInput
                  value={settings.rozdzielnia.progPunktowWysoki}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, progPunktowWysoki: v } })}
                />
              </Field>
              <Field label="Cena poniżej progu niskiego">
                <NumericInput
                  value={settings.rozdzielnia.cenaPonizejProguNiskiego}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, cenaPonizejProguNiskiego: v } })}
                />
              </Field>
              <Field label="Cena poniżej progu wysokiego">
                <NumericInput
                  value={settings.rozdzielnia.cenaPonizejProguWysokiego}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, cenaPonizejProguWysokiego: v } })}
                />
              </Field>
              <Field label="Cena powyżej progu wysokiego">
                <NumericInput
                  value={settings.rozdzielnia.cenaPowyzejProguWysokiego}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, cenaPowyzejProguWysokiego: v } })}
                />
              </Field>
              <Field label="Punkty — podstawowe wyposażenie (przybliżenie)">
                <NumericInput
                  value={settings.rozdzielnia.podstawoweWyposazeniePunkty}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({ ...settings, rozdzielnia: { ...settings.rozdzielnia, podstawoweWyposazeniePunkty: v } })
                  }
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Katalog sprzętu (kategorie funkcjonalne)"
            description="Ceny jednostkowe pozycji sprzętu, z których liczą się kategorie Oświetlenie/Bezpieczeństwo/Temperatura/Rolety/Zewnętrzne — ilości dobiera silnik z odpowiedzi ankiety."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {(Object.keys(DEFAULT_HARDWARE_CATALOG) as (keyof CalculatorHardwareCatalog)[]).map((key) => (
                <Field key={key} label={CALCULATOR_HARDWARE_LABELS[key]}>
                  <NumericInput
                    value={settings.hardware[key]}
                    disabled={loading}
                    onChange={(v) => setSettings({ ...settings, hardware: { ...settings.hardware, [key]: v } })}
                  />
                </Field>
              ))}
              <Field label="Stawka roboczogodziny">
                <NumericInput
                  value={settings.laborRatePerHour}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, laborRatePerHour: v })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Instalacja elektryczna — stawki wg typu punktu">
            <div className="grid gap-4 sm:grid-cols-4">
              {CALCULATOR_ELECTRICAL_RATE_TYPES.map((type) => (
                <Field key={type} label={CALCULATOR_ELECTRICAL_RATE_TYPE_LABELS[type]}>
                  <NumericInput
                    value={settings.electrical.rates[type]}
                    disabled={loading}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        electrical: { ...settings.electrical, rates: { ...settings.electrical.rates, [type]: v } },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dystans referencyjny [km]" className="sm:max-w-xs">
                <NumericInput
                  value={settings.electrical.referencyjnyDystansKm}
                  decimals={false}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, electrical: { ...settings.electrical, referencyjnyDystansKm: v } })}
                />
              </Field>
              <Field label="Dopłata za km netto/punkt" className="sm:max-w-xs">
                <NumericInput
                  value={settings.electrical.doplataZaKmNettoNaPunkt}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({ ...settings, electrical: { ...settings.electrical, doplataZaKmNettoNaPunkt: v } })
                  }
                />
              </Field>
            </div>
          </Section>

          <Section title="Instalacja elektryczna — pozycje ryczałtowe">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Kanał TV">
                <NumericInput
                  value={settings.electrical.fixed.kanalTv}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, kanalTv: v } } })}
                />
              </Field>
              <Field label="Antena z masztem">
                <NumericInput
                  value={settings.electrical.fixed.antenaZMasztem}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({ ...settings, electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, antenaZMasztem: v } } })
                  }
                />
              </Field>
              <Field label="Dzierżawa rozdzielni budowlanej">
                <NumericInput
                  value={settings.electrical.fixed.dzierzawaRozdzielniBudowlanej}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, dzierzawaRozdzielniBudowlanej: v } },
                    })
                  }
                />
              </Field>
              <Field label="Obsadzenie rozdzielni głównej">
                <NumericInput
                  value={settings.electrical.fixed.obsadzenieRozdzielniGlownej}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, obsadzenieRozdzielniGlownej: v } },
                    })
                  }
                />
              </Field>
              <Field label="Przyłącze — za metr">
                <NumericInput
                  value={settings.electrical.fixed.przylaczeZaMetr}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({ ...settings, electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, przylaczeZaMetr: v } } })
                  }
                />
              </Field>
              <Field label="Formalności odbiorowe">
                <NumericInput
                  value={settings.electrical.fixed.formalnosciOdbiorowe}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, formalnosciOdbiorowe: v } },
                    })
                  }
                />
              </Field>
              <Field label="Pomiary wewnętrzne — za punkt">
                <NumericInput
                  value={settings.electrical.fixed.pomiaryWewnetrzneZaPunkt}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, pomiaryWewnetrzneZaPunkt: v } },
                    })
                  }
                />
              </Field>
              <Field label="Dodatkowe bruzdowanie — za metr">
                <NumericInput
                  value={settings.electrical.fixed.dodatkoweBruzdowanieZaMetr}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, dodatkoweBruzdowanieZaMetr: v } },
                    })
                  }
                />
              </Field>
              <Field label="Podstawowe wyposażenie instalacji (czujki, bramy, domofon, RG)">
                <NumericInput
                  value={settings.electrical.fixed.podstawoweWyposazenieInstalacji}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      electrical: {
                        ...settings.electrical,
                        fixed: { ...settings.electrical.fixed, podstawoweWyposazenieInstalacji: v },
                      },
                    })
                  }
                />
              </Field>
              <Field label="Dopłata za bramę garażową">
                <NumericInput
                  value={settings.electrical.fixed.doplataZaBrameGarazowa}
                  disabled={loading}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      electrical: { ...settings.electrical, fixed: { ...settings.electrical.fixed, doplataZaBrameGarazowa: v } },
                    })
                  }
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Przyciski i dodatkowe czujki"
            description="Ceny orientacyjne — w źródłowym pliku oznaczone jako „do ustalenia z Inwestorem”, tu wycenione ilość×cena."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Przycisk szklany (PRESTIŻ)">
                <NumericInput
                  value={settings.extras.cenaPrzyciskuPrestiz}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, extras: { ...settings.extras, cenaPrzyciskuPrestiz: v } })}
                />
              </Field>
              <Field label="Przycisk plastikowy / dotykowy (NORMAL)">
                <NumericInput
                  value={settings.extras.cenaPrzyciskuNormal}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, extras: { ...settings.extras, cenaPrzyciskuNormal: v } })}
                />
              </Field>
              <Field label="Dodatkowa czujka">
                <NumericInput
                  value={settings.extras.cenaZaDodatkowaCzujke}
                  disabled={loading}
                  onChange={(v) => setSettings({ ...settings, extras: { ...settings.extras, cenaZaDodatkowaCzujke: v } })}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Dodatki"
            description="Cena jednostkowa netto per pozycja. „Czujniki otwarcia okien” nie są tu edytowalne — cena zależy od tego, czy okna mają fabryczne czujniki (patrz katalog sprzętu: Kontaktron okno/drzwi)."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {CALCULATOR_ADDON_KEYS.filter((key) => key !== "czujnikiOtwarciaOkien").map((key) => (
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

          <Section title="Rabaty">
            <div className="grid gap-4 sm:grid-cols-3">
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
