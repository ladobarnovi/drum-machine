import type { MetadataRoute } from "next";

import { CANONICAL_URL, PRIVACY_URL } from "@/lib/site";

/**
 * As with the manifest, this is a Route Handler and this build has no server to
 * run one on — `output: "export"` refuses the route outright without being told
 * it is static.
 */
export const dynamic = "force-static";

/**
 * Two pages, so this is close to a formality — but it is the file Search
 * Console takes on submission, and on a GitHub Pages *project* page that
 * submission is the only way the sitemap is ever found. Crawlers only read
 * `robots.txt` from the domain root, and the root here belongs to the user
 * page, not this repo.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: CANONICAL_URL,
      // Build time. The app is a single page whose content changes when it is
      // redeployed and at no other point, so this is honest.
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: PRIVACY_URL,
      // Same reasoning, and the same date — the notice ships with the build it
      // describes, so there is no separate moment at which it changed.
      lastModified: new Date(),
      // Lower on both counts than the machine itself: the notice is here to be
      // findable, not to compete with the app for the query that matters.
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
