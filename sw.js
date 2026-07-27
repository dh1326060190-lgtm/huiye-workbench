// 绘野工作台 Service Worker v2
const CACHE_VERSION = 'huiye-v2.0.0';
const CACHE_NAME = CACHE_VERSION;

// 激活时清除所有旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 网络优先策略 —— 确保每次都拿到最新文件
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // 成功后更新缓存
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      })
      .catch(() => {
        // 离线时用缓存
        return caches.match(request);
      })
  );
});

// 安装后立即激活
self.addEventListener('install', () => {
  self.skipWaiting();
});
