/**
 * The service worker that makes the machine work offline.
 *
 * Everything the app needs is known at build time — this is a static export
 * with one page and a fixed set of samples — so rather than learning what to
 * keep as the user browses, the whole app is downloaded on install and served
 * from the cache from then on. That is the difference between "works offline
 * once you've visited the right things" and "works offline", which matters
 * here: the 909 kit is 2 MB of samples that are only fetched when someone
 * presses the preset button, so a visitor who never pressed it while online
 * would otherwise find a machine with no sounds in it.
 *
 * The two placeholders below are filled in by `scripts/build-service-worker.mjs`
 * after `next build`, which is what has actually seen the output directory and
 * knows the hashed filenames. Left as-is, this worker precaches nothing — which
 * is why registration is limited to production builds.
 */

/** A hash of the build's contents, so each deploy gets a cache of its own. */
const VERSION = "__BUILD_ID__";

/** Every URL in the export, base path included. */
const PRECACHE_URLS = __PRECACHE_URLS__;

/** The app's own start URL, which is what an offline navigation is answered with. */
const START_URL = "__START_URL__";

const CACHE_NAME = `drum-machine-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // `addAll` is atomic: one 404 among the samples and the whole install
      // fails, leaving the previous worker in place rather than a half-cached
      // one that goes wrong later, offline, with no way to explain itself.
      cache.addAll(PRECACHE_URLS),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith("drum-machine-") && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );

      // Takes over pages that were loaded before this worker existed, so the
      // very first visit is offline-ready without a reload. On later updates
      // there is nothing to claim: a new worker only reaches `activate` once
      // every page holding the old one has gone.
      await self.clients.claim();
    })(),
  );
});

/**
 * Deliberately no `skipWaiting`. A new build's chunk filenames are hashed, so
 * activating early — and dropping the previous cache with it — would pull
 * assets out from under a page that is open and running, and this is an app
 * people leave open while a pattern plays. The update lands on the next cold
 * start instead.
 */

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations go to the network first so a reload picks up a new deploy
  // without waiting for the worker to notice, and fall back to the cached
  // start URL when there is no network. `request.url` is not looked up
  // directly: a static export answers every path from one HTML file, and the
  // URL that file was cached under is the start URL.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(START_URL);
        // A navigation with nothing cached to answer it means the install never
        // completed. Letting the browser produce its own offline error is more
        // honest than a blank 200.
        return cached ?? Response.error();
      }),
    );
    return;
  }

  // Everything else is cache-first. The static chunks are content-hashed and
  // the samples are fixed, so nothing under this worker's scope can go stale
  // without changing its URL — which makes a network revalidation pure cost.
  event.respondWith(
    (async () => {
      // Scoped to this build's cache rather than searched across all of them,
      // so a worker that is still waiting to activate cannot start answering
      // from the incoming build's assets while the page holding it runs on the
      // old ones.
      const cache = await caches.open(CACHE_NAME);

      // Query strings are ignored because Next hangs a content hash off the
      // icon URLs it emits (`/icon.png?icon.0-5lmjobrk2vw.png`) while the file
      // itself is exported at the bare path — an exact match would miss every
      // one of them, and they would be the only things to break offline.
      // Nothing in this export distinguishes two resources by query alone.
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      const response = await fetch(request);

      // Anything reaching here was missed by the precache — a lazily loaded
      // chunk, say. Keeping it means the next visit has it offline too.
      // Opaque and error responses are left alone: caching those would pin a
      // failure in place for the life of the deploy.
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }

      return response;
    })(),
  );
});
