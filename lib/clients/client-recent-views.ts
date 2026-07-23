import type { ClientRecentView } from "@/lib/supabase/client-recent-views-repository";

export const RECENT_CLIENTS_LIMIT = 10;
export const AUTO_FAVORITE_LIMIT = 5;
const AUTO_FAVORITE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function parseTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getRecentlyOpenedClientIds(
  views: ClientRecentView[],
  limit = RECENT_CLIENTS_LIMIT,
): string[] {
  return [...views]
    .filter((view) => view.lastViewedAt)
    .sort((a, b) => parseTimestamp(b.lastViewedAt) - parseTimestamp(a.lastViewedAt))
    .slice(0, limit)
    .map((view) => view.clientId);
}

export function getAutoFavoriteClientIds(
  views: ClientRecentView[],
  limit = AUTO_FAVORITE_LIMIT,
): string[] {
  const cutoff = Date.now() - AUTO_FAVORITE_WINDOW_MS;
  return [...views]
    .filter((view) => view.viewCount > 0 && parseTimestamp(view.lastViewedAt) >= cutoff)
    .sort(
      (a, b) =>
        b.viewCount - a.viewCount || parseTimestamp(b.lastViewedAt) - parseTimestamp(a.lastViewedAt),
    )
    .slice(0, limit)
    .map((view) => view.clientId);
}

export function getFavoriteClientIdSet(views: ClientRecentView[]): Set<string> {
  const pinned = views.filter((view) => view.pinnedAt).map((view) => view.clientId);
  return new Set([...pinned, ...getAutoFavoriteClientIds(views)]);
}

export function getClientLastViewedAt(views: ClientRecentView[], clientId: string): number {
  return parseTimestamp(views.find((view) => view.clientId === clientId)?.lastViewedAt ?? null);
}
