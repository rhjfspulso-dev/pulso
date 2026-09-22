/* PULSO JFS — Service Worker
 * Faz duas coisas:
 *  1. Cache do "casco" da app (funciona sem rede depois da 1ª abertura)
 *  2. Não interfere nos pedidos à API (esses passam sempre pela rede;
 *     a fila offline das respostas é gerida no app.js via IndexedDB)
 *
 * IMPORTANTE: sempre que publicar uma nova versão da app,
 * incremente CACHE_VERSION para forçar a atualização em todos os telemóveis.
 */
const CACHE_VERSION = 'pulso-v5';
const CORE = [
  './',
  './index.html',
  './app.js',
  './estilo.css',
  './manifest.json',
  './clima.html',
  './clima.js',
  './dashboard.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Pedidos à API (Apps Script) — nunca do cache, sempre rede
  if (url.hostname.includes('script.google.com')) {
    return; // deixa passar direto
  }

  // Casco da app — cache primeiro, rede como fallback
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      // guarda cópias novas do casco
      if (e.request.method === 'GET' && resp.status === 200) {
        const copy = resp.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
