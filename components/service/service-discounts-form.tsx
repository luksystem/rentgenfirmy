import { Field, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { VAT_RATES, type ServiceDiscounts } from "@/lib/service/types";

export function ServiceDiscountsForm({
  discounts,
  onChange,
  mode = "hourly",
}: {
  discounts: ServiceDiscounts;
  onChange: (discounts: ServiceDiscounts) => void;
  mode?: "hourly" | "fixed_price";
}) {
  const isFixedPrice = mode === "fixed_price";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {!isFixedPrice ? (
        <>
          <Field label="Rabat % praca i logistyka">
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
          <Field label="Rabat % sprzęt / materiały">
            <NumericInput
              value={discounts.materialsPercentDiscount}
              onChange={(value) =>
                onChange({
                  ...discounts,
                  materialsPercentDiscount: Math.min(100, value),
                })
              }
            />
          </Field>
        </>
      ) : null}
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
      <Field label={isFixedPrice ? "Domyślna stawka VAT oferty" : "Stawka VAT"}>
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
