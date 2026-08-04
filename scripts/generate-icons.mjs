/**
 * Draws the app icons and writes them out as PNGs.
 *
 * The icon is the machine itself in miniature: a 4x4 grid of pads on the dark
 * neutral the Classic theme uses, with a pattern lit in the accent orange. It
 * is drawn here rather than checked in as art so the palette can be kept in
 * step with `globals.css` by editing one line, and so the maskable and Apple
 * variants — which differ only in padding and corner treatment — cannot drift
 * apart from the plain one.
 *
 * Run with `npm run icons` after changing anything below. There is no image
 * library involved: PNG is a container around zlib-deflated scanlines, and
 * writing those directly costs less than a dependency does.
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Kept in step with the Classic palette in `src/app/globals.css`. */
const BACKGROUND = "#171717";
const PAD_OFF = "#3a3a3a";
const PAD_ON = "#f97316";

/**
 * Which pads are lit. Sixteen steps in a square rather than a line — a real
 * pattern, so the icon reads as a sequencer and not as a checkerboard.
 */
const PATTERN = [
  [1, 0, 1, 0],
  [0, 0, 1, 0],
  [1, 1, 0, 0],
  [0, 1, 0, 1],
];

/**
 * Samples per pixel per axis. The whole icon is edges — sixteen rounded squares
 * plus the outer corner — and at 32px in a browser tab an aliased edge is the
 * only thing anyone would notice about it.
 */
const SUPERSAMPLE = 4;

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typed = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));

  return Buffer.concat([length, typed, crc]);
}

/** Encodes straight RGBA bytes as a colour-type-6, 8-bit PNG. */
function encodePng(size, rgba) {
  const stride = size * 4;
  // Every scanline carries a leading filter byte; 0 means "store as-is", which
  // costs a little size and saves implementing the five filter types.
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha
  // The three zero bytes that follow are compression, filter and interlace
  // method, each of which has exactly one legal value.

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function parseColor(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Whether a point falls inside a rounded rectangle. All arguments are in the
 * 0..1 space the shapes are described in, so the same numbers drive every size.
 */
function insideRoundedRect(px, py, x, y, w, h, radius) {
  if (px < x || px > x + w || py < y || py > y + h) return false;

  // Clamping the point into the rectangle the four corner circles are centred
  // on turns the whole test into a single distance check: anywhere along the
  // straight edges the clamp is a no-op and the distance comes out zero.
  const cx = Math.min(Math.max(px, x + radius), x + w - radius);
  const cy = Math.min(Math.max(py, y + radius), y + h - radius);
  const dx = px - cx;
  const dy = py - cy;

  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Paints `shape` over the canvas in `color`, using coverage from supersampling
 * as the alpha. Shapes are painted back to front and composited normally, so a
 * pad laid over the background blends against it at its edges.
 */
function paint(canvas, size, shape, color) {
  const [r, g, b] = parseColor(color);
  const step = 1 / (size * SUPERSAMPLE);
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = (x * SUPERSAMPLE + sx + 0.5) * step;
          const py = (y * SUPERSAMPLE + sy + 0.5) * step;
          if (shape(px, py)) hits += 1;
        }
      }

      if (hits === 0) continue;

      const alpha = hits / samples;
      const i = (y * size + x) * 4;
      const under = canvas[i + 3] / 255;
      // Source-over, carried out on straight (un-premultiplied) values.
      const out = alpha + under * (1 - alpha);
      canvas[i] = Math.round(
        (r * alpha + canvas[i] * under * (1 - alpha)) / out,
      );
      canvas[i + 1] = Math.round(
        (g * alpha + canvas[i + 1] * under * (1 - alpha)) / out,
      );
      canvas[i + 2] = Math.round(
        (b * alpha + canvas[i + 2] * under * (1 - alpha)) / out,
      );
      canvas[i + 3] = Math.round(out * 255);
    }
  }
}

/**
 * Renders one icon.
 *
 * `inset` is how much clear space is left round the grid, and `cornerRadius`
 * how far the background itself is rounded — the two knobs that separate the
 * variants. A maskable icon is padded so the platform can crop it to whatever
 * silhouette it likes; an Apple icon is left square because iOS rounds it.
 */
function renderIcon(size, { inset, cornerRadius }) {
  const canvas = Buffer.alloc(size * size * 4);

  paint(
    canvas,
    size,
    (x, y) => insideRoundedRect(x, y, 0, 0, 1, 1, cornerRadius),
    BACKGROUND,
  );

  const columns = PATTERN[0].length;
  const rows = PATTERN.length;
  const cell = (1 - inset * 2) / columns;
  const pad = cell * 0.82;
  const gap = (cell - pad) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = inset + column * cell + gap;
      const y = inset + row * cell + gap;
      paint(
        canvas,
        size,
        (px, py) => insideRoundedRect(px, py, x, y, pad, pad, pad * 0.24),
        PATTERN[row][column] ? PAD_ON : PAD_OFF,
      );
    }
  }

  return encodePng(size, canvas);
}

// ---------------------------------------------------------------------------

const ICONS = [
  // Picked up by Next's `icon`/`apple-icon` file conventions, which emit the
  // <link> tags — and prefix the deployed base path — on their own.
  { path: "src/app/icon.png", size: 192, inset: 0.17, cornerRadius: 0.22 },
  { path: "src/app/apple-icon.png", size: 180, inset: 0.2, cornerRadius: 0 },
  // Referenced by the web app manifest, so these have to sit at a stable URL
  // under `public/` rather than behind a content hash.
  { path: "public/icon-192.png", size: 192, inset: 0.17, cornerRadius: 0.22 },
  { path: "public/icon-512.png", size: 512, inset: 0.17, cornerRadius: 0.22 },
  // Full bleed, with the grid pulled inside the safe circle the spec guarantees
  // a maskable icon keeps: 80% of the width, so 10% of clear space is not
  // enough once the corners are cropped away.
  {
    path: "public/icon-maskable-512.png",
    size: 512,
    inset: 0.26,
    cornerRadius: 0,
  },
];

for (const { path, size, inset, cornerRadius } of ICONS) {
  const file = join(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderIcon(size, { inset, cornerRadius }));
  console.log(`wrote ${path} (${size}x${size})`);
}
