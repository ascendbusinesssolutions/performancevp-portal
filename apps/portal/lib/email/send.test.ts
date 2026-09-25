import { describe, expect, it } from "vitest";

import { type Email, FROM_ADDRESS, mailpitTransport, resendTransport } from "./send";

function email(key: string, to = `${key}@example.test`): Email {
  return { key, to, subject: "Subject", text: "Text", html: "<p>Text</p>" };
}

interface Call {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/** A fetch that records each call and answers from the given handler. */
function recorder(handler: (call: Call) => { status: number; json?: unknown }) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    const call = {
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string) as unknown,
    };
    calls.push(call);
    const { status, json } = handler(call);
    return new Response(JSON.stringify(json ?? {}), { status });
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

describe("the Resend transport", () => {
  it("sends in batches from the survey address, with an idempotency key", async () => {
    const { calls, fetchFn } = recorder((call) => ({
      status: 200,
      json: { data: (call.body as unknown[]).map((_, i) => ({ id: `id-${i}` })) },
    }));
    const outcomes = await resendTransport("key", "PerformanceVP Surveys", fetchFn).send([
      email("a"),
      email("b"),
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.resend.com/emails/batch");
    expect(calls[0]!.headers.Authorization).toBe("Bearer key");
    expect(calls[0]!.headers["Idempotency-Key"]).toMatch(/^batch-[0-9a-f]{64}$/);
    expect((calls[0]!.body as Array<{ from: string; to: string[] }>)[1]).toMatchObject({
      from: `PerformanceVP Surveys <${FROM_ADDRESS}>`,
      to: ["b@example.test"],
    });
    expect(outcomes).toEqual([
      { key: "a", ok: true, id: "id-0" },
      { key: "b", ok: true, id: "id-1" },
    ]);
  });

  it("finds a refused address by sending the batch one at a time", async () => {
    const { calls, fetchFn } = recorder((call) => {
      if (call.url.endsWith("/batch")) return { status: 422 };
      const to = (call.body as { to: string[] }).to[0];
      return to === "bad@example.test" ? { status: 422 } : { status: 200, json: { id: "one" } };
    });
    const outcomes = await resendTransport("key", "PerformanceVP Surveys", fetchFn).send([
      email("a"),
      email("b", "bad@example.test"),
    ]);
    expect(calls.map((c) => c.url.replace("https://api.resend.com", ""))).toEqual([
      "/emails/batch",
      "/emails",
      "/emails",
    ]);
    expect(calls[2]!.headers["Idempotency-Key"]).toBe("outbox-b");
    expect(outcomes).toEqual([
      { key: "a", ok: true, id: "one" },
      { key: "b", ok: false, permanent: true, error: "resend_422" },
    ]);
  });

  it("treats a limit or an outage as passing", async () => {
    const { fetchFn } = recorder(() => ({ status: 429 }));
    expect(
      await resendTransport("key", "PerformanceVP Surveys", fetchFn).send([email("a")]),
    ).toEqual([{ key: "a", ok: false, permanent: false, error: "resend_429" }]);
  });
});

describe("the Mailpit transport", () => {
  it("posts each email to the local catcher", async () => {
    const { calls, fetchFn } = recorder(() => ({ status: 200, json: { ID: "m1" } }));
    const outcomes = await mailpitTransport(
      "http://mailpit",
      "PerformanceVP Surveys",
      fetchFn,
    ).send([email("a")]);
    expect(calls[0]!.url).toBe("http://mailpit/api/v1/send");
    expect(calls[0]!.body).toMatchObject({
      From: { Email: FROM_ADDRESS, Name: "PerformanceVP Surveys" },
      To: [{ Email: "a@example.test" }],
    });
    expect(outcomes).toEqual([{ key: "a", ok: true, id: "m1" }]);
  });
});
