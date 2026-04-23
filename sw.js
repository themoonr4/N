const CACHE_NAME = 'the-moon-v3';
const urlsToCache = ['/', '/index.html', '/css/style.css', '/css/responsive.css', '/js/main.js', '/assets/logo.svg'];

self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).then(() => self.skipWaiting())); });
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request).catch(() => caches.match(event.request))); });
