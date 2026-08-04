import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/** Static for the same reason the sitemap and the manifest are. */
export const dynamic = "force-static";

/**
 * Worth having, but be clear about what it does here: a crawler asks the domain
 * root for `robots.txt` and nowhere else, so on a project page this file — which
 * exports to `/drum-machine/robots.txt` — is not the one Google reads. That one
 * belongs to the user page at `ladobarnovi.github.io`.
 *
 * It costs nothing and becomes the real thing the moment the app moves to a
 * custom domain or a user page. Until then the sitemap is discovered by
 * submitting it in Search Console instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
