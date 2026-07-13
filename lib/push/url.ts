const BLOCKED_URL_PATTERNS = [
  /^https?:\/\//i,
  /^\/\//,
  /^javascript:/i,
  /^data:/i,
  /^mailto:/i,
  /^tel:/i,
];

/** Zezwala wyłącznie na bezpieczne ścieżki wewnętrzne aplikacji. */
export function sanitizeInternalPushUrl(url: string | undefined, fallback = "/") {
  if (!url?.trim()) {
    return fallback;
  }

  const trimmed = url.trim();

  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error("Adres URL powiadomienia musi być wewnętrzną ścieżką aplikacji.");
    }
  }

  if (!trimmed.startsWith("/")) {
    throw new Error("Adres URL powiadomienia musi zaczynać się od /.");
  }

  if (trimmed.includes("\\") || trimmed.includes("\0")) {
    throw new Error("Nieprawidłowy adres URL powiadomienia.");
  }

  return trimmed;
}

/** Wersja dla Service Workera (bez throw — zwraca fallback). */
export function resolveSafeNotificationUrl(url: unknown, origin: string, fallback = "/") {
  if (typeof url !== "string" || !url.trim()) {
    return `${origin}${fallback}`;
  }

  try {
    const safePath = sanitizeInternalPushUrl(url, fallback);
    return `${origin}${safePath}`;
  } catch {
    return `${origin}${fallback}`;
  }
}
