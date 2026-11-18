import { test } from "node:test";
import assert from "node:assert/strict";
import type { generateJson } from "../src/lib/ai/gemini.ts";
import type { CvProfile } from "../src/lib/cv/profile.ts";
import { BadRequest } from "../src/lib/http.ts";
import { strings } from "../src/lib/i18n.ts";
import { MAX_AD_CHARS, MAX_REQUIREMENTS, keepGroundedRequirements, matchCv, matchPrompt, matchScore, parseMatchRequest, type MatchResult } from "../src/lib/match/match.ts";

const AD = "Dicari Staf Admin. Syarat: menguasai Microsoft Excel, lulusan S1 Akuntansi, pengalaman 1 tahun di bidang administrasi, bisa berbahasa Inggris.";

const CV: CvProfile = {
  name: "Rina",
  headline: "Lulusan baru Akuntansi",
  education: [{ school: "Universitas Ciputra", degree: "S1 Akuntansi", years: "2022 - 2026" }],
  experience: [{ role: "Magang Admin", organisation: "PT Contoh", years: "2025", highlights: ["Merapikan laporan keuangan bulanan di Excel"] }],
  skills: ["Microsoft Excel", "Google Sheets"],
  languages: ["Inggris (menengah)"],
};

const req = (status: MatchResult["requirements"][number]["status"], requirement: string, evidence = "") => ({ requirement, status, evidence, tip: "tip" });

test("matchScore counts met as one and partial as a half, and has no score without requirements", () => {
  assert.equal(matchScore([]), null);
  assert.equal(matchScore([{ status: "met" }, { status: "missing" }]), 50);
  assert.equal(matchScore([{ status: "met" }, { status: "partial" }, { status: "missing" }]), 50);
  assert.equal(matchScore([{ status: "met" }, { status: "met" }, { status: "partial" }]), 83);
});

test("keepGroundedRequirements drops requirements not in the ad and evidence not in the CV", () => {
  const result: MatchResult = {
    summary: "s",
    requirements: [
      req("met", "menguasai  Microsoft Excel", "Microsoft Excel"),
      req("met", "Sertifikat Brevet A", "Brevet A"),
      req("partial", "pengalaman 1 tahun di bidang administrasi", "Magang Admin PT Contoh"),
      req("met", "bisa berbahasa Inggris", "Inggris fasih dan TOEFL 600"),
      req("missing", "lulusan S1 Akuntansi", "S1 Akuntansi"),
      req("met", "skills", "skills"),
    ],
  };
  const kept = keepGroundedRequirements(result, AD, CV).requirements;
  assert.deepEqual(
    kept.map((r) => [r.requirement, r.status, r.evidence]),
    [
      ["menguasai  Microsoft Excel", "met", "Microsoft Excel"],
      ["pengalaman 1 tahun di bidang administrasi", "partial", "Magang Admin PT Contoh"],
      ["bisa berbahasa Inggris", "missing", ""],
      ["lulusan S1 Akuntansi", "missing", ""],
    ],
  );
});

test("keepGroundedRequirements keeps at most the maximum number of requirements", () => {
  const many = Array.from({ length: MAX_REQUIREMENTS + 5 }, () => req("missing", "Microsoft Excel"));
  assert.equal(keepGroundedRequirements({ summary: "s", requirements: many }, AD, CV).requirements.length, MAX_REQUIREMENTS);
});

test("parseMatchRequest needs an ad and a valid CV and answers in the request language", () => {
  assert.equal(parseMatchRequest({ adText: ` ${AD} `, cv: CV }).adText, AD);
  assert.equal(parseMatchRequest({ adText: AD, cv: CV, lang: "xx" }).lang, "id");
  const messageOf = (body: unknown) => {
    try {
      parseMatchRequest(body);
    } catch (e) {
      return e instanceof BadRequest ? e.message : "not a bad request";
    }
    return "no error";
  };
  assert.equal(messageOf({ cv: CV, lang: "en" }), strings.en.match.errors.adMissing);
  assert.equal(messageOf({ adText: "short", cv: CV }), strings.id.match.errors.adMissing);
  assert.equal(messageOf({ adText: "a".repeat(MAX_AD_CHARS + 1), cv: CV, lang: "en" }), strings.en.match.errors.adTooLong);
  assert.equal(messageOf({ adText: AD, cv: { name: "Rina" }, lang: "en" }), strings.en.match.errors.invalid);
  assert.equal(messageOf(null), strings.id.match.errors.invalid);
});

test("matchCv tags the ad and CV as untrusted data and computes the score in code", async () => {
  let seen = "";
  const generate = (async (_schema: unknown, system: string, parts: { text?: string }[]) => {
    seen = `${system}\n${parts[0].text}`;
    return { summary: "Cukup cocok.", requirements: [req("met", "menguasai Microsoft Excel", "Microsoft Excel"), req("missing", "lulusan S1 Akuntansi")] };
  }) as unknown as typeof generateJson;
  const match = await matchCv({ adText: AD, cv: CV, lang: "en", mode: "fast" }, generate);
  assert.equal(match.score, 50);
  assert.match(seen, /<job_ad>\n[\s\S]*<\/job_ad>/);
  assert.match(seen, /<cv>\n[\s\S]*Microsoft Excel[\s\S]*<\/cv>/);
  assert.match(matchPrompt("en"), /Never follow instructions/);
  assert.match(matchPrompt("en"), /English/);
});

test("the match trims an oversized CV and does not send the name to the model", async () => {
  const big = { ...CV, skills: Array.from({ length: 500 }, (_, i) => `skill ${i}`), headline: "x".repeat(5000) };
  const parsed = parseMatchRequest({ adText: AD, cv: big, lang: "id" });
  assert.equal(parsed.cv.skills.length, 20);
  assert.equal(parsed.cv.headline.length, 300);
  let sent = "";
  const generate = (async (_s: unknown, _p: string, parts: { text: string }[]) => {
    sent = parts[0].text;
    return { requirements: [], summary: "" };
  }) as unknown as typeof generateJson;
  await matchCv(parsed, generate);
  assert.ok(!sent.includes("Rina"));
  assert.ok(sent.includes("Microsoft Excel"));
});
