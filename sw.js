/* Service Worker — Herramienta G09 (Caché 100% Offline) */

const CACHE_NAME = "g09-offline-v7";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached =
        (await cache.match(req, { ignoreSearch: true })) ||
        (req.mode === "navigate" ? (await cache.match("./index.html")) || (await cache.match("./")) : null);

      const networkFetch = fetch(req).then(res => {
        if (res && res.ok && res.status === 200) {
          cache.put(req, res.clone());
          if (req.mode === "navigate") {
            cache.put("./index.html", res.clone());
          }
        }
        return res;
      }).catch(() => null);

      if (cached) {
        event.waitUntil(networkFetch);
        return cached;
      }

      const fresh = await networkFetch;
      if (fresh && fresh.ok) return fresh;

      const fallback = (await cache.match("./index.html")) || (await cache.match("./"));
      return fallback || new Response("Sin conexión y sin caché previa.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    })
  );
});
