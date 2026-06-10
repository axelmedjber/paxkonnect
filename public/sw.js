self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  event.waitUntil(
    self.registration.showNotification(data.title || "PaxKonnect", {
      badge: "/icons/icon-96.png",
      body: data.body || "Nouvelle notification",
      data: { url: data.url || "/fr/dashboard" },
      icon: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data?.url || "/fr"));
});
