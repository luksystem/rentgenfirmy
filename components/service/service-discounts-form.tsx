import { Field, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { VAT_RATES, type ServiceDiscounts } from "@/lib/service/types";

export function ServiceDiscountsForm({
  discounts,
  onChange,
}: {
  discounts: ServiceDiscounts;
  onChange: (discounts: ServiceDiscounts) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Rabat procentowy %">
        <NumericInput
          value={discounts.percentDiscount}
          onChange={(value) =>
            onChange({
              ...discounts,
              percentDiscount: Math.min(100, value),
            })
          }
        />
      </Field>
      <Field label="Rabat specjalny PLN">
        <NumericInput
          value={discounts.specialDiscountPln}
          onChange={(value) =>
            onChange({
              ...discounts,
              specialDiscountPln: value,
            })
          }
        />
      </Field>
      <Field label="Stawka VAT">
        <Select
          value={discounts.vatRate}
          onChange={(e) =>
            onChange({
              ...discounts,
              vatRate: Number(e.target.value) as ServiceDiscounts["vatRate"],
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
    </div>
  );
}
