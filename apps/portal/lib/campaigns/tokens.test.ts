import { describe, expect, it } from "vitest";

import { isToken, issueStamp, stampSeconds, surveyToken, tokenHash } from "./tokens";

const SECRET = "test-secret";
const NOW = new Date("2026-09-25T01:00:00Z");
const LATER = new Date("2026-09-25T01:12:30Z");
const CLOSE = new Date("2026-10-08T06:00:00Z");

describe("survey tokens", () => {
  it("derive the same token from the same invitation, and a different one from another", () => {
    const token = surveyToken(SECRET, "inv-1", "salt-1");
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]{43}$/);
    expect(isToken(token)).toBe(true);
    expect(surveyToken(SECRET, "inv-1", "salt-1")).toBe(token);
    expect(surveyToken(SECRET, "inv-1", "salt-2")).not.toBe(token);
    expect(surveyToken(SECRET, "inv-2", "salt-1")).not.toBe(token);
    expect(surveyToken("another-secret", "inv-1", "salt-1")).not.toBe(token);
  });

  it("are looked up by a hash, never stored as themselves", () => {
    const token = surveyToken(SECRET, "inv-1", "salt-1");
    expect(tokenHash(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash(token)).not.toContain(token.slice(3));
  });

  it("reject anything not shaped like one", () => {
    for (const value of ["", "v1.", "v2.abc", `v1.${"a".repeat(42)}`, 42, null]) {
      expect(isToken(value)).toBe(false);
    }
  });
});

describe("start stamps", () => {
  const hash = tokenHash(surveyToken(SECRET, "inv-1", "salt-1"));
  const stamp = issueStamp(SECRET, hash, "members_part_a", NOW, CLOSE);

  it("give the seconds since the survey was opened", () => {
    expect(stampSeconds(SECRET, stamp, hash, "members_part_a", LATER)).toBe(750);
  });

  it("are refused when forged, moved to another token or audience, or expired", () => {
    const [body] = stamp.split(".");
    expect(stampSeconds(SECRET, `${body}.forged`, hash, "members_part_a", LATER)).toBeNull();
    expect(stampSeconds("another-secret", stamp, hash, "members_part_a", LATER)).toBeNull();
    expect(stampSeconds(SECRET, stamp, "other-hash", "members_part_a", LATER)).toBeNull();
    expect(stampSeconds(SECRET, stamp, hash, "members_part_b", LATER)).toBeNull();
    expect(
      stampSeconds(SECRET, stamp, hash, "members_part_a", new Date("2026-10-09T00:00:00Z")),
    ).toBeNull();
    expect(
      stampSeconds(SECRET, stamp, hash, "members_part_a", new Date(NOW.getTime() - 1000)),
    ).toBeNull();
    expect(stampSeconds(SECRET, undefined, hash, "members_part_a", LATER)).toBeNull();
    const edited = Buffer.from(
      JSON.stringify({ h: hash, a: "members_part_a", t: 0, e: 9e9 }),
    ).toString("base64url");
    expect(
      stampSeconds(SECRET, `${edited}.${stamp.split(".")[1]}`, hash, "members_part_a", LATER),
    ).toBeNull();
  });
});
