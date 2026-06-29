import { PROJECT_AGREEMENT_CATEGORIES } from "@/lib/dashboard/agreement-types";
import { computeInternalAcceptanceSummary } from "@/lib/internal-acceptance/quality-gate";
import { INTERNAL_ACCEPTANCE_STATUS_STYLES } from "@/lib/internal-acceptance/status-styles";
import {
  INTERNAL_ACCEPTANCE_AGREEMENTS_BOARD_CATEGORY,
  type InternalAcceptanceItemState,
  type InternalAcceptanceState,
  type InternalAcceptanceStatus,
} from "@/lib/internal-acceptance/types";

const AGREEMENT_CATEGORY_CODES = new Set<string>(PROJECT_AGREEMENT_CATEGORIES);

const VALID_STATUSES = new Set<InternalAcceptanceStatus>(
  Object.keys(INTERNAL_ACCEPTANCE_STATUS_STYLES) as InternalAcceptanceStatus[],
);

function normalizeItemStatus(status: unknown): InternalAcceptanceStatus {
  return typeof status === "string" && VALID_STATUSES.has(status as InternalAcceptanceStatus)
    ? (status as InternalAcceptanceStatus)
    : "NOT_STARTED";
}

function normalizeBoardCategory(item: InternalAcceptanceItemState): string {
  if (
    item.source?.type === "agreement" ||
    AGREEMENT_CATEGORY_CODES.has(item.category) ||
    item.category === "Ustalenia"
  ) {
    return INTERNAL_ACCEPTANCE_AGREEMENTS_BOARD_CATEGORY;
  }
  return item.category;
}

function normalizeItem(item: InternalAcceptanceItemState): InternalAcceptanceItemState {
  return {
    ...item,
    category: normalizeBoardCategory(item),
    status: normalizeItemStatus(item.status),
    history: Array.isArray(item.history) ? item.history : [],
    source: item.source ?? { type: "company_standard", refLabel: "Punkt kontroli" },
  };
}

function isCompleteSummary(
  summary: InternalAcceptanceState["summary"] | undefined,
): summary is InternalAcceptanceState["summary"] {
  if (!summary) {
    return false;
  }
  return (
    typeof summary.mandatoryPassed === "number" &&
    typeof summary.mandatoryTotal === "number" &&
    typeof summary.percentComplete === "number" &&
    typeof summary.readyForClientHandover === "boolean" &&
    Array.isArray(summary.blockers)
  );
}

export function normalizeInternalAcceptanceState(
  value: InternalAcceptanceState | null | undefined,
): InternalAcceptanceState | null {
  if (!value || !Array.isArray(value.items)) {
    return null;
  }

  const items = value.items.map((item) => normalizeItem(item));
  const summary = isCompleteSummary(value.summary)
    ? value.summary
    : computeInternalAcceptanceSummary(items);

  return {
    generatedAt: value.generatedAt ?? new Date().toISOString(),
    items,
    summary,
  };
}

export function getInternalAcceptanceStatusStyles(status: unknown) {
  const normalized = normalizeItemStatus(status);
  return INTERNAL_ACCEPTANCE_STATUS_STYLES[normalized];
}
