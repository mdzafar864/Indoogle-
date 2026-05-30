// =============================
// INDOOGLE UNIVERSAL PWA SERVICE WORKER
// Works on GitHub Pages + Netlify
// =============================

const CACHE_NAME = "indoogle-cache-v4";

// GitHub Pages base path auto detect
// Example GitHub: https://username.github.io/Indoogle-/
// Example Netlify: https://indoogle.netlify.app/
const BASE = self.location.hostname.includes("github.io")
  ? "/Indoogle-"
  : "";

// App shell files
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
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(error => console.error("Precache failed:", error))
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

  // Only handle http/https
  if (!request.url.startsWith("http")) return;

  // Only GET request cache karo
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // External Google/Firebase requests ko cache mat karo
  if (
    url.hostname.includes("google.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("fontawesome.com") ||
    url.hostname.includes("cloudflare.com")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML pages: Network First
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
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

  // Static assets: Cache First
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(response => {
          if (!response || response.status !== 200) {
            return response;
          }

          const clone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
          });

          return response;
        })
        .catch(() => {
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
