import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addRelatedArticles, applyNumberChecks } from "../src/lib/ai/analyze.ts";
import type { ContractResult } from "../src/lib/ai/schemas.ts";
import { LAWS, ayatOf, citedText, citedTexts } from "../src/lib/legal/corpus.ts";
import { MAX_RELATED, MIN_SIMILARITY, articleRows, relatedArticles } from "../src/lib/legal/retrieve.ts";
import { RULES } from "../src/lib/legal/rules.ts";

const law = LAWS["uu-27-2026"];

test("the corpus holds every article of UU 27/2026 with its official source", () => {
  assert.equal(Object.keys(law.articles).length, 313);
  assert.match(law.url, /^https:\/\/jdih\.kemnaker\.go\.id\//);
  assert.ok(Object.values(law.articles).every((text) => text.length > 20));
  assert.match(law.articles["311"], /Nomor 13 Tahun 2003/);
});

test("every rule citation points at an article in the corpus, and at its ayat when one is named", () => {
  for (const rule of RULES) {
    assert.ok(rule.cite.length > 0, rule.id);
    for (const cite of rule.cite) {
      assert.ok(law.articles[cite.article], `${rule.id} Pasal ${cite.article}`);
      if (cite.ayat) assert.ok(ayatOf(law.articles[cite.article], cite.ayat), `${rule.id} ayat ${cite.ayat}`);
    }
  }
});

test("cited articles say what the number checks enforce", () => {
  assert.match(citedText({ law: "uu-27-2026", article: "38" })!.text, /paling lama 6 \(enam\) bulan/);
  assert.match(citedText({ law: "uu-27-2026", article: "82", ayat: 2 })!.text, /paling lama 2 \(dua\) tahun/);
  assert.match(citedText({ law: "uu-27-2026", article: "86" })!.text, /tidak dapat mensyaratkan adanya masa percobaan/);
});

test("ayatOf returns only the asked ayat and null when it is missing", () => {
  const text = "(1) Satu.\na. huruf;\n(2) Dua.\n(3) Tiga.";
  assert.equal(ayatOf(text, 1), "(1) Satu.\na. huruf;");
  assert.equal(ayatOf(text, 3), "(3) Tiga.");
  assert.equal(ayatOf(text, 4), null);
});

test("citedText labels the article and ayat, and skips unknown laws or articles", () => {
  assert.equal(citedText({ law: "uu-27-2026", article: "140", ayat: 5 })?.label, "UU 27/2026 Pasal 140 ayat (5)");
  assert.equal(citedText({ law: "uu-27-2026", article: "6" })?.label, "UU 27/2026 Pasal 6");
  assert.deepEqual(citedTexts([{ law: "uu-1-1900", article: "1" }, { law: "uu-27-2026", article: "999" }]), []);
});

test("articleRows gives one row per article with a stable id", () => {
  const rows = articleRows([law]);
  assert.equal(rows.length, 313);
  assert.equal(rows[85].id, "uu-27-2026:86");
  assert.match(rows[85].input, /^UU 27\/2026 tentang Pelindungan Ketenagakerjaan Pasal 86\n/);
});

const fakeDb = (similarity: number, calls: unknown[] = []) =>
  ({
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args]);
      return { data: [{ law: "uu-27-2026", article: "78", similarity }], error: null };
    },
  }) as unknown as SupabaseClient;
const embed = async (texts: string[]) => texts.map(() => [0.1, 0.2]);

test("relatedArticles keeps close matches and drops weak ones", async () => {
  const calls: unknown[] = [];
  const [close] = await relatedArticles(["Ijazah asli ditahan"], fakeDb(MIN_SIMILARITY, calls), embed);
  assert.equal(close?.label, "UU 27/2026 Pasal 78");
  assert.deepEqual(calls, [["match_law_articles", { query_embedding: "[0.1,0.2]", match_count: 1 }]]);
  assert.deepEqual(await relatedArticles(["Gaji tanggal 25"], fakeDb(MIN_SIMILARITY - 0.01), embed), [null]);
});

test("relatedArticles returns nothing without a database, on errors, and past the cap", async () => {
  assert.deepEqual(await relatedArticles(["a"], null, embed), [null]);
  const failing = async () => {
    throw new Error("quota");
  };
  assert.deepEqual(await relatedArticles(["a", "b"], fakeDb(0.9), failing), [null, null]);
  const many = Array.from({ length: MAX_RELATED + 2 }, (_, i) => `clause ${i}`);
  const out = await relatedArticles(many, fakeDb(0.9), embed);
  assert.equal(out.filter(Boolean).length, MAX_RELATED);
  assert.equal(out.at(-1), null);
});

const contract = (clauses: ContractResult["clauses"]): ContractResult => ({
  contractType: "PKWT",
  monthlyWage: null,
  city: null,
  durationMonths: null,
  clauses,
  summary: "",
  negotiationMessage: "",
});
const clause = (ruleId: string, verdict: "red" | "yellow" | "green", text = ruleId) => ({
  title: ruleId,
  text,
  verdict,
  ruleId,
  explanation: "",
  questionToAsk: "",
});

test("contract clauses carry the article text of their rule", () => {
  const out = applyNumberChecks(contract([clause("pkwt-probation", "red"), clause("made-up", "red")]), null);
  assert.deepEqual(out.clauses[0].citations.map((c) => c.label), ["UU 27/2026 Pasal 86"]);
  assert.deepEqual(out.clauses[1].citations, []);
});

test("only uncovered yellow or red clauses are searched for a related article", async () => {
  const asked: string[][] = [];
  const check = applyNumberChecks(
    contract([clause("pkwt-probation", "red"), clause("x", "yellow", "Ijazah ditahan"), clause("x", "green", "Gaji")]),
    null,
  );
  const out = await addRelatedArticles(check, async (texts) => {
    asked.push(texts);
    return texts.map(() => citedText({ law: "uu-27-2026", article: "78" }));
  });
  assert.deepEqual(asked, [["Ijazah ditahan"]]);
  assert.deepEqual(out.clauses.map((c) => c.related?.label ?? null), [null, "UU 27/2026 Pasal 78", null]);
  assert.equal(check.clauses[1].related, null);
});
