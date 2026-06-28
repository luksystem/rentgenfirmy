import type { InternalAcceptancePriority } from "@/lib/internal-acceptance/types";
import { INTERNAL_ACCEPTANCE_RULE_LIBRARY } from "@/lib/internal-acceptance/rule-library";
import { EMPTY_RULE_PACK_CUSTOMIZATION } from "@/lib/internal-acceptance/rule-pack-resolver";

export type InternalAcceptanceTemplateConfigSources = {
  /** Punkty odbioru zdefiniowane przy pozycji katalogu specyfikacji (gdy projekt ma np. Oświetlenie). */
  specificationCatalogItems: boolean;
  /** Każda pozycja specyfikacji projektu → jeden ogólny punkt kontroli (legacy). */
  specificationItems: boolean;
  /** Pakiety reguł dopasowywane do pozycji specyfikacji po słowach kluczowych (legacy). */
  specificationRulePacks: boolean;
  /** Pakiety reguł dopasowywane do ustaleń z klientem. */
  agreementRulePacks: boolean;
};

export type InternalAcceptanceTemplateStaticItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: InternalAcceptancePriority;
  mandatory: boolean;
  position: number;
};

export type InternalAcceptanceRulePackItemOverride = {
  name?: string;
  description?: string;
  category?: string;
  priority?: InternalAcceptancePriority;
  mandatory?: boolean;
};

export type InternalAcceptanceRulePackCustomization = {
  /** Wyłączone punkty z biblioteki w tym pakiecie. */
  disabledItemIds: string[];
  /** Nadpisania pól punktów biblioteki (klucz = id reguły). */
  itemOverrides: Record<string, InternalAcceptanceRulePackItemOverride>;
  /** Dodatkowe punkty w pakiecie. */
  extraItems: InternalAcceptanceTemplateStaticItem[];
  /** Kolejność punktów: id biblioteki lub extra-{uuid}. */
  itemOrder: string[];
};

export type InternalAcceptanceTemplateConfig = {
  sources: InternalAcceptanceTemplateConfigSources;
  /** Kolejność i włączenie pakietów reguł z biblioteki. */
  enabledRulePackIds: string[];
  /** Ręcznie zdefiniowane punkty kontroli (zawsze w checklistie). */
  staticItems: InternalAcceptanceTemplateStaticItem[];
  /** Personalizacja pakietów reguł per szablon. */
  rulePackCustomizations: Record<string, InternalAcceptanceRulePackCustomization>;
};

export const DEFAULT_INTERNAL_ACCEPTANCE_SOURCES: InternalAcceptanceTemplateConfigSources = {
  specificationCatalogItems: true,
  specificationItems: false,
  specificationRulePacks: false,
  agreementRulePacks: true,
};

export function createDefaultInternalAcceptanceTemplateConfig(): InternalAcceptanceTemplateConfig {
  return {
    sources: { ...DEFAULT_INTERNAL_ACCEPTANCE_SOURCES },
    enabledRulePackIds: INTERNAL_ACCEPTANCE_RULE_LIBRARY.map((entry) => entry.id),
    staticItems: [],
    rulePackCustomizations: {},
  };
}

function normalizeStaticItems(value: unknown): InternalAcceptanceTemplateStaticItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is InternalAcceptanceTemplateStaticItem => {
      return (
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as InternalAcceptanceTemplateStaticItem).id === "string" &&
        typeof (entry as InternalAcceptanceTemplateStaticItem).name === "string"
      );
    })
    .map((entry, index) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description ?? "",
      category: entry.category ?? "Inne",
      priority: entry.priority ?? "normal",
      mandatory: entry.mandatory !== false,
      position: typeof entry.position === "number" ? entry.position : index,
    }))
    .sort((a, b) => a.position - b.position);
}

