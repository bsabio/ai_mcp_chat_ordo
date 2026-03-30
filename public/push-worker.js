self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() ?? {};
  const title = typeof payload.title === "string" ? payload.title : "Studio Ordo";
  const body = typeof payload.body === "string" ? payload.body : "A deferred job finished.";
  const url = typeof payload.url === "string" ? payload.url : "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: {
        url,
        conversationId: payload.conversationId,
        jobId: payload.jobId,
        status: payload.status,
      },
      tag: typeof payload.jobId === "string" ? payload.jobId : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});