import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Spectral } from "next/font/google";

import { HydrationMark } from "@/components/hydration-mark";

import "./globals.css";

// The same three families as the marketing site, self-hosted by next/font at build time
// and exposed as the CSS variables that globals.css maps to the Tailwind font tokens.
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
