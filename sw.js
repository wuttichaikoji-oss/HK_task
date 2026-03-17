self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('laya-task-v1').then((cache) => cache.addAll([
      './',
      './index.html',
      './styles.css',
      './app.js',
      './manifest.json'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Laya Task Board', body: 'มีอัปเดตงานใหม่' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Laya Task Board', {
      body: data.body || 'มีอัปเดตงานใหม่',
      icon: './icons/icon-192.png'
    })
  );
});
