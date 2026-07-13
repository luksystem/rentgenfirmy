/** Klucz publiczny VAPID — wyłącznie dla przeglądarki (NEXT_PUBLIC_). */
export function getClientVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
}
