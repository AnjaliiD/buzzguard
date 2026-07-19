/* BuzzGuard service worker.
   Caches the app shell and any map tiles you have already looked at, so the
   whole thing keeps working with the network switched off. */

const CACHE = "buzzguard-v1";

const SHELL = [
  "./",
  "./buzzguard_app.html",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

self.addEventListener("install", e => {
  // addAll fails the whole install if any single URL 404s, so add them
  // one at a time and tolerate misses.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const CACHEABLE = url =>
  url.includes("tile.openstreetmap.org") ||
  url.includes("unpkg.com/leaflet") ||
  url.includes("cdn.jsdelivr.net/npm/@tensorflow") ||
  url.startsWith(self.location.origin);

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;

  e.respondWith(
    caches.match(e.request).then(hit => {
      const live = fetch(e.request)
        .then(res => {
          if (res && (res.ok || res.type === "opaque") && CACHEABLE(url)) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);        // offline: fall back to whatever we stored
      return hit || live;          // cache first, so it is fast and offline-safe
    })
  );
});
