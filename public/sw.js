const CACHE = "ian-v3";

self.addEventListener("install", (e) => {
  // Only cache static assets, never SSR pages
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/manifest.json"])).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never intercept API calls or SSR pages — pass through directly
  if (url.pathname.startsWith("/api/")) return;
  if (!url.pathname.match(/\.(png|jpg|svg|ico|json|css|js|woff2?)$/)) return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
