import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "./csp";

describe("contentSecurityPolicy", () => {
  const production = contentSecurityPolicy("abc", {
    development: false,
    upgradeInsecureRequests: true,
  });

  it("runs scripts only with the nonce", () => {
    expect(production).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(production).not.toContain("unsafe-eval");
    expect(production).not.toContain("unsafe-inline");
  });

  it("talks to no other origin, cannot be framed and posts forms only here", () => {
    expect(production).toContain("connect-src 'self'");
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("form-action 'self'");
    expect(production).toContain("object-src 'none'");
    expect(production).toContain("base-uri 'none'");
    expect(production).toContain("upgrade-insecure-requests");
  });

  it("relaxes only what the development server needs", () => {
    const development = contentSecurityPolicy("abc", {
      development: true,
      upgradeInsecureRequests: false,
    });
    expect(development).toContain("'unsafe-eval'");
    expect(development).toContain("style-src 'self' 'unsafe-inline'");
    expect(development).not.toContain("upgrade-insecure-requests");
  });
});
