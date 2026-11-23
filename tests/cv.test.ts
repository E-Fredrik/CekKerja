import { test } from "node:test";
import assert from "node:assert/strict";
import { CV_LIMITS, cvPrompt, parseStoredCv, readCv, trimCv, type CvProfile } from "../src/lib/cv/profile.ts";
import type { generateJson } from "../src/lib/ai/gemini.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CV_TABLE, deleteCv, loadCv, signedInUserId, storeCv } from "../src/lib/cv/store.ts";
import { handle, SignInNeeded } from "../src/lib/http.ts";

const sample: CvProfile = {
  name: "Budi Santoso",
  headline: "Mahasiswa Informatika tingkat akhir",
  education: [{ school: "Universitas Ciputra", degree: "S1 Informatika", years: "2022 - 2026" }],
  experience: [{ role: "Magang Admin", organisation: "PT Maju", years: "2025", highlights: ["Mengelola data di Excel"] }],
  skills: ["Excel", "Python"],
  languages: ["Indonesia (asli)", "Inggris (menengah)"],
};

test("parseStoredCv accepts a valid profile and rejects broken or wrong data", () => {
  assert.deepEqual(parseStoredCv(JSON.stringify(sample)), sample);
  assert.equal(parseStoredCv(null), null);
  assert.equal(parseStoredCv("not json"), null);
  assert.equal(parseStoredCv(JSON.stringify({ name: "Budi" })), null);
  assert.equal(parseStoredCv(JSON.stringify({ ...sample, skills: "Excel" })), null);
});

test("parseStoredCv drops fields that are not part of the profile", () => {
  const stored = parseStoredCv(JSON.stringify({ ...sample, password: "secret", rawFile: "base64..." }));
  assert.deepEqual(Object.keys(stored ?? {}).sort(), ["education", "experience", "headline", "languages", "name", "skills"]);
});

test("trimCv caps text length and list sizes and drops empty items", () => {
  const long = "x".repeat(CV_LIMITS.text + 50);
  const big: CvProfile = {
    ...sample,
    name: `  ${long}  `,
    skills: [...Array.from({ length: CV_LIMITS.list + 5 }, (_, i) => `skill ${i}`), "  "],
    experience: [{ ...sample.experience[0], highlights: Array.from({ length: CV_LIMITS.highlights + 3 }, (_, i) => `h${i}`) }],
  };
  const out = trimCv(big);
  assert.equal(out.name.length, CV_LIMITS.text);
  assert.equal(out.skills.length, CV_LIMITS.list);
  assert.equal(out.experience[0].highlights.length, CV_LIMITS.highlights);
  assert.deepEqual(trimCv({ ...sample, languages: ["", "  ", "Inggris"] }).languages, ["Inggris"]);
});

test("cvPrompt treats the CV as untrusted data and names the language", () => {
  assert.match(cvPrompt("id"), /untrusted data/);
  assert.match(cvPrompt("id"), /Never invent/);
  assert.match(cvPrompt("en"), /in English/);
  assert.match(cvPrompt("id"), /in Bahasa Indonesia/);
});

test("readCv sends the file to the model in fast mode and trims the answer", async () => {
  let seen: { mime?: string; mode: string } | undefined;
  const generate = (async (_schema: unknown, _system: string, parts: { inlineData?: { mimeType: string } }[], mode: string) => {
    seen = { mime: parts[0].inlineData?.mimeType, mode };
    return { ...sample, skills: ["Excel", "", "Python"] };
  }) as unknown as typeof generateJson;
  const file = new File([new Uint8Array([37, 80, 68, 70])], "cv.pdf", { type: "application/pdf" });
  const out = await readCv(file, "id", generate);
  assert.deepEqual(seen, { mime: "application/pdf", mode: "fast" });
  assert.deepEqual(out.skills, ["Excel", "Python"]);
});

test("a request that is not signed in gets 401 with the signIn code", async () => {
  const res = await handle(async () => signedInUserId(null))(new Request("http://x/api/cv"));
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "Sign in first", code: "signIn" });
});

type Call = { table: string; op: string; args: unknown[] };

function fakeDb(claims: unknown, row: unknown = null, error: { message: string } | null = null) {
  const calls: Call[] = [];
  const query = (table: string) => {
    const chain = {
      select: (...args: unknown[]) => (calls.push({ table, op: "select", args }), chain),
      upsert: (...args: unknown[]) => (calls.push({ table, op: "upsert", args }), Promise.resolve({ error })),
      delete: () => (calls.push({ table, op: "delete", args: [] }), chain),
      eq: (...args: unknown[]) => (calls.push({ table, op: "eq", args }), Object.assign(Promise.resolve({ error }), chain)),
      maybeSingle: () => Promise.resolve({ data: row, error }),
    };
    return chain;
  };
  const db = { auth: { getClaims: async () => ({ data: claims ? { claims } : null }) }, from: query };
  return { db: db as unknown as SupabaseClient, calls };
}

const OTP = [{ method: "password" }, { method: "otp" }];

test("signedInUserId needs a user and the email code as second factor", async () => {
  assert.equal(await signedInUserId(fakeDb({ sub: "u1", amr: OTP }).db), "u1");
  await assert.rejects(signedInUserId(null), SignInNeeded);
  await assert.rejects(signedInUserId(fakeDb(null).db), SignInNeeded);
  await assert.rejects(signedInUserId(fakeDb({ sub: "u1", amr: [{ method: "password" }] }).db), SignInNeeded);
});

test("loadCv returns the stored profile, or null for no row or a broken one", async () => {
  const { db, calls } = fakeDb(null, { profile: sample });
  assert.deepEqual(await loadCv(db, "u1"), sample);
  assert.deepEqual(calls, [
    { table: CV_TABLE, op: "select", args: ["profile"] },
    { table: CV_TABLE, op: "eq", args: ["user_id", "u1"] },
  ]);
  assert.equal(await loadCv(fakeDb(null, null).db, "u1"), null);
  assert.equal(await loadCv(fakeDb(null, { profile: { name: "x" } }).db, "u1"), null);
});

test("storeCv trims the profile and saves it to the user's own row", async () => {
  const { db, calls } = fakeDb(null);
  const saved = await storeCv(db, "u1", { ...sample, skills: ["Excel", "  "] });
  assert.deepEqual(saved.skills, ["Excel"]);
  const row = calls[0].args[0] as { user_id: string; profile: CvProfile };
  assert.equal(calls[0].op, "upsert");
  assert.equal(row.user_id, "u1");
  assert.deepEqual(row.profile, saved);
});

test("deleteCv deletes only the user's row, and database errors are not hidden", async () => {
  const { db, calls } = fakeDb(null);
  await deleteCv(db, "u1");
  assert.deepEqual(calls.map((c) => c.op), ["delete", "eq"]);
  assert.deepEqual(calls[1].args, ["user_id", "u1"]);
  const broken = fakeDb(null, null, { message: "permission denied" }).db;
  await assert.rejects(storeCv(broken, "u1", sample), /permission denied/);
  await assert.rejects(deleteCv(broken, "u1"), /permission denied/);
  await assert.rejects(loadCv(broken, "u1"), /permission denied/);
});
