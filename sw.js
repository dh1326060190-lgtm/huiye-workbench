// 绘野工作台 Service Worker v6
// 策略：不缓存HTML，只做离线兜底
const CACHE_VERSION = 'huiye-v7.0.0';

// 激活时清除所有旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map(k => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

// 安装后立即激活
self.addEventListener('install', () => {
  self.skipWaiting();
});

// 只对静态资源做缓存兜底，HTML始终走网络
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isHtml = request.headers.get('accept') && request.headers.get('accept').includes('text/html');

  if (isHtml) {
    // HTML: 始终走网络，不缓存
    event.respondWith(fetch(request));
    return;
  }

  // JS/CSS/图片等静态资源: 网络优先，离线兜底
  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
