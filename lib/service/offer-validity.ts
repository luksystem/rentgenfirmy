export const DEFAULT_OFFER_VALIDITY_DAYS = 14;

export function defaultClientOfferExpiry(days = DEFAULT_OFFER_VALIDITY_DAYS) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

export function offerExpiryToDateInput(iso: string | null | undefined) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateInputToOfferExpiry(dateValue: string) {
  const date = new Date(`${dateValue}T23:59:59`);
  return date.toISOString();
}

export function resolveClientOfferExpiresAt(expiresAt: string | null | undefined) {
  if (expiresAt && new Date(expiresAt).getTime() > Date.now()) {
    return expiresAt;
  }

  return defaultClientOfferExpiry();
}

export function getOfferRemainingMs(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return 0;
  }

  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

export function isOfferExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return true;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

export function formatOfferCountdown(remainingMs: number) {
  if (remainingMs <= 0) {
    return "0 s";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} d ${hours} godz ${minutes} min`;
  }

  if (hours > 0) {
    return `${hours} godz ${minutes} min ${seconds} s`;
  }

  if (minutes > 0) {
    return `${minutes} min ${seconds} s`;
  }

  return `${seconds} s`;
}
