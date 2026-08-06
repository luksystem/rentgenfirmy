export type ContractModuleSettings = {
  /** Rabat % za wybór kategorii "Instalacja (kompleksowa)". */
  instalacjaDiscountPercent: number;
  /** Rabat % za wybór kategorii "Instalacje dodatkowe". */
  instalacjeDodatkoweDiscountPercent: number;
  /** Rabat % za wybór kategorii "Dodatki" (domyślnie 0 — dodatki zwykle bez progu rabatowego). */
  dodatkiDiscountPercent: number;
  /** Rabat % od kwoty rozliczanej jako "inne" (gotówka, 0% VAT). */
  inneDiscountPercent: number;
};

export const DEFAULT_CONTRACT_MODULE_SETTINGS: ContractModuleSettings = {
  instalacjaDiscountPercent: 10,
  instalacjeDodatkoweDiscountPercent: 15,
  dodatkiDiscountPercent: 0,
  inneDiscountPercent: 5,
};

export const CONTRACT_MODULE_SETTINGS_ID = "contract_module_settings";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : fallback;
}

export function normalizeContractModuleSettings(value: unknown): ContractModuleSettings {
  const data = asObject(value);
  return {
    instalacjaDiscountPercent: asNumber(
      data.instalacjaDiscountPercent,
      DEFAULT_CONTRACT_MODULE_SETTINGS.instalacjaDiscountPercent,
    ),
    instalacjeDodatkoweDiscountPercent: asNumber(
      data.instalacjeDodatkoweDiscountPercent,
      DEFAULT_CONTRACT_MODULE_SETTINGS.instalacjeDodatkoweDiscountPercent,
    ),
    dodatkiDiscountPercent: asNumber(
      data.dodatkiDiscountPercent,
      DEFAULT_CONTRACT_MODULE_SETTINGS.dodatkiDiscountPercent,
    ),
    inneDiscountPercent: asNumber(data.inneDiscountPercent, DEFAULT_CONTRACT_MODULE_SETTINGS.inneDiscountPercent),
  };
}

export function discountPercentForCategory(
  settings: ContractModuleSettings,
  category: "instalacja" | "instalacje_dodatkowe" | "dodatki",
) {
  if (category === "instalacja") {
    return settings.instalacjaDiscountPercent;
  }
  if (category === "instalacje_dodatkowe") {
    return settings.instalacjeDodatkoweDiscountPercent;
  }
  return settings.dodatkiDiscountPercent;
}
