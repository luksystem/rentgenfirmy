import { describe, expect, it } from "vitest";
import {
  computeMaterialItemNetAmount,
  createMaterialItem,
  normalizeMaterialItems,
  sumMaterialItemsCost,
} from "@/lib/service/material-items";

describe("computeMaterialItemNetAmount", () => {
  it("mnoży cenę jednostkową przez ilość", () => {
    expect(computeMaterialItemNetAmount({ netUnitPrice: 10, quantity: 3 })).toBe(30);
  });

  it("zaokrągla do 2 miejsc po przecinku", () => {
    expect(computeMaterialItemNetAmount({ netUnitPrice: 0.1, quantity: 3 })).toBe(0.3);
  });

  it("nie schodzi poniżej zera dla ujemnych wartości", () => {
    expect(computeMaterialItemNetAmount({ netUnitPrice: -5, quantity: 2 })).toBe(0);
  });
});

describe("createMaterialItem", () => {
  it("domyślnie ma ilość 1 i zerową cenę", () => {
    const item = createMaterialItem();
    expect(item.quantity).toBe(1);
    expect(item.netUnitPrice).toBe(0);
    expect(item.netAmount).toBe(0);
  });
});

describe("normalizeMaterialItems", () => {
  it("wylicza netAmount z quantity i netUnitPrice dla nowych rekordów", () => {
    const items = normalizeMaterialItems([
      { id: "a", title: "Kabel", netUnitPrice: 5, quantity: 4, vatRate: 23, billable: true },
    ]);
    expect(items[0].netAmount).toBe(20);
  });

  it("traktuje stare rekordy bez quantity/netUnitPrice jako ilość 1", () => {
    const items = normalizeMaterialItems([
      { id: "legacy", title: "Moduł", netAmount: 150, vatRate: 23, billable: true },
    ]);
    expect(items[0].quantity).toBe(1);
    expect(items[0].netUnitPrice).toBe(150);
    expect(items[0].netAmount).toBe(150);
  });
});

describe("sumMaterialItemsCost", () => {
  it("sumuje tylko pozycje billable, uwzględniając ilość", () => {
    const items = normalizeMaterialItems([
      { id: "1", title: "A", netUnitPrice: 10, quantity: 2, vatRate: 23, billable: true },
      { id: "2", title: "B", netUnitPrice: 100, quantity: 1, vatRate: 23, billable: false },
    ]);
    expect(sumMaterialItemsCost(items)).toBe(20);
  });
});
