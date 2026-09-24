import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Survey tokens and start stamps (Milestone 5 plan, 4.1 and 4.2; D4).
 *
 * A token is `v1.` and the base64url HMAC-SHA256, under a key derived from SURVEY_TOKEN_SECRET, of
 * an invitation's id and salt. `v1` names the key, so the secret can change between campaigns. The
 * database holds only a token's SHA-256 (the live token, deleted when used) and never the secret,
 * so it cannot compute a token or map a hash back to an invitation.
 *
 * A start stamp records when a survey was opened, signed under a second derived key and bound to
 * the token's hash, its audience and an expiry, so the completion time the speed check reads comes
 * from the server's clock and cannot be forged by the page. Pure: the secret and the time are
 * passed in.
 */

const VERSION = "v1";
const TOKEN = /^v1\.[A-Za-z0-9_-]{43}$/;

function derivedKey(secret: string, label: string): Buffer {
  return createHmac("sha256", secret).update(`performancevp:${label}`).digest();
}

export function surveyToken(secret: string, invitationId: string, salt: string): string {
  const mac = createHmac("sha256", derivedKey(secret, "survey-token"))
    .update(`${invitationId}:${salt}`)
    .digest("base64url");
  return `${VERSION}.${mac}`;
}

/** What the database stores and looks a token up by. */
export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN.test(value);
}

interface StampBody {
  /** The token's hash. */
  h: string;
  /** The audience. */
  a: string;
  /** Issued, in whole seconds since the epoch. */
  t: number;
  /** Expires, in whole seconds since the epoch. */
  e: number;
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", derivedKey(secret, "start-stamp")).update(body).digest("base64url");
}

export function issueStamp(
  secret: string,
  hash: string,
  audience: string,
  now: Date,
  expires: Date,
): string {
  const body: StampBody = {
    h: hash,
    a: audience,
    t: Math.floor(now.getTime() / 1000),
    e: Math.floor(expires.getTime() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${sign(secret, encoded)}`;
}

/**
 * The whole seconds since the survey was opened, or null where the stamp is forged, expired, from
 * the future, or issued for another token or audience.
 */
export function stampSeconds(
  secret: string,
  stamp: unknown,
  hash: string,
  audience: string,
  now: Date,
): number | null {
  if (typeof stamp !== "string" || stamp.length > 1024) return null;
  const [encoded, mac, ...rest] = stamp.split(".");
  if (!encoded || !mac || rest.length > 0) return null;
  const expected = Buffer.from(sign(secret, encoded));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let body: StampBody;
  try {
    body = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as StampBody;
  } catch {
    return null;
  }
  const seconds = Math.floor(now.getTime() / 1000);
  if (body.h !== hash || body.a !== audience) return null;
  if (!Number.isInteger(body.t) || !Number.isInteger(body.e)) return null;
  if (seconds > body.e || body.t > seconds) return null;
  return seconds - body.t;
}
