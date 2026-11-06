import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, ruleById, rulesFor } from "../src/lib/legal/rules.ts";
import { checkDuration, checkWage } from "../src/lib/legal/checks.ts";

test("every rule has a unique id, a scope, a source and both languages", () => {
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
  for (const r of RULES) {
    assert.ok(r.scope.length > 0, r.id);
    assert.ok(r.source.trim(), r.id);
    assert.ok(r.summary.id.trim() && r.summary.en.trim(), r.id);
    assert.ok(!/[—–]/.test(r.summary.id + r.summary.en), `${r.id} uses a dash`);
  }
});

test("ruleById finds a rule and returns undefined for unknown ids", () => {
  assert.equal(ruleById("pkwt-probation")?.source, "UU 13/2003 Pasal 58");
  assert.equal(ruleById("other"), undefined);
});

test("rulesFor keeps only the rules for that scope", () => {
  const ad = rulesFor("ad").map((r) => r.id);
  assert.ok(ad.includes("age-limit"));
  assert.ok(!ad.includes("pkwt-probation"));
  assert.ok(rulesFor("contract").every((r) => r.scope.includes("contract")));
});

test("checkWage flags a wage below the minimum and clears one at or above it", () => {
  assert.deepEqual(checkWage(3_000_000, 3_500_000), { ruleId: "minimum-wage", verdict: "red", found: 3_000_000, limit: 3_500_000 });
  assert.equal(checkWage(3_500_000, 3_500_000)?.verdict, "green");
  assert.equal(checkWage(4_000_000, 3_500_000)?.verdict, "green");
});

test("checkWage skips unknown or invalid numbers", () => {
  assert.equal(checkWage(null, 3_500_000), null);
  assert.equal(checkWage(3_000_000, null), null);
  assert.equal(checkWage(Number.NaN, 3_500_000), null);
  assert.equal(checkWage(-1, 3_500_000), null);
  assert.equal(checkWage(0, 3_500_000), null);
});

test("checkDuration allows internships up to 12 months", () => {
  assert.equal(checkDuration("magang", 12)?.verdict, "green");
  assert.deepEqual(checkDuration("magang", 13), { ruleId: "internship-length", verdict: "red", found: 13, limit: 12 });
});

test("checkDuration allows PKWT up to 5 years", () => {
  assert.equal(checkDuration("PKWT", 60)?.verdict, "green");
  assert.equal(checkDuration("PKWT", 61)?.verdict, "red");
});

test("checkDuration skips permanent, unknown and missing durations", () => {
  assert.equal(checkDuration("PKWTT", 120), null);
  assert.equal(checkDuration("unknown", 120), null);
  assert.equal(checkDuration("magang", null), null);
  assert.equal(checkDuration("magang", Number.POSITIVE_INFINITY), null);
});

test("every number check points to a rule in the list", () => {
  for (const f of [checkWage(1, 2), checkDuration("magang", 1), checkDuration("PKWT", 1)]) {
    assert.ok(f && ruleById(f.ruleId), f?.ruleId);
  }
});
