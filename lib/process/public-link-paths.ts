import type { ProcessItemKind } from "@/lib/process/types";

export type ProcessPublicLinkEntry = {
  path: string;
  kind: ProcessItemKind;
  isInternalAcceptance?: boolean;
};

/** templateItemId → public path */
export type ProcessPublicLinkMap = Record<string, ProcessPublicLinkEntry>;

export function getProcessPublicPath(
  kind: ProcessItemKind,
  token: string,
  options?: { isInternalAcceptance?: boolean },
): string {
  if (options?.isInternalAcceptance) {
    return `/odbior/${token}`;
  }
  if (kind === "kanban") {
    return `/kanban/${token}`;
  }
  return `/element/${token}`;
}

export function getProcessPublicUrl(
  kind: ProcessItemKind,
  token: string,
  options?: { isInternalAcceptance?: boolean },
) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${getProcessPublicPath(kind, token, options)}`;
  }
  return getProcessPublicPath(kind, token, options);
}
