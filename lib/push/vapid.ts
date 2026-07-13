export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
}

export function getVapidPrivateKey() {
  return process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
}

export function getVapidSubject() {
  return process.env.VAPID_SUBJECT?.trim() ?? "mailto:biuro@luksystem.pl";
}

export function isVapidConfigured() {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey() && getVapidSubject());
}

/** Konwersja klucza VAPID (base64url) do Uint8Array dla PushManager.subscribe(). */
export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Wersja serwerowa konwersji (Node.js). */
export function urlBase64ToBuffer(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}
