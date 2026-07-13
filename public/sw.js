/* global self, clients */

const DEFAULT_ICON = "/icons/push-icon-192.png";
const DEFAULT_BADGE = "/icons/push-badge-96.png";
const DEFAULT_URL = "/";

function sanitizePath(url) {
  if (typeof url !== "string" || !url.trim()) {
    return DEFAULT_URL;
  }

  const trimmed = url.trim();
  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("//") ||
    /^javascript:/i.test(trimmed) ||
    /^data:/i.test(trimmed)
  ) {
    return DEFAULT_URL;
  }

  if (!trimmed.startsWith("/") || trimmed.includes("\\")) {
    return DEFAULT_URL;
  }

  return trimmed;
}

function parsePushData(event) {
  if (!event.data) {
    return {
      title: "Rentgen firmy",
      body: "Masz nowe powiadomienie.",
      url: DEFAULT_URL,
      tag: "default",
      icon: DEFAULT_ICON,
      badge: DEFAULT_BADGE,
    };
  }

  try {
    const data = event.data.json();
    return {
      title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Rentgen firmy",
      body: typeof data.body === "string" && data.body.trim() ? data.body.trim() : "Masz nowe powiadomienie.",
      url: sanitizePath(data.url),
      tag: typeof data.tag === "string" && data.tag.trim() ? data.tag.trim() : "default",
      icon: typeof data.icon === "string" && data.icon.trim() ? data.icon.trim() : DEFAULT_ICON,
      badge: typeof data.badge === "string" && data.badge.trim() ? data.badge.trim() : DEFAULT_BADGE,
      notificationId: typeof data.notificationId === "string" ? data.notificationId : undefined,
    };
  } catch {
    const text = event.data.text();
    return {
      title: "Rentgen firmy",
      body: text || "Masz nowe powiadomienie.",
      url: DEFAULT_URL,
      tag: "default",
      icon: DEFAULT_ICON,
      badge: DEFAULT_BADGE,
    };
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushData(event);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: payload.icon,
      badge: payload.badge,
      data: {
        url: payload.url,
        notificationId: payload.notificationId,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = sanitizePath(event.notification.data?.url);
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
