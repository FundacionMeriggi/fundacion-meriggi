const BASE = self.location.pathname.replace(/\/sw\.js$/, '');
const CACHE = 'meriggi-static-v2';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([`${BASE}/logo-meriggi.jpg`, `${BASE}/manifest.webmanifest`])).catch(() => undefined));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isBrandAsset = /\.(?:png|jpg|jpeg|svg|webp|ico|woff2)$/.test(url.pathname);
  if (!isBrandAsset) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request)));
});
