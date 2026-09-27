/* Nasz Dzień – Service Worker
 * Po KAŻDEJ zmianie index.html podbij VERSION – inaczej goście zobaczą starą wersję z pamięci. */
const VERSION = 'v1.0.0';
const CORE_CACHE = 'wesele-core-' + VERSION;
const RUNTIME_CACHE = 'wesele-runtime-v1';

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-48.png'
];
// Opcjonalne – brak pliku nie psuje instalacji
const OPTIONAL = ['./assets/hero-dzien.jpg', './assets/hero-noc.jpg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then(cache => cache.addAll(CORE).then(() => Promise.allSettled(OPTIONAL.map(u => cache.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CORE_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST do API zawsze przez sieć
  const url = new URL(req.url);

  // API i Dysk – nigdy z pamięci
  if (/script\.google\.com|googleusercontent\.com|drive\.google\.com/.test(url.hostname)) return;

  // Czcionki Google – z pamięci, pobierane raz
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Własne pliki – natychmiast z pamięci, w tle aktualizacja (stale-while-revalidate)
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, event));
  }
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') (await caches.open(RUNTIME_CACHE)).put(req, res.clone());
    return res;
  } catch (e) {
    return new Response('', { status: 504 });
  }
}

async function staleWhileRevalidate(req, event) {
  const isNav = req.mode === 'navigate';
  const cached = await caches.match(isNav ? './index.html' : req, { ignoreSearch: isNav });
  const network = fetch(req).then(async res => {
    if (res.ok) (await caches.open(CORE_CACHE)).put(isNav ? './index.html' : req, res.clone());
    return res;
  }).catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || new Response('Brak połączenia', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
