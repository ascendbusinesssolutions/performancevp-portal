import { createHash } from "node:crypto";

/**
 * Sending campaign mail (Milestone 5 plan, 5.2). One interface, two transports: Resend's HTTP API on
 * staging and production (no SDK; batches of up to 100 with an idempotency key, paced under the
 * account's request limit), and, when APP_ENV is local, the local stack's Mailpit through its HTTP
 * send API, so the end-to-end tests read survey links as they read sign-in codes. Mailpit is the
 * local mail catcher, not a second provider. Bodies are rendered at send time and never stored.
 * Nothing here logs an address, a link or a body.
 */

export const FROM_ADDRESS = "surveys@performancevp.com.au";

export interface Email {
  /** The outbox row, which is also the idempotency key for a single send. */
  key: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type Outcome =
  | { key: string; ok: true; id: string }
  | { key: string; ok: false; permanent: boolean; error: string };

type Fetch = typeof fetch;

export interface Transport {
  send(emails: readonly Email[]): Promise<Outcome[]>;
}

const RESEND = "https://api.resend.com";
const BATCH = 100;
/** Resend's default is two requests a second; stay under it. */
const PACE_MS = 600;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function failure(key: string, status: number, error: string): Outcome {
  // A refused request (the address, the content) will not succeed on retry; a limit or an outage may.
  const permanent = status >= 400 && status < 500 && status !== 408 && status !== 429;
  return { key, ok: false, permanent, error };
}

export function resendTransport(
  apiKey: string,
  fromName: string,
  fetchFn: Fetch = fetch,
): Transport {
  const from = `${fromName} <${FROM_ADDRESS}>`;
  const headers = (idempotencyKey: string) => ({
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  });
  const body = (e: Email) => ({ from, to: [e.to], subject: e.subject, text: e.text, html: e.html });

  async function one(email: Email): Promise<Outcome> {
    const response = await fetchFn(`${RESEND}/emails`, {
      method: "POST",
      headers: headers(`outbox-${email.key}`),
      body: JSON.stringify(body(email)),
    });
    if (!response.ok) return failure(email.key, response.status, `resend_${response.status}`);
    const json = (await response.json()) as { id?: string };
    return { key: email.key, ok: true, id: json.id ?? "" };
  }

  return {
    async send(emails) {
      const outcomes: Outcome[] = [];
      for (let start = 0; start < emails.length; start += BATCH) {
        if (start > 0) await wait(PACE_MS);
        const chunk = emails.slice(start, start + BATCH);
        const key = createHash("sha256")
          .update(chunk.map((e) => e.key).join(","))
          .digest("hex");
        const response = await fetchFn(`${RESEND}/emails/batch`, {
          method: "POST",
          headers: headers(`batch-${key}`),
          body: JSON.stringify(chunk.map(body)),
        });
        if (response.ok) {
          const json = (await response.json()) as { data?: Array<{ id: string }> };
          chunk.forEach((e, i) =>
            outcomes.push({ key: e.key, ok: true, id: json.data?.[i]?.id ?? "" }),
          );
          continue;
        }
        if (response.status === 422 || response.status === 400) {
          // One address refused refuses the batch: send each on its own to find it.
          for (const email of chunk) {
            await wait(PACE_MS);
            outcomes.push(await one(email));
          }
          continue;
        }
        for (const e of chunk)
          outcomes.push(failure(e.key, response.status, `resend_${response.status}`));
      }
      return outcomes;
    },
  };
}

export function mailpitTransport(
  baseUrl: string,
  fromName: string,
  fetchFn: Fetch = fetch,
): Transport {
  return {
    async send(emails) {
      const outcomes: Outcome[] = [];
      for (const e of emails) {
        const response = await fetchFn(`${baseUrl}/api/v1/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            From: { Email: FROM_ADDRESS, Name: fromName },
            To: [{ Email: e.to }],
            Subject: e.subject,
            Text: e.text,
            HTML: e.html,
          }),
        });
        if (!response.ok) {
          outcomes.push(failure(e.key, response.status, `mailpit_${response.status}`));
          continue;
        }
        const json = (await response.json()) as { ID?: string };
        outcomes.push({ key: e.key, ok: true, id: json.ID ?? "" });
      }
      return outcomes;
    },
  };
}
