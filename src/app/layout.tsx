import type { Metadata } from "next";
import "./globals.css";
import { DEFAULT_THEME_ID, THEME_INIT_SCRIPT } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Drum Machine",
  description: "A simple 16-step drum sequencer",
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
      <body>{children}</body>
    </html>
  );
}
