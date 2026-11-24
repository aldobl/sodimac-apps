/* Service Worker — Network-First con respaldo 100% Offline */
const CACHE_NAME = "g09-offline-v1.1.0";
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
const EXTERNAL_OFFLINE_LIBS = [
  "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js"
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
      for (const extUrl of EXTERNAL_OFFLINE_LIBS) {
        try {
          const res = await fetch(new Request(extUrl, { mode: "cors", cache: "reload" }));
          if (res && res.ok) await cache.put(extUrl, res);
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
  if (url.origin !== self.location.origin) {
    if (EXTERNAL_OFFLINE_LIBS.includes(req.url)) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async cache => {
          const cached = await cache.match(req.url);
          if (cached) return cached;
          try {
            const fresh = await fetch(req);
            if (fresh && fresh.ok) cache.put(req.url, fresh.clone());
            return fresh;
          } catch (e) {
            return new Response("", { status: 503 });
          }
        })
      );
    }
    return;
  }

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
