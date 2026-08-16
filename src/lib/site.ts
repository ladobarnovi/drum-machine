/**
 * The facts about where this app lives, in one place, because three separate
 * consumers need them and disagreeing is silent: `metadataBase` in the root
 * layout, the sitemap, and the JSON-LD block on the page.
 *
 * Everything here has to be an absolute, production URL. Metadata is read by
 * crawlers and by whatever unfurls a shared link, neither of which is on this
 * machine — a relative path or a localhost origin in an `og:image` is simply a
 * broken preview.
 */

/**
 * The deployed origin. Split from the base path below because the two change
 * independently: pointing a custom domain at this repo replaces the origin and
 * empties the base path at the same time.
 */
const origin =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://ladobarnovi.github.io";

/**
 * Set by the Pages workflow to the project-page subpath, exactly as it is for
 * the manifest. Empty in dev and for a user/org page or custom domain.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Where the app answers, with no trailing slash — `metadataBase` composes
 * relative paths onto this, and a trailing slash there would double up.
 *
 * Note this stays the *production* URL during `npm run dev`. That is on
 * purpose: a canonical tag naming localhost would be worse than useless if it
 * ever escaped into a build.
 */
export const SITE_URL = `${origin}${basePath}`;

/**
 * The canonical address of the one page, with the trailing slash. GitHub Pages
 * serves a directory index and redirects the slashless form to it, so naming
 * the redirect target here saves crawlers a hop and keeps the canonical tag
 * pointing at the URL that actually returns 200.
 */
export const CANONICAL_URL = `${SITE_URL}/`;

export const SITE_NAME = "Drum Machine";

/**
 * Kept under ~160 characters so search results show it whole rather than
 * cutting it mid-feature, and front-loaded with what someone would actually
 * type into a search box.
 */
export const SITE_DESCRIPTION =
  "Free 16-step drum sequencer that runs in your browser. 909 and 808 kits, per-channel pitch, filter, envelope and LFO, plus delay, reverb and drive. Works offline.";
