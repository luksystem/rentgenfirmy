"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import { VAT_RATES } from "@/lib/service/types";
import { useServiceStore } from "@/store/service-store";

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

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
              <Input
                type="number"
                min={0}
                step={0.01}
                value={settings.rates[key]}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    rates: { ...settings.rates, [key]: num(e.target.value) },
                  })
                }
              />
            </Field>
          ))}

          <Field label="Próg strefy 1 (km)">
            <Input
              type="number"
              min={0}
              value={settings.zoneSettings.zone1ThresholdKm}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  zoneSettings: {
                    ...settings.zoneSettings,
                    zone1ThresholdKm: num(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Próg strefy 2">
            <Input
              type="number"
              min={0}
              value={settings.zoneSettings.zone2ThresholdKm}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  zoneSettings: {
                    ...settings.zoneSettings,
                    zone2ThresholdKm: num(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Próg strefy 3">
            <Input
              type="number"
              min={0}
              value={settings.zoneSettings.zone3ThresholdKm}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  zoneSettings: {
                    ...settings.zoneSettings,
                    zone3ThresholdKm: num(e.target.value),
                  },
                })
              }
            />
          </Field>

          <Field label="Domyślny rabat %">
            <Input
              type="number"
              min={0}
              max={100}
              value={settings.defaultDiscounts.percentDiscount}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  defaultDiscounts: {
                    ...settings.defaultDiscounts,
                    percentDiscount: num(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Domyślny rabat specjalny PLN">
            <Input
              type="number"
              min={0}
              value={settings.defaultDiscounts.specialDiscountPln}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  defaultDiscounts: {
                    ...settings.defaultDiscounts,
                    specialDiscountPln: num(e.target.value),
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

          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button onClick={() => updateSettings(settings)}>Zapisz ustawienia</Button>
            <Button variant="secondary" onClick={() => updateSettings(DEFAULT_SERVICE_SETTINGS)}>
              Przywróć domyślne
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
