import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validatePushPayload } from "@/lib/push/payload";
import {
  fetchActivePushSubscriptionsForUser,
  removePushSubscriptionById,
  touchPushSubscriptionLastUsed,
} from "@/lib/push/subscription-repository";
import type { PushPayload, SendPushResult } from "@/lib/push/types";
import { sanitizeInternalPushUrl } from "@/lib/push/url";
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject, isVapidConfigured } from "@/lib/push/vapid";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) {
    return;
  }

  if (!isVapidConfigured()) {
    throw new Error("Brak konfiguracji VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT).");
  }

  webpush.setVapidDetails(getVapidSubject(), getVapidPublicKey(), getVapidPrivateKey());
  vapidConfigured = true;
}

function buildWebPushPayload(payload: PushPayload) {
  const safeUrl = sanitizeInternalPushUrl(payload.url, "/");
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: safeUrl,
    tag: payload.tag ?? payload.notificationId ?? undefined,
    icon: payload.icon ?? "/icons/notification-icon-192x192.png",
    badge: payload.badge ?? "/icons/push-badge-96x96.png",
    notificationId: payload.notificationId,
  });
}

function isExpiredPushStatusCode(statusCode: number | undefined) {
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushToUser(userId: string, rawPayload: PushPayload): Promise<SendPushResult> {
  ensureVapidConfigured();
  const payload = validatePushPayload(rawPayload);
  const supabase = getSupabaseAdmin();
  const subscriptions = await fetchActivePushSubscriptionsForUser(supabase, userId);

  if (!subscriptions.length) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  const message = buildWebPushPayload(payload);
  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          message,
        );
        await touchPushSubscriptionLastUsed(supabase, subscription.id);
        sent += 1;
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;

        if (isExpiredPushStatusCode(statusCode)) {
          await removePushSubscriptionById(supabase, subscription.id);
          removed += 1;
          return;
        }

        console.error("[push] send failed", {
          userId,
          subscriptionId: subscription.id,
          statusCode,
        });
        failed += 1;
      }
    }),
  );

  return { sent, failed, removed };
}
