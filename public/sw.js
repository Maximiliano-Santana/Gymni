// Minimal service worker — required for PWA installability.
// No caching logic; just the fetch handler Chrome requires.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up any caches from previous versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", () => {
  // Network only — no caching
});
