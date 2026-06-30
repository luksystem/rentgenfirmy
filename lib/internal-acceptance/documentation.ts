import type {
  InternalAcceptanceItemState,
  InternalAcceptanceState,
  InternalAcceptanceStatus,
} from "@/lib/internal-acceptance/types";

export function getInternalAcceptanceDocumentationBlockReason(
  item: InternalAcceptanceItemState,
  nextStatus?: InternalAcceptanceStatus,
): string | null {
  const status = nextStatus ?? item.status;
  if (!item.requireDocumentation || status !== "PASSED") {
    return null;
  }
  if (item.attachments?.length) {
    return null;
  }
  if (item.documentationHint?.trim()) {
    return `Dodaj dokumentację: ${item.documentationHint.trim()}`;
  }
  return "Ten punkt wymaga dokumentacji (zdjęcie lub plik) przed oznaczeniem jako Spełnia.";
}

export function validateInternalAcceptanceDocumentation(state: InternalAcceptanceState): string | null {
  for (const item of state.items) {
    const reason = getInternalAcceptanceDocumentationBlockReason(item);
    if (reason) {
      return `${item.name}: ${reason}`;
    }
  }
  return null;
}
