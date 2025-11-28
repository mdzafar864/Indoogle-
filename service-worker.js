const CACHE_NAME = "indooggle-cache-v2";

// Files to precache
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.png"
];

// INSTALL — Cache core files
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Activate new SW immediately

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// ACTIVATE — Remove old cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Take control immediately
});

// FETCH — Network First + Cache fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Update cache with fresh copy
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });

        return networkResponse.clone();
      })
      .catch(() => caches.match(event.request)) // Offline fallback
  );
});

// MESSAGE from client to trigger refresh
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
      
