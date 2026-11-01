import { test } from "node:test";
import assert from "node:assert/strict";
import { validateJob, validateProfile } from "../lib/job-validation.ts";
import { limitedJson, limitedForm } from "../lib/http.ts";
import { quotationPdf } from "../lib/quotation-pdf.ts";
import { RATES, total, type Job } from "../lib/pricing.ts";
const job: Job = {
  id: crypto.randomUUID(),
  number: "Client supplied number",
  customer: "Ahmed",
  phone: "",
  notes: "",
  updatedAt: "2026-11-01",
  status: "Approved",
  rates: { ...RATES, Wavy: 1 },
  windows: [
    {
      id: crypto.randomUUID(),
      room: "Lounge",
      width: "243",
      height: "400",
      style: "Wavy",
      confirmed: true,
    },
  ],
};
test("server pricing ignores manipulated client rates, numbers and totals", () => {
  const clean = validateJob({ ...job, total: 1 });
  assert.equal(total(clean), 850.5);
  assert.deepEqual(clean.rates, RATES);
  assert.equal(clean.number, "");
});
test("server approval blocks missing, invalid or unconfirmed measurements", () => {
  for (const patch of [
    { width: "-1" },
    { height: "" },
    { width: "1e100" },
    { width: "2.12345" },
    { confirmed: false },
    { room: "" },
  ])
    assert.throws(() =>
      validateJob({ ...job, windows: [{ ...job.windows[0], ...patch }] }),
    );
  assert.doesNotThrow(() =>
    validateJob({
      ...job,
      status: "Draft",
      windows: [{ ...job.windows[0], width: "", height: "" }],
    }),
  );
  assert.throws(() =>
    validateJob({ ...job, windows: [job.windows[0], job.windows[0]] }),
  );
  assert.throws(() => validateJob({ ...job, customer: "x".repeat(201) }));
});
test("profile validation constrains saved branding", () => {
  assert.equal(
    validateProfile({
      businessName: " Studio ",
      contact: "",
      address: "",
      terms: "",
    }).businessName,
    "Studio",
  );
  assert.throws(() =>
    validateProfile({ businessName: "", contact: "", address: "", terms: "" }),
  );
});
test("streamed JSON enforces actual byte limits without content length", async () => {
  assert.deepEqual(
    await limitedJson(
      new Request("http://local", { method: "POST", body: '{"ok":true}' }),
      20,
    ),
    { ok: true },
  );
  await assert.rejects(
    () =>
      limitedJson(
        new Request("http://local", { method: "POST", body: "x".repeat(100) }),
        10,
      ),
    /too large/,
  );
  await assert.rejects(
    () =>
      limitedJson(
        new Request("http://local", { method: "POST", body: "broken" }),
      ),
    /valid JSON/,
  );
  await assert.rejects(
    () =>
      limitedForm(
        new Request("http://local", { method: "POST", body: "x".repeat(100) }),
        10,
      ),
    /too large/,
  );
});
test("server PDF generates a paginated document from approved data", () => {
  const bytes = quotationPdf(
    {
      ...job,
      rates: RATES,
      number: "QT-TEST",
      windows: Array.from({ length: 50 }, (_, i) => ({
        ...job.windows[0],
        id: crypto.randomUUID(),
        room: `Room ${i}`,
      })),
    },
    {
      businessName: "Test Studio",
      contact: "Contact",
      address: "Address",
      terms: "Reviewed measurements.",
    },
  );
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith("%PDF-"));
  assert.ok(text.includes("Test Studio"));
  assert.ok((text.match(/\/Type \/Page\b/g) || []).length > 1);
});
