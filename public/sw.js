// Service worker: caches only static assets (never pages, Server Actions or API responses), so no
// financial data can end up in the device cache (AD-011).
const CACHE = "anon-static-v1";
const PRECACHE = ["/offline.html", "/icon-192.png", "/icon-512.png"];
const STATIC_PREFIX = "/_next/static/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

function cacheFirst(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.status === 200) cache.put(request, response.clone());
          return response;
        }),
    ),
  );
}

function offlinePage() {
  return caches
    .open(CACHE)
    .then((cache) => cache.match("/offline.html"))
    .then((page) => page || Response.error());
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(STATIC_PREFIX)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    // Network only: any HTTP response is returned untouched and never stored.
    event.respondWith(fetch(request).catch(offlinePage));
  }
});
