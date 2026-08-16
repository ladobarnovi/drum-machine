import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site";

/**
 * The card that shows when a link to the app is pasted into Slack, iMessage,
 * Discord or anywhere else that unfurls. Without one those all fall back to a
 * bare link, and Google has nothing to run full width beside a result.
 *
 * Drawn here rather than shipped as a PNG so it stays in step with the app's
 * Classic palette by construction, and so there is no binary to regenerate by
 * hand. `next/og` renders it once at build time — it is a static file in
 * `out/` by the time anything asks for it, which is what makes it work under
 * `output: "export"` with no server in the picture.
 */

/**
 * Same story as the manifest and the sitemap: the image is a Route Handler, and
 * `output: "export"` rejects it outright unless it is told the route is static.
 * Being generated at build time by default is not enough on its own.
 */
export const dynamic = "force-static";

export const alt =
  "Drum Machine — a free 16-step drum sequencer that runs in the browser";

/** The size every unfurler expects; anything else gets letterboxed or cropped. */
export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

/** Classic's dark surface and orange accent, copied from `globals.css`. */
const SURFACE = "#171717";
const ACCENT = "#f97316";
const FOREGROUND = "#fafafa";
const MUTED = "#a3a3a3";
const STEP_OFF = "#2e2e2e";

/**
 * A 16-step row with the four-on-the-floor kick lit, so the card shows the
 * thing the app does rather than a wordmark. Beats land on 0, 4, 8 and 12.
 */
const STEPS = Array.from({ length: 16 }, (_, index) => index % 4 === 0);

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: SURFACE,
        padding: "80px",
        // Satori has no default font stack of its own to fall back on, so
        // naming a common one keeps the text from rendering as boxes.
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 78,
          fontWeight: 700,
          color: FOREGROUND,
          letterSpacing: "-0.03em",
        }}
      >
        {SITE_NAME}
      </div>
      <div style={{ fontSize: 34, color: MUTED, marginTop: 20 }}>
        A free 16-step drum sequencer, right in the browser
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 64 }}>
        {STEPS.map((on, index) => (
          <div
            key={index}
            style={{
              width: 54,
              height: 54,
              borderRadius: 10,
              background: on ? ACCENT : STEP_OFF,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 26, color: MUTED, marginTop: 52 }}>
        909 &amp; 808 kits · pitch, filter, LFO · delay, reverb, drive · offline
      </div>
    </div>,
    size,
  );
}
