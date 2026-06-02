"use client";

import { Field, Input, Textarea } from "@/components/ui/input";
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

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
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
        Strefa kilometrowa (pomoc): <strong>{zone}</strong> · Sugerowane godziny w aucie:{" "}
        <strong>{zone * 2}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ilość noclegów">
          <Input
            type="number"
            min={0}
            step={1}
            value={items.accommodations}
            onChange={(e) => patch("accommodations", num(e.target.value))}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.accommodations}
            onChange={(v) => patchBillable("accommodations", v)}
          />
        </Field>

        <Field label="Godziny nadzoru">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={items.supervisionHours}
            onChange={(e) => patch("supervisionHours", num(e.target.value))}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.supervisionHours}
            onChange={(v) => patchBillable("supervisionHours", v)}
          />
        </Field>

        <Field label="Godziny programisty">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={items.programmerHours}
            onChange={(e) => patch("programmerHours", num(e.target.value))}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.programmerHours}
            onChange={(v) => patchBillable("programmerHours", v)}
          />
        </Field>

        <Field label="Godziny instalatora">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={items.installerHours}
            onChange={(e) => patch("installerHours", num(e.target.value))}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.installerHours}
            onChange={(v) => patchBillable("installerHours", v)}
          />
        </Field>

        <Field label="Godziny pomocnika">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={items.helperHours}
            onChange={(e) => patch("helperHours", num(e.target.value))}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.helperHours}
            onChange={(v) => patchBillable("helperHours", v)}
          />
        </Field>

        <Field label="Godziny w aucie">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={items.carHours}
            onChange={(e) => patch("carHours", num(e.target.value))}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.carHours}
            onChange={(v) => patchBillable("carHours", v)}
          />
        </Field>

        <Field label="Kilometry w jedną stronę">
          <Input
            type="number"
            min={0}
            step={1}
            value={items.kilometersOneWay}
            onChange={(e) => patch("kilometersOneWay", num(e.target.value))}
          />
          <BillableCheckbox
            label="Kilometry auta — do rozliczenia"
            checked={items.billable.carKilometers}
            onChange={(v) => patchBillable("carKilometers", v)}
          />
        </Field>

        <Field label="Koszt materiałów (PLN)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={items.materialsCost}
            onChange={(e) => patch("materialsCost", num(e.target.value))}
          />
          <BillableCheckbox
            label="Do rozliczenia"
            checked={items.billable.materials}
            onChange={(v) => patchBillable("materials", v)}
          />
        </Field>
      </div>

      <Field label="Notatka do użytych materiałów">
        <Textarea
          value={items.materialsNote}
          onChange={(e) => patch("materialsNote", e.target.value)}
        />
      </Field>

      <Field label="Notatka do raportu z prac">
        <Textarea value={items.workReportNote} onChange={(e) => patch("workReportNote", e.target.value)} />
      </Field>
    </div>
  );
}
