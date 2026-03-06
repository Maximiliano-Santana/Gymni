const CACHE_NAME = "gymni-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // QR API — network first, cache fallback (offline QR data)
  if (url.pathname === "/api/tenant/me/qr") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Dashboard pages — network first, cache fallback (offline shell)
  if (request.mode === "navigate" && url.pathname.startsWith("/dashboard")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Next.js static assets — cache first (content-hashed, safe to cache)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Everything else — network only
});

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    })
    .catch(() => caches.match(request));
}
