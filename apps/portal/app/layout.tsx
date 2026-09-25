import type { Metadata } from "next";
import localFont from "next/font/local";

import { HydrationMark } from "@/components/hydration-mark";

import "./globals.css";

// The same three families as the marketing site, self-hosted from app/fonts (latin subset, each
// family's OFL licence beside its files), so the build fetches nothing. They are exposed as the CSS
// variables that globals.css maps to the Tailwind font tokens.
const spectral = localFont({
  src: [
    { path: "./fonts/spectral/spectral-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/spectral/spectral-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/spectral/spectral-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/spectral/spectral-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-spectral",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const plexSans = localFont({
  src: [
    {
      path: "./fonts/ibm-plex-sans/ibm-plex-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans/ibm-plex-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans/ibm-plex-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans/ibm-plex-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = localFont({
  src: [
    {
      path: "./fonts/ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-mono/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-mono/ibm-plex-mono-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

// Every page renders per request: the content security policy carries a fresh nonce (proxy.ts),
// which a prerendered page could not include, and every page depends on the signed-in session.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PerformanceVP",
  description: "The PerformanceVP online subscription portal.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${spectral.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <HydrationMark />
      </body>
    </html>
  );
}
