import type { InternalAcceptanceItemState } from "@/lib/internal-acceptance/types";

export function getInternalAcceptanceAgreementId(
  item: Pick<InternalAcceptanceItemState, "source">,
): string | null {
  if (item.source.type !== "agreement" || !item.source.refId) {
    return null;
  }
  return item.source.refId;
}
