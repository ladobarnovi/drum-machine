import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/shell/ServiceWorkerRegistrar";
import { DEFAULT_THEME_ID, THEME_INIT_SCRIPT } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Drum Machine",
  description: "A simple 16-step drum sequencer",
  // iOS does not read the web app manifest. Without this an icon added to the
  // home screen opens Safari with its chrome around it rather than the app on
  // its own, and `display: standalone` in the manifest has no say in it.
  appleWebApp: {
    capable: true,
    title: "Drum Machine",
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
