/* Service Worker — Network-First con respaldo 100% Offline */
const CACHE_NAME = "g09-offline-v1.0.1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./vault.js",
  "./core.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of CORE_ASSETS) {
        try {
          const res = await fetch(new Request(asset, { cache: "reload" }));
          if (res && res.ok) await cache.put(asset, res);
        } catch (e) {}
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
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

      try {
        const fresh = await fetch(req, { cache: "no-cache" });
        if (fresh && fresh.ok && fresh.status === 200) {
          cache.put(req, fresh.clone());
          if (req.mode === "navigate") cache.put("./index.html", fresh.clone());
          return fresh;
        }
      } catch (e) {}

      if (cached) return cached;
      const fallback = (await cache.match("./index.html")) || (await cache.match("./"));
      return fallback || new Response("Sin conexión y sin caché previa.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    })
  );
});
