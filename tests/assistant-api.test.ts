import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as extract } from "../app/api/extract/route.ts";
import { POST as transcribe } from "../app/api/transcribe/route.ts";
import { GET as jobs } from "../app/api/jobs/route.ts";
import {
  geminiText,
  guardRequest,
  providerFetch,
} from "../lib/assistant-server.ts";
import { extractRequirements } from "../lib/extract-service.ts";
import { transcribeAudio } from "../lib/transcribe-service.ts";
const headers = {
  origin: "http://localhost:3000",
  "x-quote-assistant": "1",
  "content-type": "application/json",
};
const req = (body: unknown, extra = {}) =>
  new Request("http://localhost:3000/api/extract", {
    method: "POST",
    headers: { ...headers, ...extra },
    body: JSON.stringify(body),
  });
const data = {
  customer: "Ahmed",
  phone: "",
  notes: "",
  windows: [{ room: "Lounge", widthCm: 243, heightCm: 400, style: "Wavy" }],
  warnings: [],
};
test("protected endpoints fail closed before provider access when accounts are missing", async () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const oldFetch = globalThis.fetch;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      throw new Error("must not call");
    };
    assert.equal((await extract(req({ text: "hello" }))).status, 503);
    assert.equal((await transcribe(req({ text: "hello" }))).status, 503);
    assert.equal(
      (await jobs(new Request("http://localhost:3000/api/jobs"))).status,
      503,
    );
    assert.equal(
      (
        await extract(
          req({ text: "hello" }, { origin: "https://other.example" }),
        )
      ).status,
      403,
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
test("Gemini service contract validates extraction and sends inline audio without live calls", async () => {
  const oldKey = process.env.GEMINI_API_KEY;
  const oldFetch = globalThis.fetch;
  try {
    process.env.GEMINI_API_KEY = "test-key-not-real";
    globalThis.fetch = async (url, options) => {
      assert.ok(
        String(url).startsWith("https://generativelanguage.googleapis.com/"),
      );
      assert.equal(
        (options?.headers as Record<string, string>)["x-goog-api-key"],
        "test-key-not-real",
      );
      const body = JSON.parse(options?.body as string);
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(data) }] },
          },
        ],
      });
    };
    assert.deepEqual(
      await extractRequirements(
        "one lounge window 243 cm wide and 400 cm high, Wavy",
      ),
      data,
    );
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options?.body as string);
      assert.equal(body.contents[0].parts[1].inlineData.mimeType, "audio/m4a");
      assert.equal(
        Buffer.from(body.contents[0].parts[1].inlineData.data, "base64").length,
        32,
      );
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '{"text":"Ahmed needs a curtain."}' }] },
          },
        ],
      });
    };
    assert.equal(
      await transcribeAudio(
        new File([new Uint8Array(32)], "clip", { type: "audio/mp4" }),
      ),
      "Ahmed needs a curtain.",
    );
    globalThis.fetch = async () => {
      throw new DOMException("test timeout", "TimeoutError");
    };
    await assert.rejects(
      () => providerFetch("gemini-3.8-flash", {}),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 504,
    );
    globalThis.fetch = async () => Response.json({}, { status: 429 });
    await assert.rejects(() => extractRequirements("test"), /busy|limit/);
    globalThis.fetch = async () =>
      Response.json({
        candidates: [
          { finishReason: "STOP", content: { parts: [{ text: "{}" }] } },
        ],
      });
    await assert.rejects(() => extractRequirements("test"), /Invalid/);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  }
});
test("Gemini parser rejects incomplete results and excludes thinking", () => {
  assert.throws(() =>
    geminiText({
      candidates: [
        {
          finishReason: "MAX_TOKENS",
          content: { parts: [{ text: "partial" }] },
        },
      ],
    }),
  );
  assert.throws(() =>
    geminiText({ promptFeedback: { blockReason: "SAFETY" } }),
  );
  assert.throws(() => geminiText({}));
  assert.equal(
    geminiText({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { thought: true, text: "private reasoning" },
              { text: "result" },
            ],
          },
        },
      ],
    }),
    "result",
  );
});
test("origin guard accepts loopback aliases, blocks other origins and ports", () => {
  const local = (origin: string) =>
    new Request("http://localhost:3000/api/extract", {
      method: "POST",
      headers: { origin, "x-quote-assistant": "1" },
    });
  for (const origin of [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://[::1]:3000",
  ])
    assert.doesNotThrow(() => guardRequest(local(origin)));
  for (const origin of [
    "http://127.0.0.1:3001",
    "https://localhost:3000",
    "https://other.example",
    "http://localhost.evil.example:3000",
    "null",
  ])
    assert.throws(() => guardRequest(local(origin)));
  assert.throws(() =>
    guardRequest(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        headers: { origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
});
test("configured authentication rejects requests without a verified session", async () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    assert.equal(
      (await jobs(new Request("http://localhost:3000/api/jobs"))).status,
      401,
    );
    assert.equal((await extract(req({ text: "test" }))).status, 401);
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
