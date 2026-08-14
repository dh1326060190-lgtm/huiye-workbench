// 绘野工作台 Service Worker v15
const CACHE_VERSION = 'huiye-v15.0.0';
const PRECACHE = ['index.html', 'manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(PRECACHE).catch(() => {})).then(() => self.clients.claim())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE_VERSION ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 导航请求（打开页面）：网络优先，离线时回退到已缓存的 index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE_VERSION).then(cache => cache.put('index.html', c)); return r; })
        .catch(() => caches.match('index.html').then(m => m || new Response('离线资源不可用', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })))
    );
    return;
  }

  // 静态资源（JS/CSS/图片等）：网络优先，离线兜底缓存
  event.respondWith(
    fetch(req)
      .then(r => { const c = r.clone(); caches.open(CACHE_VERSION).then(cache => cache.put(req, c)); return r; })
      .catch(() => caches.match(req))
  );
});
