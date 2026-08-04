"use client";

import { useEffect } from "react";

/**
 * Registers the offline worker. Renders nothing — it exists because
 * `navigator.serviceWorker` is browser-only and the layout is a server
 * component.
 *
 * Registration is limited to production builds. The worker's precache manifest
 * is written into it after `next build` (see `scripts/build-service-worker.mjs`),
 * so in development it would be an unfilled template; worse, a worker serving a
 * cached copy of the app is the opposite of what a dev server is for.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    if (process.env.NODE_ENV !== "production") {
      // A worker registered by a production build served from this same origin
      // — `localhost` usually, when checking the export locally — would go on
      // answering the dev server's requests from that build's cache, and the
      // resulting staleness is very hard to recognise for what it is.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister()),
          ),
        )
        .catch(() => {
          // Nothing to be done about it, and nothing the user could act on.
        });
      return;
    }

    void navigator.serviceWorker
      .register(`${basePath}/sw.js`, {
        // Explicit, so the worker's reach is the app's own path rather than
        // wherever the script happens to sit — on a project page the two are
        // the same, but that is a property of the deployment, not a guarantee.
        scope: `${basePath}/`,
        // The update check should never be answered from the HTTP cache. This
        // is the default for the worker script itself in current browsers, but
        // not for anything it imports, and a static host is free to send
        // whatever `Cache-Control` it likes.
        updateViaCache: "none",
      })
      .catch((error: unknown) => {
        // Offline support is an enhancement: the app runs perfectly well
        // without it, so a failure here is logged rather than surfaced.
        console.error("Service worker registration failed:", error);
      });
  }, []);

  return null;
}
