import DrumMachine from "@/components/DrumMachine";
import { CANONICAL_URL, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Structured data, saying in a machine-readable way what the `<meta>` tags only
 * imply: that this is a free, installable music application rather than an
 * article about one. It is what lets a search engine or an assistant answer
 * "is there a free drum machine I can use in the browser" with this page, and
 * the `offers` block at price 0 is specifically what substantiates
 * the "free" part rather than leaving it as a claim in the description.
 *
 * Rendered as a plain `<script>` per the Next guidance — JSON-LD is data, not
 * code to be scheduled, so `next/script` has nothing to contribute.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: CANONICAL_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "MultimediaApplication",
  applicationSubCategory: "Music Sequencer",
  operatingSystem: "Any modern browser",
  browserRequirements: "Requires JavaScript and the Web Audio API",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "16 channels with up to 64 steps each",
    "909 and 808 sample kits included",
    "Per-channel pitch, low cut, high cut, attack and decay",
    "Per-channel LFO modulation",
    "Master drive, filter, delay, reverb and phaser",
    "Swing and adjustable tempo",
    "Channel choke groups",
    "Pattern snapshots",
    "Works offline as an installable web app",
  ],
};

export default function Home() {
  return (
    <main className="bg-surface min-h-screen">
      {/*
        `JSON.stringify` does not escape HTML, so a `<` reaching the page inside
        a string would close this script early. Nothing here is user-supplied
        today, but the substitution is what keeps that true if anything ever is.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <DrumMachine />
    </main>
  );
}
