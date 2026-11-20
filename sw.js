const CACHE = 'cambio-v3';
  self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c =>
  c.addAll(['/','/index.html','/app.js','/manifest.json','/icon-192.png','/icon-512.png'])));
    self.skipWaiting();
  });
  self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))));
    self.clients.claim();
  });
  self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (url.hostname === 'economia.awesomeapi.com.br') {
      e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
      );
    } else {
      e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request))
      );
    }
  });