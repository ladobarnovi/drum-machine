import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/shell/ServiceWorkerRegistrar";
import {
  CANONICAL_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import { DEFAULT_THEME_ID, THEME_INIT_SCRIPT } from "@/lib/themes";

export const metadata: Metadata = {
  // What every relative URL below is resolved against. It carries the base
  // path, so `opengraph-image` resolves under `/drum-machine` on a project page
  // rather than at the domain root, where it would 404 for every crawler and
  // link unfurler that asked for it.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Drum Machine — Free Online 16-Step Drum Sequencer",
    // There is only one page today, but this is what stops a second one from
    // having to restate the site's name in its own title.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Absolute rather than "/" so it names the URL GitHub Pages actually serves.
  // A canonical pointing at a redirect is a wasted signal.
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: "website",
    url: CANONICAL_URL,
    siteName: SITE_NAME,
    title: "Drum Machine — Free Online 16-Step Drum Sequencer",
    description: SITE_DESCRIPTION,
    locale: "en_US",
    // The image itself is `opengraph-image.tsx`; Next finds it by convention
    // and fills in the URL, dimensions and type from what that file exports.
  },
  twitter: {
    // The large card is the difference between a thumbnail beside the text and
    // a full-width preview, and the OG image is drawn at 1200x630 for it.
    card: "summary_large_image",
    title: "Drum Machine — Free Online 16-Step Drum Sequencer",
    description: SITE_DESCRIPTION,
  },
  // The defaults already permit all of this. Stated anyway because `max-image-preview`
  // is what lets the OG image run full width in a result, and Google assumes
  // the smaller `standard` unless told otherwise.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // iOS does not read the web app manifest. Without this an icon added to the
  // home screen opens Safari with its chrome around it rather than the app on
  // its own, and `display: standalone` in the manifest has no say in it.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // Matches the manifest's `theme_color`, and is what colours the system bars
  // around an installed copy.
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The server has no way of knowing which theme was last picked, so it
    // renders the default and the script below corrects `data-theme` while the
    // head is still being parsed — before the browser has painted anything.
    // `suppressHydrationWarning` is what stops React from undoing that when it
    // hydrates and finds an attribute it did not write.
    <html lang="en" data-theme={DEFAULT_THEME_ID} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
