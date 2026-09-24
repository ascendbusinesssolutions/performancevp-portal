import type { NextConfig } from "next";

// A baseline every response carries. The portal is never indexed, never framed and never
// leaks a referrer. The content security policy, which needs a fresh nonce per request, is set
// in proxy.ts (lib/security/csp.ts).
const securityHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The three pure packages are consumed as TypeScript source, so there is no build output to go stale.
  transpilePackages: [
    "@performancevp/engine",
    "@performancevp/intake",
    "@performancevp/recommendations",
  ],
  poweredByHeader: false,
  async headers() {
    // The anonymous survey sends no referrer at all and is never cached (Milestone 5 plan, 4.2);
    // listed last, so these override the baseline.
    const survey = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
    ];
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/s", headers: survey },
      { source: "/api/survey/:path*", headers: survey },
    ];
  },
};

export default nextConfig;
