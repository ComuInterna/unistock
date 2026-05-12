// UniStock Service Worker v1
const CACHE_NAME = 'unistock-v1';
const CORE_ASSETS = [
  '/index.html',
  '/entrega.html',
  '/nfc.html',
  '/manifest.json',
  '/apple-touch-icon.png'
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Network first, cache fallback ──────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-GET, Supabase API, and CDN calls
  if (event.request.method !== 'GET') return;
  if (url.includes('supabase.co'))     return;
  if (url.includes('googleapis.com'))  return;
  if (url.includes('jsdelivr.net'))    return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Message: handle NFC navigation requests ───────────────────────────────────
// When nfc.html wants to navigate an already-open PWA window
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'NFC_NAVIGATE') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Find a focused or visible window
        const target = clients.find(c => c.focused) ||
                       clients.find(c => c.visibilityState === 'visible') ||
                       clients[0];
        if (target) {
          target.postMessage({ type: 'NAVIGATE', url: event.data.url });
          target.focus().catch(() => {});
        }
      });
  }
});
