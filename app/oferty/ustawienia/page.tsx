"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import { VAT_RATES } from "@/lib/service/types";
import { useServiceStore } from "@/store/service-store";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-border/60 pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function OfertySettingsPage() {
  const settings = useServiceStore((s) => s.settings);
  const updateSettings = useServiceStore((s) => s.updateSettings);
  const isSaving = useServiceStore((s) => s.isSaving);
  const error = useServiceStore((s) => s.error);

  const intakeSettings = settings.intakeSettings ?? DEFAULT_SERVICE_SETTINGS.intakeSettings;

  return (
    <>
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.serviceSettlement.eyebrow}
        title="Ustawienia stawek"
        description="Stawki rozliczeń serwisowych, dopłaty zgłoszeń pogwarancyjnych, strefy km i rabaty domyślne."
        action={
          <Button variant="secondary" asChild>
            <Link href="/oferty">Lista ofert</Link>
          </Button>
        }
      />

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      <Card>
        <CardContent className="grid gap-2 py-5">
          <SettingsSection
            title="Zgłoszenia serwisowe po gwarancji"
            description="Parametry orientacyjnej wyceny AI w formularzu klienta (/zgloszenie), gdy obiekt jest pogwarancyjny."
          >
            <Field label="Dopłata CAFE C / A (%)">
              <NumericInput
                value={intakeSettings.prioritySurchargePercent}
                onChange={(value) =>
                  void updateSettings({
                    ...settings,
                    intakeSettings: {
                      ...intakeSettings,
                      prioritySurchargePercent: Math.max(0, value),
                    },
                  })
                }
              />
            </Field>
            <div className="sm:col-span-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Dopłata doliczana automatycznie do <strong>wszystkich stawek</strong> w orientacyjnej
              wycenie AI, gdy klient wybierze priorytet{" "}
              <strong>C — Krytyczny</strong> lub <strong>A — Asap</strong> przy zgłoszeniu
              serwisowym bez aktywnej gwarancji. Priorytety F i E — bez dopłaty.
            </div>
          </SettingsSection>

          <SettingsSection
            title="Stawki robocizny i dojazdu"
            description="Domyślne stawki dla nowych rozliczeń serwisowych."
          >
            {(
              [
                ["supervisionHourly", "Stawka godzinowa nadzoru"],
                ["installerHourly", "Stawka godzinowa instalatora"],
                ["helperHourly", "Stawka godzinowa pomocnika"],
                ["programmerHourly", "Stawka godzinowa programisty"],
                ["carPerKm", "Stawka auta za kilometr"],
                ["carHourly", "Stawka godziny w aucie"],
                ["accommodationCost", "Koszt noclegu"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <NumericInput
                  value={settings.rates[key]}
                  onChange={(value) =>
                    void updateSettings({
                      ...settings,
                      rates: { ...settings.rates, [key]: value },
                    })
                  }
                />
              </Field>
            ))}
          </SettingsSection>

          <SettingsSection title="Strefy kilometrowe">
            <Field label="Próg strefy 1 (km)">
              <NumericInput
                decimals={false}
                value={settings.zoneSettings.zone1ThresholdKm}
                onChange={(value) =>
                  void updateSettings({
                    ...settings,
                    zoneSettings: {
                      ...settings.zoneSettings,
                      zone1ThresholdKm: value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Próg strefy 2 (km)">
              <NumericInput
                decimals={false}
                value={settings.zoneSettings.zone2ThresholdKm}
                onChange={(value) =>
                  void updateSettings({
                    ...settings,
                    zoneSettings: {
                      ...settings.zoneSettings,
                      zone2ThresholdKm: value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Próg strefy 3 (km)">
              <NumericInput
                decimals={false}
                value={settings.zoneSettings.zone3ThresholdKm}
                onChange={(value) =>
                  void updateSettings({
                    ...settings,
                    zoneSettings: {
                      ...settings.zoneSettings,
                      zone3ThresholdKm: value,
                    },
                  })
                }
              />
            </Field>
          </SettingsSection>

          <SettingsSection title="Rabaty i VAT domyślne">
            <Field label="Domyślny rabat %">
              <NumericInput
                value={settings.defaultDiscounts.percentDiscount}
                onChange={(value) =>
                  void updateSettings({
                    ...settings,
                    defaultDiscounts: {
                      ...settings.defaultDiscounts,
                      percentDiscount: Math.min(100, value),
                    },
                  })
                }
              />
            </Field>
            <Field label="Domyślny rabat specjalny PLN">
              <NumericInput
                value={settings.defaultDiscounts.specialDiscountPln}
                onChange={(value) =>
                  void updateSettings({
                    ...settings,
                    defaultDiscounts: {
                      ...settings.defaultDiscounts,
                      specialDiscountPln: value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Domyślny VAT">
              <Select
                value={settings.defaultDiscounts.vatRate}
                onChange={(e) =>
                  void updateSettings({
                    ...settings,
                    defaultDiscounts: {
                      ...settings.defaultDiscounts,
                      vatRate: Number(e.target.value) as typeof settings.defaultDiscounts.vatRate,
                    },
                  })
                }
              >
                {VAT_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </Select>
            </Field>
          </SettingsSection>

          <div className="border-t border-border/60 pt-6">
            <Button disabled={isSaving} onClick={() => void updateSettings(settings)}>
              {isSaving ? "Zapisywanie…" : "Zapisz ustawienia"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