function normalizeRulePackCustomization(value: unknown): InternalAcceptanceRulePackCustomization {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_RULE_PACK_CUSTOMIZATION };
  }

  const raw = value as Partial<InternalAcceptanceRulePackCustomization>;
  const itemOverrides: Record<string, InternalAcceptanceRulePackItemOverride> = {};

  if (raw.itemOverrides && typeof raw.itemOverrides === "object") {
    for (const [key, override] of Object.entries(raw.itemOverrides)) {
      if (!override || typeof override !== "object") {
        continue;
      }
      itemOverrides[key] = {
        name: typeof override.name === "string" ? override.name : undefined,
        description: typeof override.description === "string" ? override.description : undefined,
        category: typeof override.category === "string" ? override.category : undefined,
        priority:
          override.priority === "critical" ||
          override.priority === "normal" ||
          override.priority === "optional"
            ? override.priority
            : undefined,
        mandatory: typeof override.mandatory === "boolean" ? override.mandatory : undefined,
      };
    }
  }

  return {
    disabledItemIds: Array.isArray(raw.disabledItemIds)
      ? raw.disabledItemIds.filter((entry): entry is string => typeof entry === "string")
      : [],
    itemOverrides,
    extraItems: normalizeStaticItems(raw.extraItems),
    itemOrder: Array.isArray(raw.itemOrder)
      ? raw.itemOrder.filter((entry): entry is string => typeof entry === "string")
      : [],
  };
}

export function normalizeInternalAcceptanceTemplateConfig(
  value: unknown,
): InternalAcceptanceTemplateConfig {
  const defaults = createDefaultInternalAcceptanceTemplateConfig();
  if (!value || typeof value !== "object") {
    return defaults;
  }

  const raw = value as Partial<InternalAcceptanceTemplateConfig>;
  const sources = (raw.sources ?? {}) as Partial<InternalAcceptanceTemplateConfigSources>;

  const rulePackCustomizations: Record<string, InternalAcceptanceRulePackCustomization> = {};
  if (raw.rulePackCustomizations && typeof raw.rulePackCustomizations === "object") {
    for (const [packId, customization] of Object.entries(raw.rulePackCustomizations)) {
      rulePackCustomizations[packId] = normalizeRulePackCustomization(customization);
    }
  }

  return {
    sources: {
      specificationCatalogItems:
        sources.specificationCatalogItems !== undefined
          ? Boolean(sources.specificationCatalogItems)
          : defaults.sources.specificationCatalogItems,
      specificationItems: Boolean(sources.specificationItems),
      specificationRulePacks:
        sources.specificationRulePacks !== undefined
          ? Boolean(sources.specificationRulePacks)
          : defaults.sources.specificationRulePacks,
      agreementRulePacks:
        sources.agreementRulePacks !== undefined
          ? Boolean(sources.agreementRulePacks)
          : defaults.sources.agreementRulePacks,
    },
    enabledRulePackIds: Array.isArray(raw.enabledRulePackIds)
      ? raw.enabledRulePackIds.filter((entry): entry is string => typeof entry === "string")
      : defaults.enabledRulePackIds,
    staticItems: normalizeStaticItems(raw.staticItems),
    rulePackCustomizations,
  };
}

export function withStaticItemPositions(
  items: InternalAcceptanceTemplateStaticItem[],
): InternalAcceptanceTemplateStaticItem[] {
  return items.map((item, index) => ({ ...item, position: index }));
}

export function ensureRulePackCustomization(
  config: InternalAcceptanceTemplateConfig,
  packId: string,
): InternalAcceptanceTemplateConfig {
  if (config.rulePackCustomizations[packId]) {
    return config;
  }
  return {
    ...config,
    rulePackCustomizations: {
      ...config.rulePackCustomizations,
      [packId]: { ...EMPTY_RULE_PACK_CUSTOMIZATION },
    },
  };
}

export function getRulePackCustomization(
  config: InternalAcceptanceTemplateConfig,
  packId: string,
): InternalAcceptanceRulePackCustomization {
  return config.rulePackCustomizations[packId] ?? { ...EMPTY_RULE_PACK_CUSTOMIZATION };
}
