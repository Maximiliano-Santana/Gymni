const CACHE_NAME = "gymni-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.put(
        new Request("/offline"),
        new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#09090b;color:#fafafa;text-align:center}div{padding:2rem}h1{font-size:1.25rem;margin-bottom:0.5rem}p{color:#a1a1aa;font-size:0.875rem}</style></head><body><div><h1>Sin conexión</h1><p>Abre la app con internet al menos una vez para activar el modo offline.</p></div></body></html>',
          { headers: { "Content-Type": "text/html" } }
        )
      )
    )
  );
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
  var request = event.request;
  var url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Next.js static assets — cache first (content-hashed, immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        return (
          cached ||
          fetch(request).then(function (response) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, clone);
            });
            return response;
          })
        );
      })
    );
    return;
  }

  // Dashboard pages, QR API, theme CSS — network first + cache fallback
  var shouldCache =
    url.pathname.startsWith("/dashboard") ||
    url.pathname === "/api/tenant/me/qr" ||
    url.pathname === "/api/tenants/theme" ||
    url.pathname.startsWith("/_next/data/");

  if (shouldCache) {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match("/offline");
          });
        })
    );
    return;
  }

  // Everything else — network only
});
