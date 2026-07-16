self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data?.json() ?? {};
  } catch {
    data = {
      title: "Rentgen",
      body: event.data?.text() ?? ""
    };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Rentgen", {
      body: data.body ?? "",
      icon: "/icons/notification-icon-192x192.png",
      badge: "/icons/push-badge-96x96.png",
      tag: data.tag,
      data: {
        url: data.url ?? "/"
      }
    })
  );
});
