import type { MetadataRoute } from "next";

/**
 * Next rewrites the `<link rel="manifest">` it emits for the deployed base
 * path, but nothing inside the manifest itself — so, as with `presetSlotUrl`,
 * the prefix is applied by hand here. Getting this wrong on GitHub Pages is
 * quiet but total: `start_url` would point at the domain root and the installed
 * app would open somebody else's page.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * The manifest is a Route Handler, and this build has no server to run one on.
 * `output: "export"` rejects the route outright without this, rather than
 * quietly leaving the manifest out of the export.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // The identity the browser keys an installed copy on. Pinned to the base
    // path so a copy installed from the project page isn't confused with one
    // served from a root domain.
    id: `${basePath}/`,
    name: "Drum Machine",
    short_name: "Drum Machine",
    description: "A 16-step drum sequencer that runs entirely offline",
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    // No `orientation` on purpose. The layout has a mobile arrangement of its
    // own, so pinning installed copies to landscape would override it on a
    // phone held upright rather than help anyone.
    // The theme follows the system or the user's pick, so neither of these can
    // track it. Both are the Classic dark surface, which is what the icon is
    // drawn on — the splash then reads as an extension of the icon rather than
    // as a white flash before a dark app.
    background_color: "#171717",
    theme_color: "#171717",
    categories: ["music", "entertainment"],
    icons: [
      {
        src: `${basePath}/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Kept separate from the icons above rather than declared "any maskable"
      // on one of them: a maskable icon is padded for cropping, so reusing it
      // unmasked would render the grid noticeably small everywhere else.
      {
        src: `${basePath}/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
