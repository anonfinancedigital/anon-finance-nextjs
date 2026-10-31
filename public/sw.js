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

// Push: the payload is `{"title","body","url"}` built from fixed texts on the server. Nothing from it is
// cached. Anything unusable falls back to a generic notice.
const ICON = "/icon-192.png";
const FALLBACK = { title: "ANON", body: "Você tem uma nova notificação." };

/** Only same-origin paths: "/x" is kept; "//host", "/\host", absolute URLs and non-strings become "/". */
function safeTarget(url) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")
    ? url
    : "/";
}

function parsePush(data) {
  let payload = null;
  try {
    payload = data ? data.json() : null;
  } catch {
    payload = null;
  }
  if (payload && typeof payload.title === "string" && typeof payload.body === "string") {
    return { title: payload.title, body: payload.body, url: safeTarget(payload.url) };
  }
  return { ...FALLBACK, url: "/" };
}

self.addEventListener("push", (event) => {
  const { title, body, url } = parsePush(event.data);
  event.waitUntil(self.registration.showNotification(title, { body, icon: ICON, badge: ICON, data: { url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeTarget(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!open) return self.clients.openWindow(target);
      return open.focus().then(() => open.navigate(target));
    }),
  );
});
