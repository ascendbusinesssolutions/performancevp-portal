import { createClient } from "@supabase/supabase-js";
import { generateSync } from "otplib";
import { Client } from "pg";

/** Local stack addresses (supabase/config.toml) and the dev seed's shared password. */
export const DB_URL =
  process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
export const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:55324";
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:55321";
export const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
export const PASSWORD = "Portal-local-2026";

export async function sql<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const result = await client.query(text, values);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

/**
 * Returns the given seed personas to their starting state: no second factor, no session, and the
 * seed password (where they have one), so each test starts clean.
 */
export async function resetPersonas(emails: string[]): Promise<void> {
  await sql(
    `update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf'))
     where email = any($1) and encrypted_password <> '';`,
    [emails, PASSWORD],
  );
  await sql(
    `delete from auth.mfa_factors where user_id in (select id from auth.users where email = any($1));`,
    [emails],
  );
  await sql(
    `delete from auth.sessions where user_id in (select id from auth.users where email = any($1));`,
    [emails],
  );
}

export async function clearMail(): Promise<void> {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
}

/** The six-digit code in the newest email to an address, waiting briefly for it to arrive. */
export async function latestCode(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const { messages } = (await search.json()) as { messages: Array<{ ID: string }> };
    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
      const { Text, HTML } = (await message.json()) as { Text: string; HTML: string };
      const match = /\b(\d{6})\b/.exec(`${Text} ${HTML}`);
      if (match) return match[1]!;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no code arrived for ${email}`);
}

/**
 * A TOTP code from a secret. Waits until the current 30-second window has at least five seconds
 * left, and optionally moves past a window already used (Supabase refuses a code twice).
 */
export async function totp(
  secret: string,
  after?: number,
): Promise<{ code: string; window: number }> {
  for (;;) {
    const now = Date.now() / 1000;
    const window = Math.floor(now / 30);
    if (30 - (now % 30) >= 5 && (after === undefined || window > after)) {
      return { code: generateSync({ secret, epoch: now }), window };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/** A Supabase client in Node, for checks made against the API rather than through the pages. */
export function apiClient() {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The set-password link in the newest email to an address, as a path on this site. */
export async function latestLink(email: string, type: "recovery" | "invite"): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const { messages } = (await search.json()) as { messages: Array<{ ID: string }> };
    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
      const { HTML } = (await message.json()) as { HTML: string };
      const match = new RegExp(`/auth/confirm\\?token_hash=([^&"]+)&(?:amp;)?type=${type}`).exec(
        HTML,
      );
      if (match) return `/auth/confirm?token_hash=${match[1]}&type=${type}`;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no ${type} link arrived for ${email}`);
}
