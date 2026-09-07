self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        await self.clients.claim();
        try {
          const names = await caches.keys();
          await Promise.allSettled(names.map((name) => caches.delete(name)));
        } catch {
          // Cache storage may be unavailable; still reload and unregister.
        }
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(
          clients.map((client) => client.navigate(client.url)),
        );
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});
