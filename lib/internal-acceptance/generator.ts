import type {
  InternalAcceptanceGeneratedItem,
  InternalAcceptanceGenerationInput,
  InternalAcceptanceItemState,
  InternalAcceptanceSourceRuleSet,
  InternalAcceptanceState,
} from "@/lib/internal-acceptance/types";
import { INTERNAL_ACCEPTANCE_RULE_LIBRARY } from "@/lib/internal-acceptance/rule-library";
import { resolveRulePackItems } from "@/lib/internal-acceptance/rule-pack-resolver";
import { computeInternalAcceptanceSummary } from "@/lib/internal-acceptance/quality-gate";
import type { InternalAcceptanceTemplateConfig } from "@/lib/internal-acceptance/template-config";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesRuleSet(
  ruleSet: InternalAcceptanceSourceRuleSet,
  title: string,
  category: string,
): boolean {
  const normalizedTitle = normalize(title);
  const normalizedCategory = normalize(category);

  if (ruleSet.matchCategory?.length) {
    const categoryMatch = ruleSet.matchCategory.some(
      (entry) => normalizedCategory.includes(normalize(entry)),
    );
    if (!categoryMatch && !ruleSet.matchTitleContains?.length) {
      return false;
    }
    if (categoryMatch) {
      return true;
    }
  }

  if (ruleSet.matchTitleContains?.length) {
    return ruleSet.matchTitleContains.some((fragment) =>
      normalizedTitle.includes(normalize(fragment)),
    );
  }

  return ruleSet.sourceType === "company_standard";
}

function buildItemKey(prefix: string, id: string, sourceRef?: string) {
  return [prefix, id, sourceRef ?? "global"].join("::");
}

function appendUnique(
  items: InternalAcceptanceGeneratedItem[],
  seenKeys: Set<string>,
  candidate: InternalAcceptanceGeneratedItem,
  sortOrder: number,
) {
  if (seenKeys.has(candidate.itemKey)) {
    return;
  }
  seenKeys.add(candidate.itemKey);
  items.push({ ...candidate, sortOrder });
}

function generateFromRuleLibrary(
  input: InternalAcceptanceGenerationInput,
  ruleSets: InternalAcceptanceSourceRuleSet[],
  startSortOrder: number,
  templateConfig?: InternalAcceptanceTemplateConfig | null,
): InternalAcceptanceGeneratedItem[] {
  const items: InternalAcceptanceGeneratedItem[] = [];
  const seenKeys = new Set<string>();
  let sortOrder = startSortOrder;

  for (const ruleSet of ruleSets) {
    const packItems = resolveRulePackItems(
      ruleSet.id,
      templateConfig?.rulePackCustomizations?.[ruleSet.id],
    );

    if (ruleSet.sourceType === "company_standard") {
      for (const template of packItems) {
        appendUnique(
          items,
          seenKeys,
          {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            priority: template.priority,
            mandatory: template.mandatory,
            itemKey: buildItemKey(ruleSet.id, template.resolvedId),
            source: { type: "company_standard", refLabel: "Standardy firmy" },
          },
          sortOrder,
        );
        sortOrder += 1;
      }
      continue;
    }

    if (ruleSet.sourceType === "specification") {
      for (const spec of input.specificationItems) {
        if (!matchesRuleSet(ruleSet, spec.title, spec.category)) continue;
        for (const template of packItems) {
          appendUnique(
            items,
            seenKeys,
            {
              id: template.id,
              name: template.name,
              description: template.description,
              category: template.category,
              priority: template.priority,
              mandatory: template.mandatory,
              itemKey: buildItemKey(ruleSet.id, template.resolvedId, spec.id),
              source: {
                type: "specification",
                refId: spec.id,
                refLabel: `Specyfikacja: ${spec.title}`,
              },
            },
            sortOrder,
          );
          sortOrder += 1;
        }
      }
      continue;
    }

    if (ruleSet.sourceType === "agreement") {
      for (const agreement of input.agreements) {
        const haystack = `${agreement.title} ${agreement.body ?? ""}`;
        if (!matchesRuleSet(ruleSet, haystack, agreement.category)) continue;
        for (const template of packItems) {
          appendUnique(
            items,
            seenKeys,
            {
              id: template.id,
              name: template.name,
              description: template.description,
              category: template.category,
              priority: template.priority,
              mandatory: template.mandatory,
              itemKey: buildItemKey(ruleSet.id, template.resolvedId, agreement.id),
              source: {
                type: "agreement",
                refId: agreement.id,
                refLabel: `Ustalenie: ${agreement.title}`,
              },
            },
            sortOrder,
          );
          sortOrder += 1;
        }
      }
    }
  }

  return items;
}

