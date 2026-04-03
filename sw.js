const CACHE_NAME = 'fioratura-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  'photo_2026-04-02_19-07-19.jpg',
  'photo_2026-04-02_19-07-20.jpg',
  'photo_2026-04-02_19-07-24.jpg',
  'photo_2026-04-02_19-18-52.jpg',
  'photo_2026-04-02_19-18-53.jpg',
  'photo_2026-04-02_19-18-56.jpg',
  'IMG_1310.JPG'
];

// Install event - кэшируем необходимые файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        // Если какие-то файлы не найдены, продолжаем
        return true;
      });
    })
  );
  self.skipWaiting();
});

// Activate event - очищаем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - обслуживаем запросы из кэша с fallback на сеть
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Пропускаем POST запросы
  if (request.method !== 'GET') {
    return;
  }

  // Не кэшируем external iframe'ы
  if (request.url.includes('docs.google.com') || request.url.includes('forms.yandex.ru')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      // Возвращаем из кэша если есть
      if (response) {
        return response;
      }

      // Иначе делаем fetch с сети
      return fetch(request).then((response) => {
        // Не кэшируем не-успешные ответы
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Кэшируем успешный ответ
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Если нет сети и нет в кэше, возвращаем кэшированный index.html
        return caches.match('/index.html');
      });
    })
  );
});
