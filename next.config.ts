import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  /*
   * Exports `/privacy` as `privacy/index.html` rather than `privacy.html`,
   * which is what a static host actually answers a directory URL with. Without
   * it the canonical `/privacy/` 404s on GitHub Pages, and the service worker
   * precaches `/privacy.html` — a URL no navigation ever asks for, leaving the
   * page uncached offline.
   */
  trailingSlash: true,
  // Set by the GitHub Pages workflow to the repo's project-page subpath
  // (e.g. "/drum-machine"); empty for local dev and user/org pages.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
};

export default nextConfig;