function generateFromTemplateConfig(
  input: InternalAcceptanceGenerationInput,
  config: InternalAcceptanceTemplateConfig,
): InternalAcceptanceGeneratedItem[] {
  const items: InternalAcceptanceGeneratedItem[] = [];
  const seenKeys = new Set<string>();
  let sortOrder = 0;

  for (const staticItem of [...config.staticItems].sort((a, b) => a.position - b.position)) {
    appendUnique(
      items,
      seenKeys,
      {
        id: staticItem.id,
        name: staticItem.name,
        description: staticItem.description,
        category: staticItem.category,
        priority: staticItem.priority,
        mandatory: staticItem.mandatory,
        itemKey: buildItemKey("static", staticItem.id),
        source: { type: "company_standard", refLabel: "Punkt szablonu" },
      },
      sortOrder,
    );
    sortOrder += 1;
  }

  if (config.sources.specificationCatalogItems) {
    input.specificationItems.forEach((spec, specIndex) => {
      if (!spec.catalogItemId) {
        return;
      }
      const catalogItems = input.catalogAcceptanceByCatalogId?.[spec.catalogItemId] ?? [];
      catalogItems.forEach((catalogItem, itemIndex) => {
        appendUnique(
          items,
          seenKeys,
          {
            id: catalogItem.id,
            name: catalogItem.name,
            description: catalogItem.description,
            category: catalogItem.category,
            priority: catalogItem.priority,
            mandatory: catalogItem.mandatory,
            itemKey: buildItemKey("catalog", spec.id, catalogItem.id),
            source: {
              type: "specification",
              refId: spec.id,
              refLabel: `Specyfikacja: ${spec.title}`,
            },
          },
          1500 + specIndex * 100 + itemIndex,
        );
      });
    });
  }

  if (config.sources.agreementRulePacks) {
    input.agreements.forEach((agreement, index) => {
      appendUnique(
        items,
        seenKeys,
        {
          id: `agreement-item-${agreement.id}`,
          name: agreement.title,
          description:
            agreement.body?.trim() || `Weryfikacja ustalenia: ${agreement.title}`,
          category: agreement.category?.trim() || "Ustalenia",
          priority: "normal",
          mandatory: true,
          itemKey: buildItemKey("agreement-item", agreement.id),
          source: {
            type: "agreement",
            refId: agreement.id,
            refLabel: `Ustalenie: ${agreement.title}`,
          },
        },
        1700 + index,
      );
    });
  }

  if (config.sources.specificationItems) {
    input.specificationItems.forEach((spec, index) => {
      appendUnique(
        items,
        seenKeys,
        {
          id: `spec-item-${spec.id}`,
          name: spec.title,
          description:
            spec.description?.trim() ||
            `Weryfikacja pozycji specyfikacji: ${spec.title}`,
          category: spec.category?.trim() || "Specyfikacja",
          priority: "normal",
          mandatory: true,
          itemKey: buildItemKey("spec-item", spec.id),
          source: {
            type: "specification",
            refId: spec.id,
            refLabel: `Specyfikacja: ${spec.title}`,
          },
        },
        1000 + index,
      );
    });
  }

  const enabledRuleSets = config.enabledRulePackIds
    .map((id) => INTERNAL_ACCEPTANCE_RULE_LIBRARY.find((entry) => entry.id === id))
    .filter((entry): entry is InternalAcceptanceSourceRuleSet => Boolean(entry))
    .filter((entry) => {
      if (entry.sourceType === "specification" && !config.sources.specificationRulePacks) {
        return false;
      }
      if (entry.sourceType === "agreement" && !config.sources.agreementRulePacks) {
        return false;
      }
      return true;
    });

  const ruleItems = generateFromRuleLibrary(input, enabledRuleSets, 2000, config);
  for (const item of ruleItems) {
    appendUnique(items, seenKeys, item, item.sortOrder ?? 9999);
  }

  return items.sort((a, b) => {
    const orderCompare = (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
    if (orderCompare !== 0) return orderCompare;
    const categoryCompare = a.category.localeCompare(b.category, "pl");
    if (categoryCompare !== 0) return categoryCompare;
    return a.name.localeCompare(b.name, "pl");
  });
}

export function generateInternalAcceptanceItems(
  input: InternalAcceptanceGenerationInput,
): InternalAcceptanceGeneratedItem[] {
  if (input.templateConfig) {
    return generateFromTemplateConfig(input, input.templateConfig);
  }

  return generateFromRuleLibrary(input, INTERNAL_ACCEPTANCE_RULE_LIBRARY, 0).sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category, "pl");
    if (categoryCompare !== 0) return categoryCompare;
    return a.name.localeCompare(b.name, "pl");
  });
}

export function mergeInternalAcceptanceState(
  generated: InternalAcceptanceGeneratedItem[],
  previous?: InternalAcceptanceState | null,
): InternalAcceptanceState {
  const previousByKey = new Map(
    (previous?.items ?? []).map((item) => [item.itemKey, item]),
  );

  const items: InternalAcceptanceItemState[] = generated.map((item) => {
    const saved = previousByKey.get(item.itemKey);
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      priority: item.priority,
      mandatory: item.mandatory,
      itemKey: item.itemKey,
      source: item.source,
      status: saved?.status ?? "NOT_STARTED",
      notes: saved?.notes,
      photoUrls: saved?.photoUrls,
      assigneeName: saved?.assigneeName,
      assigneeId: saved?.assigneeId,
      completedAt: saved?.completedAt,
      failureReason: saved?.failureReason,
      fixDeadline: saved?.fixDeadline,
      fixAssignee: saved?.fixAssignee,
      fixAssigneeId: saved?.fixAssigneeId,
      lastUpdatedAt: saved?.lastUpdatedAt,
      lastUpdatedById: saved?.lastUpdatedById,
      lastUpdatedByName: saved?.lastUpdatedByName,
      history: saved?.history ?? [],
    };
  });

  const generatedAt = previous?.generatedAt ?? new Date().toISOString();
  const summary = computeInternalAcceptanceSummary(items);

  return { generatedAt, items, summary };
}

export function buildInternalAcceptanceState(
  input: InternalAcceptanceGenerationInput,
  previous?: InternalAcceptanceState | null,
): InternalAcceptanceState {
  const generated = generateInternalAcceptanceItems(input);
  return mergeInternalAcceptanceState(generated, previous);
}
