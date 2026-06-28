import type { InternalAcceptancePriority } from "@/lib/internal-acceptance/types";
import { INTERNAL_ACCEPTANCE_RULE_LIBRARY } from "@/lib/internal-acceptance/rule-library";

export type InternalAcceptanceTemplateConfigSources = {
  /** Każda pozycja aktualnej specyfikacji projektu → osobny punkt kontroli. */
  specificationItems: boolean;
  /** Pakiety reguł dopasowywane do pozycji specyfikacji (słowa kluczowe). */
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

export type InternalAcceptanceTemplateConfig = {
  sources: InternalAcceptanceTemplateConfigSources;
  /** Kolejność i włączenie pakietów reguł z biblioteki. */
  enabledRulePackIds: string[];
  /** Ręcznie zdefiniowane punkty kontroli (zawsze w checklistie). */
  staticItems: InternalAcceptanceTemplateStaticItem[];
};

export const DEFAULT_INTERNAL_ACCEPTANCE_SOURCES: InternalAcceptanceTemplateConfigSources = {
  specificationItems: false,
  specificationRulePacks: true,
  agreementRulePacks: true,
};

export function createDefaultInternalAcceptanceTemplateConfig(): InternalAcceptanceTemplateConfig {
  return {
    sources: { ...DEFAULT_INTERNAL_ACCEPTANCE_SOURCES },
    enabledRulePackIds: INTERNAL_ACCEPTANCE_RULE_LIBRARY.map((entry) => entry.id),
    staticItems: [],
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

  return {
    sources: {
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
    staticItems: Array.isArray(raw.staticItems)
      ? raw.staticItems
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
          .sort((a, b) => a.position - b.position)
      : [],
  };
}

export function withStaticItemPositions(
  items: InternalAcceptanceTemplateStaticItem[],
): InternalAcceptanceTemplateStaticItem[] {
  return items.map((item, index) => ({ ...item, position: index }));
}
