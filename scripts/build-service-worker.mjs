/**
 * Fills in the precache manifest inside the exported `sw.js`.
 *
 * Runs as `postbuild`, so it sees what `next build` actually emitted — which is
 * the point: the static chunks are content-hashed, so the list of things to
 * cache cannot be written by hand and cannot be known until the build is over.
 * Reading the output directory also means nothing has to be kept in step by
 * hand as the app grows; a sample added to `public/` is simply in the export,
 * and so is in the manifest.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "out");

/** Must match `basePath` in `next.config.ts`, which reads the same variable. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * `opengraph-image.tsx` is a Route Handler, so Next exports it as an
 * extensionless `opengraph-image` file rather than as `opengraph-image.png` —
 * fine for a server that sets `Content-Type` itself, but GitHub Pages types a
 * response from the file extension alone and would serve this as
 * `application/octet-stream`. The stricter unfurlers (X, LinkedIn) discard an
 * image with that type outright, so the file is renamed here, before the
 * service worker's precache list is built from `out/`. `fixOgImageReferences`
 * below then repoints the `<meta>` tags at the renamed file, since Next wrote
 * them against the pre-rename URL and renaming on disk doesn't reach back into
 * HTML that's already been emitted.
 */
const ogImagePath = join(OUT_DIR, "opengraph-image");
if (existsSync(ogImagePath)) {
  renameSync(ogImagePath, `${ogImagePath}.png`);
}

function listFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }

  return files;
}

/**
 * Next still writes every `og:image`/`twitter:image` tag, and the equivalent
 * RSC payload text, pointing at the pre-rename `opengraph-image?<hash>` URL —
 * renaming the file on disk doesn't reach back into the HTML it already
 * emitted. Patched by hand in every exported HTML and prerendered-text file,
 * since a meta tag naming a URL the host serves as `application/octet-stream`
 * is worse than not having one: several unfurlers discard it outright rather
 * than falling back to a plain link.
 */
function fixOgImageReferences() {
  const TEXT_FILE_PATTERN = /\.(html|txt|xml)$/;

  for (const file of listFiles(OUT_DIR)) {
    if (!TEXT_FILE_PATTERN.test(file)) continue;

    const content = readFileSync(file, "utf8");
    const fixed = content.replaceAll(
      "opengraph-image?",
      "opengraph-image.png?",
    );
    if (fixed !== content) {
      writeFileSync(file, fixed);
    }
  }
}

fixOgImageReferences();

/**
 * Files in the export that must not be precached.
 *
 * The worker cannot be allowed to serve itself from its own cache — that is how
 * a bad deploy becomes permanent, since the browser would never see a new one.
 * Source maps are excluded because they are large and only ever fetched by
 * devtools, which nobody has open offline.
 */
function isExcluded(relativePath) {
  return (
    relativePath === "sw.js" ||
    relativePath.endsWith(".map") ||
    // Emitted for the Pages-era build manifest; not something the app fetches.
    relativePath.startsWith("_next/static/development/") ||
    relativePath.split("/").some((segment) => segment.startsWith("."))
  );
}

/**
 * The URL the browser will actually request a file at.
 *
 * Segments are encoded because the samples have spaces in their names, and a
 * precached URL only serves a request if the two strings match exactly —
 * `presetSlotUrl` encodes them the same way at the other end.
 */
function toUrl(relativePath) {
  const segments = relativePath.split("/");

  // A static host answers the directory URL with its `index.html`, and that
  // directory URL — not the filename — is what a navigation asks for.
  if (segments.at(-1) === "index.html") {
    segments.pop();
    return `${BASE_PATH}/${segments.map(encodeURIComponent).join("/")}${
      segments.length > 0 ? "/" : ""
    }`;
  }

  return `${BASE_PATH}/${segments.map(encodeURIComponent).join("/")}`;
}

const files = listFiles(OUT_DIR)
  .map((file) => ({
    relativePath: relative(OUT_DIR, file).split(sep).join(posix.sep),
    file,
  }))
  .filter(({ relativePath }) => !isExcluded(relativePath))
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

if (files.length === 0) {
  throw new Error(
    `No files found in ${OUT_DIR}. Run this after \`next build\`, not before.`,
  );
}

// Hashing the contents rather than taking a timestamp keeps the cache name
// stable across rebuilds that changed nothing, so a redeploy of identical
// output doesn't make every installed copy download the app again.
const version = createHash("sha256");
const urls = [];

for (const { relativePath, file } of files) {
  const url = toUrl(relativePath);
  urls.push(url);
  version.update(url);
  version.update(createHash("sha256").update(readFileSync(file)).digest());
}

const startUrl = `${BASE_PATH}/`;

if (!urls.includes(startUrl)) {
  throw new Error(
    `The export has no index.html at its root, so ${startUrl} cannot be cached ` +
      `and the app would not open offline.`,
  );
}

const workerPath = join(OUT_DIR, "sw.js");
let source = readFileSync(workerPath, "utf8");

const replacements = [
  ["__BUILD_ID__", version.digest("hex").slice(0, 16)],
  ["__PRECACHE_URLS__", JSON.stringify(urls, null, 2)],
  ["__START_URL__", startUrl],
];

for (const [placeholder, value] of replacements) {
  if (!source.includes(placeholder)) {
    throw new Error(
      `${placeholder} is missing from public/sw.js — the worker would ship ` +
        `without a precache manifest and the app would not work offline.`,
    );
  }
  source = source.replace(placeholder, value);
}

writeFileSync(workerPath, source);

const bytes = files.reduce(
  (total, { file }) => total + readFileSync(file).byteLength,
  0,
);

console.log(
  `sw.js: precaching ${urls.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB)` +
    `${BASE_PATH ? ` under ${BASE_PATH}` : ""}`,
);
