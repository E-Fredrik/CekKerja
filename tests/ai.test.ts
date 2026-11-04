import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry, modelsFor, fileToPart } from "../src/lib/ai/gemini.ts";
import { ContractResult, AdResult } from "../src/lib/ai/schemas.ts";
import { BadRequest, checkFile, handle, langOf, modeOf } from "../src/lib/http.ts";

const fail = (status?: number, message = `HTTP ${status}`) => Object.assign(new Error(message), status ? { status } : {});
const quiet = () => (console.warn = console.error = () => {});
quiet();

test("withRetry falls back to the next model when the first is busy", async () => {
  const tried: string[] = [];
  const out = await withRetry(async (m) => (tried.push(m), m === "a" ? Promise.reject(fail(503)) : `ok:${m}`), ["a", "b"], 1);
  assert.equal(out, "ok:b");
  assert.deepEqual(tried, ["a", "b"]);
});

test("withRetry treats timeouts and rate limits as retryable", async () => {
  assert.equal(await withRetry(async (m) => (m === "a" ? Promise.reject(fail(undefined, "Request timeout")) : m), ["a", "b"], 1), "b");
  assert.equal(await withRetry(async (m) => (m === "a" ? Promise.reject(fail(429)) : m), ["a", "b"], 1), "b");
});

test("withRetry gives a clear message when every model fails", async () => {
  await assert.rejects(withRetry(() => Promise.reject(fail(503)), ["a", "b"], 1), /busy right now/);
});

test("withRetry does not retry client errors", async () => {
  let calls = 0;
  await assert.rejects(withRetry(async () => (calls++, Promise.reject(fail(400))), ["a", "b"], 1), /HTTP 400/);
  assert.equal(calls, 1);
});

test("withRetry moves on when a model returns broken JSON", async () => {
  assert.equal(await withRetry(async (m) => (m === "a" ? JSON.parse('{"cut') : m), ["a", "b"], 1), "b");
});

test("withRetry moves on when a model answers {} that fails the schema", async () => {
  assert.equal(await withRetry(async (m) => (m === "a" ? ContractResult.parse({}) : "ok"), ["a", "b"], 1), "ok");
});

test("withRetry with no models fails clearly", async () => {
  await assert.rejects(withRetry(async () => "x", [], 1), /No model configured/);
});

test("modelsFor: fast uses only Flash-Lite, smart tries Flash then falls back to Flash-Lite", () => {
  assert.deepEqual(modelsFor("fast"), ["gemini-flash-lite-latest", "gemini-flash-lite-latest"]);
  const smart = modelsFor("smart");
  assert.equal(smart[0], process.env.GEMINI_MODEL || "gemini-flash-latest");
  assert.equal(smart.at(-1), "gemini-flash-lite-latest");
});

test("schemas reject an unknown verdict and accept a valid ad result", () => {
  const flag = { quote: "Usia maks 25", verdict: "red", ruleId: "age", explanation: "x", questionToAsk: "y" };
  const ad = { summary: "s", role: "r", company: "c", flags: [flag], inclusiveRewrite: "w" };
  assert.equal(AdResult.parse(ad).flags[0].verdict, "red");
  assert.throws(() => AdResult.parse({ ...ad, flags: [{ ...flag, verdict: "orange" }] }));
});

test("fileToPart encodes the file as base64 inline data", async () => {
  const part = await fileToPart(new File(["hi"], "a.pdf", { type: "application/pdf" }));
  assert.deepEqual(part, { inlineData: { mimeType: "application/pdf", data: "aGk=" } });
});

test("langOf and modeOf fall back to Indonesian and fast", () => {
  assert.equal(langOf("en"), "en");
  assert.equal(langOf("fr"), "id");
  assert.equal(langOf(undefined), "id");
  assert.equal(modeOf("smart"), "smart");
  assert.equal(modeOf("SMART"), "fast");
  assert.equal(modeOf(null), "fast");
});

test("checkFile accepts PDF and images up to 8 MB and rejects the rest", () => {
  const pdf = new File(["x"], "c.pdf", { type: "application/pdf" });
  assert.equal(checkFile(pdf, "Contract"), pdf);
  assert.throws(() => checkFile(null, "Contract"), /missing/);
  assert.throws(() => checkFile(new File([], "e.pdf", { type: "application/pdf" }), "Contract"), /missing/);
  assert.throws(() => checkFile(new File(["x"], "a.docx", { type: "application/msword" }), "Contract"), /PDF, PNG/);
  const big = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "b.pdf", { type: "application/pdf" });
  assert.throws(() => checkFile(big, "Contract"), /8 MB/);
  const exact = new File([new Uint8Array(8 * 1024 * 1024)], "ok.pdf", { type: "application/pdf" });
  assert.equal(checkFile(exact, "Contract"), exact);
});

test("handle returns JSON, 400 for BadRequest, and hides internal 500 details", async () => {
  const req = new Request("http://x/api");
  const ok = await handle(async () => ({ a: 1 }))(req);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { a: 1 });

  const bad = await handle(async () => { throw new BadRequest("text is missing"); })(req);
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { error: "text is missing" });

  const crash = await handle(async () => { throw new Error("db password wrong at 10.0.0.1"); })(req);
  assert.equal(crash.status, 500);
  assert.doesNotMatch((await crash.json()).error, /10\.0\.0\.1/);

  const busy = await handle(() => withRetry(() => Promise.reject(fail(503)), ["a"], 1))(req);
  assert.equal(busy.status, 500);
  assert.match((await busy.json()).error, /busy right now/);
});
