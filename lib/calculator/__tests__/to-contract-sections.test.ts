import { describe, expect, it } from "vitest";
import { buildContractSectionsFromCalculatorOffer } from "@/lib/calculator/to-contract-sections";
import { createEmptyCalculatorOffer } from "@/lib/calculator/factory";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { calculateTableNetTotal, contractRowSelectionKey } from "@/lib/contracts/totals";
import { isContractTableSection } from "@/lib/contracts/types";

describe("buildContractSectionsFromCalculatorOffer", () => {
  it("mapuje bazę systemu na tabelę główną, elektrykę na kategorię instalacja, dodatki per pozycja", () => {
    const offer = createEmptyCalculatorOffer();
    offer.answers.powierzchniaM2 = 120;
    offer.answers.strefaPrywatna = true;
    offer.answers.kompleksowaInstalacja = true;
    offer.answers.addons.stacjaPogodowa = true;
    offer.answers.otherSystems.sieciLan = true;

    const sections = buildContractSectionsFromCalculatorOffer(offer, DEFAULT_CALCULATOR_SETTINGS);
    const tableSections = sections.filter(isContractTableSection);

    const main = tableSections.find((s) => s.group === "main");
    expect(main).toBeDefined();
    expect(calculateTableNetTotal(main!)).toBeGreaterThan(0);

    const electrical = tableSections.find((s) => s.category === "instalacja");
    expect(electrical).toBeDefined();
    expect(electrical!.selected).toBe(true); // kompleksowa instalacja -> od razu zaznaczona
    expect(electrical!.rows.length).toBeGreaterThan(1); // gniazda wg strefaPrywatna + obsadzenie RG

    const otherSystems = tableSections.find((s) => s.category === "instalacje_dodatkowe");
    expect(otherSystems).toBeDefined();
    expect(otherSystems!.rows).toHaveLength(1); // tylko sieciLan zaznaczone

    const addons = tableSections.find((s) => s.category === "dodatki");
    expect(addons).toBeDefined();
    expect(addons!.rows.length).toBeGreaterThan(1); // wszystkie dodatki jako wiersze, do dalszego zaznaczania
    const stacjaRow = addons!.rows.find((r) => r.name === "Stacja pogodowa");
    expect(stacjaRow).toBeDefined();
    expect(addons!.selectedRowIds).toContain(stacjaRow!.id);
    expect(addons!.selectedRowIds).toContainEqual(expect.any(String));
    expect(contractRowSelectionKey(addons!.id, stacjaRow!.id)).toBe(`${addons!.id}:${stacjaRow!.id}`);
  });

  it("bez inne systemy zaznaczonych — sekcja instalacje_dodatkowe w ogóle nie powstaje", () => {
    const offer = createEmptyCalculatorOffer();
    const sections = buildContractSectionsFromCalculatorOffer(offer, DEFAULT_CALCULATOR_SETTINGS);
    const tableSections = sections.filter(isContractTableSection);
    expect(tableSections.find((s) => s.category === "instalacje_dodatkowe")).toBeUndefined();
  });
});
