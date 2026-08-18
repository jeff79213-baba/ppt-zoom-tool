const INSTALL_CACHE = "pptzoom-v6";
const PRECACHE = ["./", "./index.html", "./css/style.css", "./js/app.js", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(INSTALL_CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== INSTALL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
