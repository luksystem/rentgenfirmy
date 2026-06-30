import { getInternalAcceptanceRuleSetById } from "@/lib/internal-acceptance/rule-library";
import type { InternalAcceptanceRuleTemplate } from "@/lib/internal-acceptance/types";
import type {
  InternalAcceptanceRulePackCustomization,
  InternalAcceptanceRulePackItemOverride,
  InternalAcceptanceTemplateStaticItem,
} from "@/lib/internal-acceptance/template-config";

export type ResolvedRulePackItem = InternalAcceptanceRuleTemplate & {
  /** Id do kolejności: id biblioteki lub extra-{uuid} */
  resolvedId: string;
  isExtra: boolean;
};

export const EMPTY_RULE_PACK_CUSTOMIZATION: InternalAcceptanceRulePackCustomization = {
  disabledItemIds: [],
  itemOverrides: {},
  extraItems: [],
  itemOrder: [],
};

export function resolveRulePackItems(
  packId: string,
  customization?: InternalAcceptanceRulePackCustomization | null,
): ResolvedRulePackItem[] {
  const ruleSet = getInternalAcceptanceRuleSetById(packId);
  if (!ruleSet) {
    return [];
  }

  const custom = customization ?? EMPTY_RULE_PACK_CUSTOMIZATION;
  const disabled = new Set(custom.disabledItemIds);

  const libraryItems: ResolvedRulePackItem[] = ruleSet.items
    .filter((item) => !disabled.has(item.id))
    .map((item) => {
      const override = custom.itemOverrides[item.id] ?? {};
      return applyOverride(item, override, item.id, false);
    });

  const extraItems: ResolvedRulePackItem[] = custom.extraItems.map((extra) => ({
    id: `extra-${extra.id}`,
    name: extra.name,
    description: extra.description,
    category: extra.category,
    priority: extra.priority,
    mandatory: extra.mandatory,
    requireDocumentation: extra.requireDocumentation,
    documentationHint: extra.documentationHint,
    resolvedId: `extra-${extra.id}`,
    isExtra: true,
  }));

  const combined = new Map<string, ResolvedRulePackItem>();
  for (const item of libraryItems) {
    combined.set(item.resolvedId, item);
  }
  for (const item of extraItems) {
    combined.set(item.resolvedId, item);
  }

  const defaultOrder = [
    ...ruleSet.items.filter((item) => !disabled.has(item.id)).map((item) => item.id),
    ...custom.extraItems.map((item) => `extra-${item.id}`),
  ];
  const order = custom.itemOrder.length ? custom.itemOrder : defaultOrder;

  const resolved: ResolvedRulePackItem[] = [];
  const seen = new Set<string>();
  for (const entryId of order) {
    const item = combined.get(entryId);
    if (item && !seen.has(entryId)) {
      resolved.push(item);
      seen.add(entryId);
    }
  }

  for (const item of combined.values()) {
    if (!seen.has(item.resolvedId)) {
      resolved.push(item);
    }
  }

  return resolved;
}

function applyOverride(
  item: InternalAcceptanceRuleTemplate,
  override: InternalAcceptanceRulePackItemOverride,
  resolvedId: string,
  isExtra: boolean,
): ResolvedRulePackItem {
  return {
    id: item.id,
    name: override.name ?? item.name,
    description: override.description ?? item.description,
    category: override.category ?? item.category,
    priority: override.priority ?? item.priority,
    mandatory: override.mandatory ?? item.mandatory,
    requireDocumentation: override.requireDocumentation ?? item.requireDocumentation,
    documentationHint: override.documentationHint ?? item.documentationHint,
    resolvedId,
    isExtra,
  };
}

export function getEffectivePackItemOrder(
  packId: string,
  customization?: InternalAcceptanceRulePackCustomization | null,
): string[] {
  const ruleSet = getInternalAcceptanceRuleSetById(packId);
  if (!ruleSet) {
    return [];
  }

  const custom = customization ?? EMPTY_RULE_PACK_CUSTOMIZATION;
  if (custom.itemOrder.length) {
    return custom.itemOrder;
  }

  const disabled = new Set(custom.disabledItemIds);
  return [
    ...ruleSet.items.filter((item) => !disabled.has(item.id)).map((item) => item.id),
    ...custom.extraItems.map((item) => `extra-${item.id}`),
  ];
}

export function packCustomizationItemCount(
  packId: string,
  customization?: InternalAcceptanceRulePackCustomization | null,
): number {
  return resolveRulePackItems(packId, customization).length;
}

export function movePackItemOrder(
  order: string[],
  itemId: string,
  direction: "up" | "down",
): string[] {
  const index = order.indexOf(itemId);
  if (index < 0) {
    return order;
  }
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= order.length) {
    return order;
  }
  const next = [...order];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function withExtraItemPositions(
  items: InternalAcceptanceTemplateStaticItem[],
): InternalAcceptanceTemplateStaticItem[] {
  return items.map((item, index) => ({ ...item, position: index }));
}
