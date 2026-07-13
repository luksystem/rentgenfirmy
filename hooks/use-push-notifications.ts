"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientVapidPublicKey } from "@/lib/push/vapid-client";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

export type PushPermissionState = NotificationPermission | "unsupported";

export type PushSubscriptionStatus = {
  subscribed: boolean;
  endpoint: string | null;
  activeDeviceCount: number;
  vapidConfigured: boolean;
};

function detectIos() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function detectStandalone() {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function detectBrowserSupport() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function subscriptionToPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Nie udało się odczytać kluczy subskrypcji push.");
  }

  return {
    endpoint,
    keys: { p256dh, auth },
    platform: detectIos() ? "ios" : "web",
    deviceName: typeof navigator !== "undefined" ? navigator.platform || "Urządzenie" : "Urządzenie",
  };
}

async function registerServiceWorker() {
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
}

async function saveSubscriptionOnBackend(body: ReturnType<typeof subscriptionToPayload>) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Nie udało się zapisać subskrypcji.");
  }
}

function isSubscriptionKeyMismatchError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("applicationserverkey") ||
    message.includes("invalid key") ||
    message.includes("domexception") ||
    message.includes("abort")
  );
}

export function usePushNotifications() {
  const [isSupported] = useState(detectBrowserSupport);
  const [permission, setPermission] = useState<PushPermissionState>(() =>
    isSupported ? Notification.permission : "unsupported",
  );
  const [status, setStatus] = useState<PushSubscriptionStatus>({
    subscribed: false,
    endpoint: null,
    activeDeviceCount: 0,
    vapidConfigured: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIos = useMemo(() => detectIos(), []);
  const isStandalone = useMemo(() => detectStandalone(), []);
  const vapidPublicKey = useMemo(() => getClientVapidPublicKey(), []);

  const refreshStatus = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint ?? null;
      const params = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : "";
      const response = await fetch(`/api/push/status${params}`);
      const payload = (await response.json()) as {
        error?: string;
        currentDeviceSubscribed?: boolean;
        activeDeviceCount?: number;
        vapidConfigured?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się pobrać statusu push.");
      }

      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      let subscribed = Boolean(payload.currentDeviceSubscribed);

      if (
        !subscribed &&
        currentPermission === "granted" &&
        subscription &&
        payload.vapidConfigured &&
        vapidPublicKey
      ) {
        try {
          await saveSubscriptionOnBackend(subscriptionToPayload(subscription));
          subscribed = true;
        } catch {
          // Użytkownik włączy ręcznie — nie pokazujemy błędu przy auto-sync.
        }
      }

      setStatus({
        subscribed,
        endpoint,
        activeDeviceCount: payload.activeDeviceCount ?? 0,
        vapidConfigured: Boolean(payload.vapidConfigured),
      });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Błąd synchronizacji push.");
    } finally {
      setLoading(false);
    }
  }, [isSupported, vapidPublicKey]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error("Ta przeglądarka nie obsługuje Web Push.");
    }
    if (!vapidPublicKey) {
      throw new Error(
        "Brak klucza VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY). Zrestartuj serwer dev po uzupełnieniu .env.local.",
      );
    }

    setLoading(true);
    setError(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        throw new Error("Powiadomienia zostały zablokowane w przeglądarce.");
      }

      const registration = await registerServiceWorker();
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        try {
          await saveSubscriptionOnBackend(subscriptionToPayload(subscription));
          await refreshStatus();
          return;
        } catch (syncError) {
          if (!isSubscriptionKeyMismatchError(syncError)) {
            throw syncError;
          }
          await subscription.unsubscribe();
          subscription = null;
        }
      }

      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (subscribeError) {
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await existing.unsubscribe();
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      await saveSubscriptionOnBackend(subscriptionToPayload(subscription));
      await refreshStatus();
    } catch (subscribeError) {
      const message =
        subscribeError instanceof Error ? subscribeError.message : "Nie udało się włączyć push.";
      setError(message);
      throw subscribeError;
    } finally {
      setLoading(false);
    }
  }, [isSupported, refreshStatus, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;

      if (endpoint) {
        const response = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Nie udało się wyłączyć subskrypcji.");
        }
      }

      await subscription?.unsubscribe();
      await refreshStatus();
    } catch (unsubscribeError) {
      const message =
        unsubscribeError instanceof Error
          ? unsubscribeError.message
          : "Nie udało się wyłączyć push.";
      setError(message);
      throw unsubscribeError;
    } finally {
      setLoading(false);
    }
  }, [isSupported, refreshStatus]);

  const sendTestNotification = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać testu push.");
      }
    } catch (testError) {
      const message =
        testError instanceof Error ? testError.message : "Nie udało się wysłać testu push.";
      setError(message);
      throw testError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    status,
    loading,
    error,
    isIos,
    isStandalone,
    vapidPublicKey,
    subscribe,
    unsubscribe,
    sendTestNotification,
    refreshStatus,
  };
}
