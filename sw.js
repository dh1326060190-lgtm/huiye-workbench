// 绘野工作台 Service Worker
const CACHE_VERSION = 'huiye-v1.1.0';
const CACHE_NAME = `${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './styles.css',
  './app.js',
  './modules/tasks.js',
  './modules/hotspot.js',
  './modules/review.js',
  './modules/inspiration.js',
  './modules/store.js'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] 部分资源缓存失败:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('huiye-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 跳过非GET请求
  if (request.method !== 'GET') return;

  // 网络优先策略（用于热点数据等动态内容）
  if (request.url.includes('hotspot') || request.url.includes('api.')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 缓存优先策略（用于静态资源）
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        return response;
      }).catch(() => cached);
    })
  );
});

// 接收消息：强制更新
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
