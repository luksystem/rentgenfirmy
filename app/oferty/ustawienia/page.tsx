"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { VAT_RATES } from "@/lib/service/types";
import { useServiceStore } from "@/store/service-store";

export default function OfertySettingsPage() {
  const settings = useServiceStore((s) => s.settings);
  const updateSettings = useServiceStore((s) => s.updateSettings);
  const isSaving = useServiceStore((s) => s.isSaving);
  const error = useServiceStore((s) => s.error);

  return (
    <>
      <PageHeader
        eyebrow="Oferty"
        title="Ustawienia stawek"
        description="Domyślne stawki, strefy kilometrowe i rabaty dla nowych ofert."
        action={
          <Button variant="secondary" asChild>
            <Link href="/oferty">Lista ofert</Link>
          </Button>
        }
      />

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

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
                  void updateSettings({
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
          <Field label="Próg strefy 2">
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
          <Field label="Próg strefy 3">
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

          <div className="sm:col-span-2">
            <Button disabled={isSaving} onClick={() => void updateSettings(settings)}>
              {isSaving ? "Zapisywanie…" : "Zapisz ustawienia"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
