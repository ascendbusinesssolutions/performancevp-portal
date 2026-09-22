import type { NextConfig } from "next";

// A baseline every response carries. The portal is never indexed, never framed and never
// leaks a referrer. A content security policy is planned with the security model in
// Milestone 3, once the set of origins the application talks to is known.
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
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
