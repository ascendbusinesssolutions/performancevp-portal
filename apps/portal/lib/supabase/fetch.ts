/**
 * PostgREST refuses a token whose issue time is ahead of its own clock ("JWT issued at future",
 * PGRST303). With the container clocks agreeing to the second, it still refused tokens used within
 * a second of being issued (straight after sign-in, a TOTP challenge or a session refresh), which
 * points to a whole-second comparison against a clock that lags slightly; the page then took the
 * refusal for a missing session. The refusal happens
 * before any query runs, so repeating the request once, after the second has turned, is safe.
 * Any other response is returned as it is.
 */

const RETRY_AFTER_MS = 1100;

type Fetch = typeof fetch;

async function issuedAtFuture(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  const body = (await response
    .clone()
    .json()
    .catch(() => null)) as { code?: unknown; message?: unknown } | null;
  return body?.code === "PGRST303" && String(body.message).includes("issued at future");
}

export function retryingFetch(
  base: Fetch = fetch,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Fetch {
  return async (input, init) => {
    const response = await base(input, init);
    if (!(await issuedAtFuture(response))) return response;
    await wait(RETRY_AFTER_MS);
    return base(input, init);
  };
}
