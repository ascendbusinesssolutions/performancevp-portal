import { describe, expect, it, vi } from "vitest";

import { retryingFetch } from "./fetch";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const FUTURE = { code: "PGRST303", message: "JWT issued at future", details: null, hint: null };

describe("the request retry for a token issued within the second", () => {
  it("repeats a request once when PostgREST refuses a token as issued in the future", async () => {
    const base = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(401, FUTURE))
      .mockResolvedValueOnce(json(200, [1]));
    const wait = vi.fn(async () => {});
    const response = await retryingFetch(base, wait)("http://api/rest/v1/rpc/my_access", {
      method: "POST",
      body: "{}",
    });
    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
    expect(base.mock.calls[1]).toEqual(base.mock.calls[0]);
    expect(wait).toHaveBeenCalledWith(1100);
  });

  it("repeats it only once", async () => {
    const base = vi.fn<typeof fetch>().mockImplementation(async () => json(401, FUTURE));
    const response = await retryingFetch(base, async () => {})("http://api/rest/v1/x");
    expect(response.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("returns every other refusal and every success as it is", async () => {
    for (const response of [
      json(401, { code: "PGRST303", message: "JWT expired" }),
      json(401, { code: "PGRST301", message: "JWT issued at future" }),
      json(403, FUTURE),
      new Response("not json", { status: 401 }),
      json(200, FUTURE),
    ]) {
      const base = vi.fn<typeof fetch>().mockResolvedValue(response);
      expect(await retryingFetch(base, async () => {})("http://api/x")).toBe(response);
      expect(base).toHaveBeenCalledTimes(1);
    }
  });
});
