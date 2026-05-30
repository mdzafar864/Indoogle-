// =============================
//  INDOOGLE UNIVERSAL PWA SERVICE WORKER
//  Works on GitHub Pages + Netlify
// =============================

const CACHE_NAME = "indoogle-cache-v3";

// 🔥 Auto detect GitHub Pages base path
// GitHub Pages URL example:
// https://username.github.io/Indoogle-/
// Netlify URL example:
// https://your-site.netlify.app/
const BASE = self.location.hostname.includes("github.io")
  ? "/Indoogle-"
  : "";

// ✅ App shell files
const PRECACHE_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`,
  `${BASE}/logo.png`
];

// =============================
// INSTALL
// =============================
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// =============================
// ACTIVATE
// =============================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// =============================
// FETCH
// =============================
self.addEventListener("fetch", event => {
  const request = event.request;

  // Ignore non-http requests
  if (!request.url.startsWith("http")) return;

  // Ignore chrome-extension / browser internal requests
  if (request.url.startsWith("chrome-extension://")) return;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Optional: avoid caching Google search result pages
  if (
    url.hostname.includes("google.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("firebaseio.com")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML pages → Network First
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match(`${BASE}/index.html`);
          });
        })
    );

    return;
  }

  // Static files → Cache First
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(response => {
          // Do not cache bad responses
          if (!response || response.status !== 200) {
            return response;
          }

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // Offline fallback for images/icons if needed
          if (request.destination === "image") {
            return caches.match(`${BASE}/logo.png`);
          }
        });
    })
  );
});

// =============================
// FORCE UPDATE
// =============================
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
