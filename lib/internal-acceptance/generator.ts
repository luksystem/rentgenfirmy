import type {
  InternalAcceptanceGenerationInput,
  InternalAcceptanceGeneratedItem,
  InternalAcceptanceItemState,
  InternalAcceptanceSourceRuleSet,
  InternalAcceptanceState,
} from "@/lib/internal-acceptance/types";
import { INTERNAL_ACCEPTANCE_RULE_LIBRARY } from "@/lib/internal-acceptance/rule-library";
import { computeInternalAcceptanceSummary } from "@/lib/internal-acceptance/quality-gate";

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

function buildItemKey(ruleSetId: string, ruleId: string, sourceRef?: string) {
  return [ruleSetId, ruleId, sourceRef ?? "global"].join("::");
}

export function generateInternalAcceptanceItems(
  input: InternalAcceptanceGenerationInput,
): InternalAcceptanceGeneratedItem[] {
  const items: InternalAcceptanceGeneratedItem[] = [];
  const seenKeys = new Set<string>();

  for (const ruleSet of INTERNAL_ACCEPTANCE_RULE_LIBRARY) {
    if (ruleSet.sourceType === "company_standard") {
      for (const template of ruleSet.items) {
        const itemKey = buildItemKey(ruleSet.id, template.id);
        if (seenKeys.has(itemKey)) continue;
        seenKeys.add(itemKey);
        items.push({
          ...template,
          itemKey,
          source: { type: "company_standard", refLabel: "Standardy firmy" },
        });
      }
      continue;
    }

    if (ruleSet.sourceType === "specification") {
      for (const spec of input.specificationItems) {
        if (!matchesRuleSet(ruleSet, spec.title, spec.category)) continue;
        for (const template of ruleSet.items) {
          const itemKey = buildItemKey(ruleSet.id, template.id, spec.id);
          if (seenKeys.has(itemKey)) continue;
          seenKeys.add(itemKey);
          items.push({
            ...template,
            itemKey,
            source: {
              type: "specification",
              refId: spec.id,
              refLabel: `Specyfikacja: ${spec.title}`,
            },
          });
        }
      }
      continue;
    }

    if (ruleSet.sourceType === "agreement") {
      for (const agreement of input.agreements) {
        const haystack = `${agreement.title} ${agreement.body ?? ""}`;
        if (!matchesRuleSet(ruleSet, haystack, agreement.category)) continue;
        for (const template of ruleSet.items) {
          const itemKey = buildItemKey(ruleSet.id, template.id, agreement.id);
          if (seenKeys.has(itemKey)) continue;
          seenKeys.add(itemKey);
          items.push({
            ...template,
            itemKey,
            source: {
              type: "agreement",
              refId: agreement.id,
              refLabel: `Ustalenie: ${agreement.title}`,
            },
          });
        }
      }
    }
  }

  return items.sort((a, b) => {
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
      ...item,
      status: saved?.status ?? "NOT_STARTED",
      notes: saved?.notes,
      photoUrls: saved?.photoUrls,
      assigneeName: saved?.assigneeName,
      completedAt: saved?.completedAt,
      failureReason: saved?.failureReason,
      fixDeadline: saved?.fixDeadline,
      fixAssignee: saved?.fixAssignee,
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
