const CACHE = 'cle-cache-v1';
const OFFLINE_CLASSES = 'cle-offline-classes';
const OFFLINE_PDFS = 'cle-offline-pdfs';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('message', (e) => {
  if (e.data.type === 'CACHE_CLASS') {
    const { classId, contentText, pdfUrl } = e.data;
    caches.open(OFFLINE_CLASSES).then((cache) => {
      if (contentText) {
        const url = `/api/classes/${classId}`;
        const response = new Response(JSON.stringify({ class: { content_text: contentText } }), {
          headers: { 'Content-Type': 'application/json' }
        });
        cache.put(url, response);
      }
    });
    if (pdfUrl) {
      caches.open(OFFLINE_PDFS).then((cache) => {
        fetch(pdfUrl).then((res) => {
          if (res.ok) cache.put(pdfUrl, res);
        }).catch(() => {});
      });
    }
  }
  if (e.data.type === 'CACHE_QUESTIONS') {
    const { classId, questions } = e.data;
    caches.open(OFFLINE_CLASSES).then((cache) => {
      const url = `/api/tests/${classId}`;
      const response = new Response(JSON.stringify({ questions }), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(url, response);
    });
  }
  if (e.data.type === 'CLEAR_CACHE') {
    caches.delete(OFFLINE_CLASSES);
    caches.delete(OFFLINE_PDFS);
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (url.pathname.startsWith('/api/classes/') || url.pathname.startsWith('/api/tests/')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request).then((cached) => {
          return cached || new Response(JSON.stringify({ offline: true, error: 'Content not cached for offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/uploads/')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request).then((cached) => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request).then((cached) => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
