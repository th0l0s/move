/* Service worker minimo: mette in cache i file del sito cosi' la pagina
   si apre anche senza rete. Le tile della mappa restano online, quindi
   offline la mappa non c'e': tutto il resto si'.
   Alza CACHE a ogni pubblicazione, altrimenti resta la versione vecchia. */
const CACHE = 'adda-transit-v3';
const FILES = [
  './',
  'index.html',
  'style.css',
  'data.js',
  'script.js',
  'icon.svg',
  'manifest.webmanifest',
  'vendor/maplibre-gl.css',
  'vendor/maplibre-gl.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Rete per prima, cache come rete di sicurezza: cosi' chi ha campo
   vede sempre gli orari aggiornati, e chi non ce l'ha vede comunque
   l'ultima versione scaricata. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
