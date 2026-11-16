import { test } from "node:test";
import assert from "node:assert/strict";
import { CV_LIMITS, cvPrompt, parseStoredCv, readCv, trimCv, type CvProfile } from "../src/lib/cv/profile.ts";
import type { generateJson } from "../src/lib/ai/gemini.ts";

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

test("the cv route rejects a request without a file", async () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    const { POST } = await import("../src/app/api/cv/route.ts");
    const form = new FormData();
    form.append("lang", "id");
    const res = await POST(new Request("http://x/api/cv", { method: "POST", body: form }));
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: "CV: file is missing" });
  } finally {
    console.error = quiet;
  }
});
