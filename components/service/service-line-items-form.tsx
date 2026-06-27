"use client";

import { Field } from "@/components/ui/input";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { NumericInput } from "@/components/ui/numeric-input";
import { resolveKilometerZone } from "@/lib/service/kilometer-zone";
import type { BillableFlags, KilometerZoneSettings, ServiceLineItems } from "@/lib/service/types";

function BillableCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border bg-surface-muted text-accent"
      />
      <span>{label}</span>
    </label>
  );
}

export function ServiceLineItemsForm({
  title,
  items,
  zoneSettings,
  onChange,
}: {
  title: string;
  items: ServiceLineItems;
  zoneSettings: KilometerZoneSettings;
  onChange: (items: ServiceLineItems) => void;
}) {
  const zone = resolveKilometerZone(items.kilometersOneWay, zoneSettings);
  const trips = Math.max(1, items.tripCount || 1);
  const totalKm = items.kilometersOneWay * 2 * trips;

  function patch<K extends keyof ServiceLineItems>(key: K, value: ServiceLineItems[K]) {
    onChange({ ...items, [key]: value });
  }

  function patchBillable(key: keyof BillableFlags, value: boolean) {
    onChange({
      ...items,
      billable: { ...items.billable, [key]: value },
    });
  }

  return (
    <div className="grid gap-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted">
        Strefa kilometrowa (pomoc): <strong>{zone}</strong> · Sugerowane godziny w aucie na wyjazd:{" "}
        <strong>{zone * 2}</strong>
        {trips > 1 ? (
          <>
            {" "}
            · Łącznie <strong>{totalKm} km</strong> i <strong>{zone * 2 * trips} h</strong> w aucie (
            {trips} wyjazdy)
          </>
        ) : null}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ilość noclegów">
          <NumericInput
            decimals={false}
            value={items.accommodations}
            onChange={(value) => patch("accommodations", value)}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.accommodations}
            onChange={(v) => patchBillable("accommodations", v)}
          />
        </Field>

        <Field label="Godziny nadzoru">
          <NumericInput
            value={items.supervisionHours}
            onChange={(value) => patch("supervisionHours", value)}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.supervisionHours}
            onChange={(v) => patchBillable("supervisionHours", v)}
          />
        </Field>

        <Field label="Godziny programisty">
          <NumericInput
            value={items.programmerHours}
            onChange={(value) => patch("programmerHours", value)}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.programmerHours}
            onChange={(v) => patchBillable("programmerHours", v)}
          />
        </Field>

        <Field label="Godziny instalatora">
          <NumericInput
            value={items.installerHours}
            onChange={(value) => patch("installerHours", value)}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.installerHours}
            onChange={(v) => patchBillable("installerHours", v)}
          />
        </Field>

        <Field label="Godziny pomocnika">
          <NumericInput
            value={items.helperHours}
            onChange={(value) => patch("helperHours", value)}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.helperHours}
            onChange={(v) => patchBillable("helperHours", v)}
          />
        </Field>

        <Field label="Godziny w aucie">
          <NumericInput
            value={items.carHours}
            onChange={(value) => patch("carHours", value)}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.carHours}
            onChange={(v) => patchBillable("carHours", v)}
          />
        </Field>

        <Field label="Kilometry w jedną stronę">
          <NumericInput
            decimals={false}
            value={items.kilometersOneWay}
            onChange={(value) => patch("kilometersOneWay", value)}
          />
          <BillableCheckbox
            label="Kilometry auta — do rozliczenia"
            checked={items.billable.carKilometers}
            onChange={(v) => patchBillable("carKilometers", v)}
          />
        </Field>

        <Field label="Ilość wyjazdów">
          <NumericInput
            decimals={false}
            value={items.tripCount}
            onChange={(value) => patch("tripCount", Math.max(1, value))}
          />
          <p className="text-xs text-muted">
            Mnożnik kosztów auta (km i godziny w aucie). Np. 50 km × 10 wyjazdów.
          </p>
        </Field>

        <Field label="Koszt materiałów (PLN)">
          <NumericInput
            value={items.materialsCost}
            onChange={(value) => patch("materialsCost", value)}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.materials}
            onChange={(v) => patchBillable("materials", v)}
          />
        </Field>
      </div>

      <Field label="Notatka do użytych materiałów">
        <RichTextarea
          value={items.materialsNote}
          onChange={(value) => patch("materialsNote", value)}
        />
      </Field>

      <Field label="Notatka do raportu z prac">
        <RichTextarea value={items.workReportNote} onChange={(value) => patch("workReportNote", value)} />
      </Field>
    </div>
  );
}
