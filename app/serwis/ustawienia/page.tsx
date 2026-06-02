"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { VAT_RATES } from "@/lib/service/types";
import { useServiceStore } from "@/store/service-store";

export default function SerwisSettingsPage() {
  const settings = useServiceStore((s) => s.settings);
  const updateSettings = useServiceStore((s) => s.updateSettings);

  return (
    <>
      <PageHeader
        eyebrow="Serwis"
        title="Ustawienia stawek serwisowych"
        description="Domyślne stawki, strefy kilometrowe i rabaty dla nowych serwisów."
        action={
          <Button variant="secondary" asChild>
            <Link href="/serwis">Lista serwisów</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
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
                  updateSettings({
                    ...settings,
                    rates: { ...settings.rates, [key]: value },
                  })
                }
              />
            </Field>
          ))}

          <Field label="Próg strefy 1 (km)">
            <NumericInput
              decimals={false}
              value={settings.zoneSettings.zone1ThresholdKm}
              onChange={(value) =>
                updateSettings({
                  ...settings,
                  zoneSettings: {
                    ...settings.zoneSettings,
                    zone1ThresholdKm: value,
                  },
                })
              }
            />
          </Field>
          <Field label="Próg strefy 2">
            <NumericInput
              decimals={false}
              value={settings.zoneSettings.zone2ThresholdKm}
              onChange={(value) =>
                updateSettings({
                  ...settings,
                  zoneSettings: {
                    ...settings.zoneSettings,
                    zone2ThresholdKm: value,
                  },
                })
              }
            />
          </Field>
          <Field label="Próg strefy 3">
            <NumericInput
              decimals={false}
              value={settings.zoneSettings.zone3ThresholdKm}
              onChange={(value) =>
                updateSettings({
                  ...settings,
                  zoneSettings: {
                    ...settings.zoneSettings,
                    zone3ThresholdKm: value,
                  },
                })
              }
            />
          </Field>

          <Field label="Domyślny rabat %">
            <NumericInput
              value={settings.defaultDiscounts.percentDiscount}
              onChange={(value) =>
                updateSettings({
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
                updateSettings({
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
                updateSettings({
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

          <div className="sm:col-span-2">
            <Button onClick={() => updateSettings(settings)}>Zapisz ustawienia</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
