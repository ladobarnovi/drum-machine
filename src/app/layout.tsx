import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
