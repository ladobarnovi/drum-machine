/**
 * Serves the static export on http://localhost:3001.
 *
 * `next start` cannot run against `output: "export"`, and the offline worker is
 * only registered in production builds — so without something like this there
 * is no way to see the installed app behave the way it will once deployed.
 * Deliberately dependency-free and deliberately not a production server: it
 * exists to answer "does the export actually work", including with devtools
 * switched to offline.
 *
 * Run `npm run build` first, then `npm run serve`.
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "out");
const PORT = Number(process.env.PORT ?? 3001);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
};

if (!existsSync(OUT_DIR)) {
  throw new Error(`${OUT_DIR} does not exist. Run \`npm run build\` first.`);
}

createServer((request, response) => {
  // The query string is a cache-buster on some of what Next emits, never a
  // parameter, so the path alone decides what is served.
  const { pathname } = new URL(request.url, `http://localhost:${PORT}`);

  // `normalize` after decoding is what stops `..` in a request from reaching
  // outside the export. Not a security boundary anyone should lean on, but a
  // local server should still not hand out the rest of the disk.
  const relative = normalize(decodeURIComponent(pathname)).replace(
    /^([/\\])+/,
    "",
  );
  if (relative.startsWith("..")) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  let file = join(OUT_DIR, relative);
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, "index.html");
  }

  if (!existsSync(file)) {
    // Matches how a static host behaves, which is what the app is built for.
    const notFound = join(OUT_DIR, "404.html");
    if (existsSync(notFound)) {
      response.writeHead(404, { "content-type": CONTENT_TYPES[".html"] });
      createReadStream(notFound).pipe(response);
      return;
    }
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type":
      CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    // No caching at all, so a rebuild is visible on reload and the only thing
    // serving stale bytes is the service worker — which is the thing under test.
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
}).listen(PORT, () => {
  console.log(`Serving ./out on http://localhost:${PORT}`);
});
