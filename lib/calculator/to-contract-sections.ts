import { createFixedPriceRow } from "@/lib/service/fixed-price";
import type { ServiceFixedPriceRow } from "@/lib/service/types";
import { createContractTableSection } from "@/lib/contracts/factory";
import type { ContractSection } from "@/lib/contracts/types";
import {
  CALCULATOR_ADDON_LABELS,
  CALCULATOR_FUNCTIONAL_CATEGORY_LABELS,
  CALCULATOR_FUNCTIONAL_LEVEL_LABELS,
  CALCULATOR_OTHER_SYSTEM_LABELS,
  type CalculatorOffer,
} from "@/lib/calculator/types";
import {
  calculateAddons,
  calculateBaseSystem,
  calculateElectricalInstallation,
  calculateFunctionalBudgets,
  calculateOtherSystems,
} from "@/lib/calculator/engine";
import type { CalculatorSettings } from "@/lib/calculator/settings";

/**
 * Mapuje wynik silnika kalkulatora na sekcje tabel Umowy — dokładnie ten sam kształt, jaki
 * `ContractSectionsEditor`/`ContractDocumentView` już rozumieją (żadnych nowych pojęć po stronie
 * Umów). Kategorie: baza systemu -> tabela główna; instalacja elektryczna -> opcja "instalacja";
 * inne systemy -> opcja "instalacje_dodatkowe" (rabat proporcjonalny już wyliczony w silniku);
 * dodatki -> opcja "dodatki" (checkbox per pozycja).
 */

function row(overrides: Partial<ServiceFixedPriceRow>): ServiceFixedPriceRow {
  return { ...createFixedPriceRow(), unit: "kpl.", ...overrides };
}

export function buildContractSectionsFromCalculatorOffer(
  offer: CalculatorOffer,
  settings: CalculatorSettings,
): ContractSection[] {
  const { answers } = offer;
  const electrical = calculateElectricalInstallation(answers, settings);
  const baseSystem = calculateBaseSystem(answers, settings, electrical.points);
  const functional = calculateFunctionalBudgets(answers, settings);
  const addons = calculateAddons(answers, settings);
  const otherSystems = calculateOtherSystems(answers, settings);

  const sections: ContractSection[] = [];

  const mainSection = createContractTableSection("main");
  mainSection.title = "Baza systemu Inteligentnego Domu (pakiet OPTIMUM)";
  mainSection.description = "Wyliczone z kalkulatora ofert na podstawie ankiety parametrów domu.";
  mainSection.rows = [
    row({ name: "Rozdzielnica — sprzęt", netUnitPrice: baseSystem.rozdzielnicaSprzetNet }),
    row({ name: "Automatyka — baza i zasilanie", netUnitPrice: baseSystem.automatykaBazaNet }),
    row({
      name: "Projekt Inteligentnego Domu",
      netUnitPrice: baseSystem.projektNet + baseSystem.projektDiscountNet,
      percentDiscount:
        baseSystem.projektDiscountNet > 0
          ? Math.round((baseSystem.projektDiscountNet / (baseSystem.projektNet + baseSystem.projektDiscountNet)) * 100)
          : 0,
      description: answers.kompleksowaInstalacja ? "Rabat za kompleksową realizację" : "",
      showDescription: answers.kompleksowaInstalacja,
    }),
    row({ name: "Wykonanie i podłączenie rozdzielni", netUnitPrice: baseSystem.wykonanieRozdzielniNet }),
    row({ name: "Wstępna konfiguracja", netUnitPrice: baseSystem.konfiguracjaNet }),
    ...functional.map((item) =>
      row({
        name: `${CALCULATOR_FUNCTIONAL_CATEGORY_LABELS[item.category]} — poziom ${CALCULATOR_FUNCTIONAL_LEVEL_LABELS[item.level]}`,
        netUnitPrice: item.net,
      }),
    ),
  ];
  sections.push(mainSection);

  const electricalSection = createContractTableSection("option", {
    category: "instalacja",
    categoryDiscountPercent: settings.discounts.instalacjaKompleksowaPercent,
  });
  electricalSection.title = "Instalacja elektryczna";
  electricalSection.description = "Wyliczona zryczałtowanym modelem punktowym — do weryfikacji z elektrykiem.";
  electricalSection.selected = answers.kompleksowaInstalacja;
  electricalSection.rows = [
    row({
      name: "Instalacja elektryczna — punkty",
      quantity: electrical.points,
      unit: "pkt",
      netUnitPrice: settings.electrical.cenaZaPunkt,
    }),
  ];
  sections.push(electricalSection);

  const selectedOtherSystems = otherSystems.items.filter((item) => item.selected);
  if (selectedOtherSystems.length > 0) {
    const otherSystemsSection = createContractTableSection("option", {
      category: "instalacje_dodatkowe",
      categoryDiscountPercent: otherSystems.discountPercent,
    });
    otherSystemsSection.title = "Inne systemy";
    otherSystemsSection.description = "LAN/TV/wideodomofon/monitoring/nagłośnienie/multiroom/sauna/alarm tymczasowy.";
    otherSystemsSection.selected = true;
    otherSystemsSection.rows = selectedOtherSystems.map((item) =>
      row({ name: CALCULATOR_OTHER_SYSTEM_LABELS[item.key], netUnitPrice: item.net }),
    );
    sections.push(otherSystemsSection);
  }

  const addonsSection = createContractTableSection("option", { category: "dodatki" });
  addonsSection.title = "Dodatki";
  addonsSection.rows = addons.map((item) =>
    row({
      name: CALCULATOR_ADDON_LABELS[item.key],
      quantity: item.quantity,
      netUnitPrice: settings.addons[item.key],
    }),
  );
  addonsSection.selectedRowIds = addonsSection.rows.filter((_, index) => addons[index].selected).map((r) => r.id);
  sections.push(addonsSection);

  return sections;
}
