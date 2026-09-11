/* La versione precedente del sito registrava un service worker con cache.
   Il nuovo sito e' un file unico e non ne ha bisogno: questo file sostituisce
   il vecchio, svuota le cache e si disattiva, cosi' nessuno resta con la
   pagina vecchia. Si puo' eliminare fra qualche mese. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
  })());
});
