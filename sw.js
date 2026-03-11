const CACHE_NAME = "planar-atlas-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/gallery.js",
  "/gallery-utils.js",
  "/gallery-ui.js",
  "/gallery-state.js",
  "/gallery-render.js",
  "/gallery-search.js",
  "/gallery-modal.js",
  "/deck.js",
  "/game-classic.js",
  "/game-bem.js",
  "/manifest.json",
  "/favicon.svg",
  "/cards.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

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
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // For same-origin requests only
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // cards.json: network-first so updates are picked up, fall back to cache
  if (path.endsWith("/cards.json")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell (JS, CSS, HTML) + transcripts + images: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response.ok) return response;

        // Cache card images, thumbnails, transcripts, and assets
        const cacheable =
          path.startsWith("/images/") ||
          path.startsWith("/transcripts/") ||
          path.startsWith("/cards/") ||
          APP_SHELL.includes(path) ||
          path === "/";

        if (cacheable) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }

        return response;
      });
    })
  );
});
