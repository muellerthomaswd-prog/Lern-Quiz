const CACHE = "lernquiz-shell-v1";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.json", "icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// App-Hülle aus dem Cache, Lerninhalte (data/*.json) immer frisch aus dem Netz
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.includes("/data/")) return; // nie cachen, immer aktuell
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
