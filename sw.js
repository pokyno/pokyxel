// Pokyxel's service worker (SPEC WP-G6): the second and last hand-written JavaScript
// file, by the decision record in SPEC § 12. Same-origin only. It precaches the site's
// own files into one cache per build, answers same-origin GET requests from that cache,
// and lets every other request pass to the browser untouched. It never touches IndexedDB
// or localStorage, so the user's drawings are never in it.
// scripts/build-web.sh replaces the placeholder with "<version>-<git hash>[-<timestamp>]".
const CACHE = "pokyxel-0.1.0-3535a0a";
// Every file of the published site but this one; build-web.sh checks the list both ways.
const FILES = [
  "./index.html",
  "./boot.js",
  "./licenses.html",
  "./manifest.webmanifest",
  "./pkg/pokyxel.js",
  "./pkg/pokyxel_bg.wasm",
  "./fonts/HankenGrotesk-Regular.ttf",
  "./fonts/HankenGrotesk-SemiBold.ttf",
  "./fonts/JetBrainsMono-Regular.ttf",
  "./fonts/OFL.txt",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/touch-icon-180.png",
];

// Install: fetch every file from the server, bypassing the HTTP cache, into this build's
// cache. The worker is only installed when all of them are stored.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(FILES.map((file) => new Request(file, { cache: "reload" })))
    )
  );
});

// Activate: delete the caches of earlier builds. No skipWaiting and no clients.claim: a
// new build takes over once every Pokyxel page has been closed and opened again, so one
// page never mixes the files of two builds.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("pokyxel-") && name !== CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Fetch: same-origin GET only; the site's directory itself means its index.html. A cache
// hit is answered from the cache, anything else goes to the network as without a worker.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/")) url.pathname += "index.html";
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(url.href, { ignoreSearch: true }))
      .then((hit) => hit || fetch(request))
  );
});
