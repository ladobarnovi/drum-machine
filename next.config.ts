import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Set by the GitHub Pages workflow to the repo's project-page subpath
  // (e.g. "/drum-machine"); empty for local dev and user/org pages.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
};

export default nextConfig;
