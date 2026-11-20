import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTH_STEPS, MIN_PASSWORD_LENGTH, normalizeCode, validateAuth, validateStep, type AuthInput } from "../src/lib/auth/validate.ts";
import { authServerError, userFromAuth } from "../src/lib/auth/session-user.ts";
import { hasSecondFactor, isGuestOnlyPath, isProtectedPath, safeNextPath } from "../src/lib/auth/routes.ts";
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  canSendCode,
  challengeState,
  codesMatch,
  generateCode,
  hashCode,
} from "../src/lib/auth/sign-in-code.ts";
import { supabaseConfig } from "../src/lib/db/config.ts";
import { MIN_SIGNUP_STRENGTH, isCommonPassword, passwordStrength } from "../src/lib/auth/password-strength.ts";

const validSignup: AuthInput = {
  email: "kenneth@example.com",
  password: "Rahasia#2026",
  confirmPassword: "Rahasia#2026",
  name: "Kenneth",
  status: "graduate",
  consent: true,
};

const empty: AuthInput = { email: "", password: "", confirmPassword: "", name: "", status: "", consent: false };

test("a complete signup and a complete login have no errors", () => {
  assert.deepEqual(validateAuth("signup", validSignup), {});
  assert.deepEqual(validateAuth("login", { ...empty, email: "kenneth@example.com", password: "anything" }), {});
});

test("an empty signup flags every field", () => {
  assert.deepEqual(validateAuth("signup", empty), {
    email: "emailInvalid",
    password: "passwordRequired",
    name: "nameRequired",
    status: "statusRequired",
    consent: "consentRequired",
  });
});

test("a name of only spaces counts as empty", () => {
  assert.equal(validateAuth("signup", { ...validSignup, name: "   " }).name, "nameRequired");
});

test("signup needs one of the three statuses", () => {
  for (const status of ["student", "graduate", "seeker"] as const) {
    assert.equal(validateAuth("signup", { ...validSignup, status }).status, undefined, status);
  }
  assert.equal(validateAuth("signup", { ...validSignup, status: "" }).status, "statusRequired");
  assert.equal(validateAuth("signup", { ...validSignup, status: "admin" as AuthInput["status"] }).status, "statusRequired");
  assert.equal(validateAuth("login", { ...validSignup, status: "" }).status, undefined);
});

test("emails without an at sign, a domain or with spaces are rejected, and padding is trimmed", () => {
  for (const email of ["abc", "abc@", "abc@test", "a b@test.com", "@test.com"]) {
    assert.equal(validateAuth("login", { ...validSignup, email }).email, "emailInvalid", email);
  }
  assert.equal(validateAuth("login", { ...validSignup, email: "  kenneth@example.com  " }).email, undefined);
});

test("signup passwords need at least the minimum length, exactly the minimum passes", () => {
  const short = "Abcde12";
  const exact = "Abcdef12";
  assert.equal(short.length, MIN_PASSWORD_LENGTH - 1);
  assert.equal(exact.length, MIN_PASSWORD_LENGTH);
  assert.equal(validateAuth("signup", { ...validSignup, password: short, confirmPassword: short }).password, "passwordShort");
  assert.equal(validateAuth("signup", { ...validSignup, password: exact, confirmPassword: exact }).password, undefined);
});

test("signup refuses a password below Fair strength", () => {
  assert.equal(validateAuth("signup", { ...validSignup, password: "rahasiaku", confirmPassword: "rahasiaku" }).password, "passwordWeak");
  assert.equal(validateAuth("signup", { ...validSignup, password: "password123", confirmPassword: "password123" }).password, "passwordWeak");
  assert.equal(validateAuth("signup", { ...validSignup, password: "Rahasiaku1", confirmPassword: "Rahasiaku1" }).password, undefined);
});

test("login does not apply the length or strength rules but still needs a password", () => {
  assert.equal(validateAuth("login", { ...validSignup, password: "abc" }).password, undefined);
  assert.equal(validateAuth("login", { ...validSignup, password: "password" }).password, undefined);
  assert.equal(validateAuth("login", { ...validSignup, password: "" }).password, "passwordRequired");
});

test("signup needs the confirmation to match exactly, login ignores it", () => {
  assert.equal(validateAuth("signup", { ...validSignup, confirmPassword: "Rahasia#2027" }).confirmPassword, "passwordMismatch");
  assert.equal(validateAuth("signup", { ...validSignup, confirmPassword: "rahasia#2026" }).confirmPassword, "passwordMismatch");
  assert.equal(validateAuth("login", { ...validSignup, confirmPassword: "" }).confirmPassword, undefined);
});

test("signup needs consent, login does not", () => {
  assert.equal(validateAuth("signup", { ...validSignup, consent: false }).consent, "consentRequired");
  assert.equal(validateAuth("login", { ...validSignup, consent: false }).consent, undefined);
});

test("password strength: too short or common is 0, then variety and length raise the level up to 4", () => {
  assert.deepEqual(passwordStrength(""), { level: 0, hint: "longer" });
  assert.deepEqual(passwordStrength("Ab1!xyz"), { level: 0, hint: "longer" });
  assert.deepEqual(passwordStrength("Password123"), { level: 0, hint: "notCommon" });
  assert.deepEqual(passwordStrength("rahasiaku"), { level: 1, hint: "addCase" });
  assert.deepEqual(passwordStrength("Rahasiaku"), { level: 1, hint: "addNumberOrSymbol" });
  assert.deepEqual(passwordStrength("Rahasiaku1"), { level: 2, hint: "addNumberOrSymbol" });
  assert.deepEqual(passwordStrength("Rahasiaku1!"), { level: 3, hint: "longer" });
  assert.deepEqual(passwordStrength("Rahasia#2026"), { level: 4, hint: null });
  assert.deepEqual(passwordStrength("kopisusugulaaren"), { level: 2, hint: "addCase" });
});

test("password strength never goes above 4 and Fair is the signup minimum", () => {
  assert.equal(passwordStrength("Sangat-Panjang-Sekali-2026!").level, 4);
  assert.equal(MIN_SIGNUP_STRENGTH, 2);
});

test("common passwords are caught case-insensitively, as are passwords of one or two repeated characters", () => {
  for (const password of ["password", "PASSWORD123", "Rahasia123", "12345678", "Bismillah", "aaaaaaaa", "abababab"]) {
    assert.equal(isCommonPassword(password), true, password);
  }
  assert.equal(isCommonPassword("Rahasia#2026"), false);
});

test("a Supabase user becomes a session user with name and status from its profile", () => {
  assert.deepEqual(userFromAuth({ email: "kenneth@example.com", user_metadata: { name: "Kenneth", status: "graduate" } }), {
    name: "Kenneth",
    email: "kenneth@example.com",
    status: "graduate",
  });
  assert.deepEqual(userFromAuth({ email: " k@example.com ", user_metadata: {} }), { name: "k", email: "k@example.com" });
});

test("userFromAuth ignores bad profile data and rejects a user without an email", () => {
  assert.deepEqual(userFromAuth({ email: "k@example.com", user_metadata: { name: "  ", status: "admin", password: "secret" } }), {
    name: "k",
    email: "k@example.com",
  });
  assert.deepEqual(userFromAuth({ email: "k@example.com", user_metadata: { name: "x".repeat(201) } }), { name: "k", email: "k@example.com" });
  for (const user of [null, undefined, {}, { email: "" }, { email: null }, { email: "x".repeat(201) }]) {
    assert.equal(userFromAuth(user), null, JSON.stringify(user));
  }
});

test("Supabase auth errors map to messages the page can translate", () => {
  assert.equal(authServerError({ code: "invalid_credentials", status: 400 }), "invalidCredentials");
  assert.equal(authServerError({ code: "user_already_exists" }), "emailTaken");
  assert.equal(authServerError({ code: "email_exists" }), "emailTaken");
  assert.equal(authServerError({ code: "weak_password" }), "weakPassword");
  assert.equal(authServerError({ code: "over_request_rate_limit" }), "rateLimited");
  assert.equal(authServerError({ status: 429 }), "rateLimited");
  assert.equal(authServerError({ code: "email_not_confirmed" }), "emailNotConfirmed");
  assert.equal(authServerError({ code: "something_new", status: 500 }), "unknown");
  assert.equal(authServerError(null), "unknown");
});

test("only the three tools need an account, and sign in pages are for guests", () => {
  for (const path of ["/lowongan", "/kontrak", "/interview", "/kontrak/hasil"]) assert.equal(isProtectedPath(path), true, path);
  for (const path of ["/", "/profil", "/masuk", "/kontrakan", "/api/check-contract"]) assert.equal(isProtectedPath(path), false, path);
  assert.equal(isGuestOnlyPath("/masuk"), true);
  assert.equal(isGuestOnlyPath("/daftar"), true);
  assert.equal(isGuestOnlyPath("/daftarkan"), false);
});

test("safeNextPath only follows paths on this site", () => {
  assert.equal(safeNextPath("/kontrak"), "/kontrak");
  assert.equal(safeNextPath("/lowongan?url=x#top"), "/lowongan?url=x#top");
  for (const raw of [null, undefined, "", "kontrak", "https://evil.example", "//evil.example", "/\\evil.example", "/a\nb", "/masuk", "/daftar?x=1", "/" + "a".repeat(600)]) {
    assert.equal(safeNextPath(raw), "/", String(raw));
  }
});

test("supabaseConfig needs both a https URL and a key", () => {
  assert.deepEqual(supabaseConfig({ url: " https://abc.supabase.co ", key: " sb_publishable_x " }), {
    url: "https://abc.supabase.co",
    key: "sb_publishable_x",
  });
  for (const env of [
    { url: undefined, key: "k" },
    { url: "https://abc.supabase.co", key: undefined },
    { url: "https://abc.supabase.co", key: "  " },
    { url: "http://abc.supabase.co", key: "k" },
    { url: "abc.supabase.co", key: "k" },
  ]) {
    assert.equal(supabaseConfig(env), null, JSON.stringify(env));
  }
});

test("signup has four steps then the code, login two then the code, covering every field the full check uses", () => {
  assert.deepEqual(AUTH_STEPS.signup.map((s) => s.name), ["email", "password", "profile", "review", "code"]);
  assert.deepEqual(AUTH_STEPS.login.map((s) => s.name), ["email", "password", "code"]);
  for (const mode of ["signup", "login"] as const) {
    const withCode = { ...empty, code: "" };
    const fromCodeSteps = Object.assign({}, ...AUTH_STEPS[mode].map((_, i) => validateStep(mode, i, withCode)));
    assert.deepEqual(fromCodeSteps, validateAuth(mode, withCode), `${mode} with code`);
    const fromSteps = Object.assign({}, ...AUTH_STEPS[mode].map((_, i) => validateStep(mode, i, empty)));
    assert.deepEqual(fromSteps, validateAuth(mode, empty), mode);
  }
});

test("a step only reports errors for its own fields", () => {
  const onlyEmail: AuthInput = { ...empty, email: "kenneth@example.com" };
  assert.deepEqual(validateStep("signup", 0, onlyEmail), {});
  assert.deepEqual(validateStep("signup", 1, onlyEmail), { password: "passwordRequired" });
  assert.deepEqual(validateStep("signup", 2, onlyEmail), { name: "nameRequired", status: "statusRequired" });
  assert.deepEqual(validateStep("signup", 3, onlyEmail), { consent: "consentRequired" });
  assert.deepEqual(validateStep("signup", 1, { ...validSignup, confirmPassword: "lain12345" }), { confirmPassword: "passwordMismatch" });
  assert.deepEqual(validateStep("login", 0, { ...onlyEmail, email: "abc" }), { email: "emailInvalid" });
  assert.deepEqual(validateStep("login", 1, onlyEmail), { password: "passwordRequired" });
});

test("a step number out of range has no errors instead of crashing", () => {
  assert.deepEqual(validateStep("login", 5, validSignup), {});
});

test("the code step needs exactly six digits, spaces and dashes allowed", () => {
  assert.equal(normalizeCode("123456"), "123456");
  assert.equal(normalizeCode(" 123 456 "), "123456");
  assert.equal(normalizeCode("123-456"), "123456");
  for (const code of ["", "12345", "1234567", "12a456", "１２３４５６", "123 45"]) assert.equal(normalizeCode(code), null, code);
  const login = { ...empty, email: "k@example.com", password: "x" };
  assert.deepEqual(validateStep("login", 2, { ...login, code: "12" }), { code: "codeInvalid" });
  assert.deepEqual(validateStep("login", 2, { ...login, code: "654321" }), {});
  assert.equal(validateAuth("login", login).code, undefined);
});

test("generateCode always gives six digits, padded with zeros", () => {
  assert.equal(generateCode(() => 0), "000000");
  assert.equal(generateCode(() => 42), "000042");
  assert.equal(generateCode(() => 999999), "999999");
  for (let i = 0; i < 200; i++) assert.match(generateCode(), /^\d{6}$/);
  let max = 0;
  generateCode((n) => ((max = n), 0));
  assert.equal(max, 1_000_000);
});

test("the stored hash depends on the secret and the challenge, and matching is exact", () => {
  const hash = hashCode("secret", "challenge-1", "123456");
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(hash, /123456/);
  assert.notEqual(hash, hashCode("other", "challenge-1", "123456"));
  assert.notEqual(hash, hashCode("secret", "challenge-2", "123456"));
  assert.equal(codesMatch(hash, hashCode("secret", "challenge-1", "123456")), true);
  assert.equal(codesMatch(hash, hashCode("secret", "challenge-1", "123457")), false);
  assert.equal(codesMatch(hash, "abcd"), false);
  assert.equal(codesMatch("", ""), false);
});

test("a code expires after 10 minutes, locks after 5 wrong tries and works only once", () => {
  const sent = new Date("2026-11-21T10:00:00Z");
  const open = { expiresAt: new Date(sent.getTime() + CODE_TTL_MS), attempts: 0, usedAt: null };
  assert.equal(challengeState(open, sent), "open");
  assert.equal(challengeState(open, new Date(sent.getTime() + CODE_TTL_MS - 1)), "open");
  assert.equal(challengeState(open, new Date(sent.getTime() + CODE_TTL_MS)), "expired");
  assert.equal(challengeState({ ...open, attempts: MAX_ATTEMPTS - 1 }, sent), "open");
  assert.equal(challengeState({ ...open, attempts: MAX_ATTEMPTS }, sent), "locked");
  assert.equal(challengeState({ ...open, usedAt: sent }, sent), "used");
  assert.equal(MAX_ATTEMPTS, 5);
  assert.equal(CODE_TTL_MS, 10 * 60 * 1000);
});

test("a new code can be sent at most once a minute and 5 times an hour", () => {
  const now = new Date("2026-11-21T10:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);
  assert.deepEqual(canSendCode([], now), { allowed: true });
  assert.deepEqual(canSendCode([ago(30)], now), { allowed: false, retryAfterSeconds: 30 });
  assert.deepEqual(canSendCode([ago(60)], now), { allowed: true });
  assert.deepEqual(canSendCode([ago(100), ago(200), ago(300), ago(400)], now), { allowed: true });
  assert.deepEqual(canSendCode([ago(100), ago(200), ago(300), ago(400), ago(500)], now), { allowed: false, retryAfterSeconds: 3100 });
  assert.deepEqual(canSendCode([ago(100), ago(200), ago(300), ago(400), ago(3600)], now), { allowed: true });
  assert.deepEqual(canSendCode([new Date(now.getTime() + 5000)], now), { allowed: true });
});

test("only sessions that passed the emailed code count as signed in", () => {
  assert.equal(hasSecondFactor([{ method: "otp", timestamp: 1 }]), true);
  assert.equal(hasSecondFactor([{ method: "password", timestamp: 1 }, { method: "magiclink", timestamp: 2 }]), true);
  assert.equal(hasSecondFactor(["otp"]), true);
  for (const amr of [undefined, null, [], [{ method: "password", timestamp: 1 }], ["password"], "otp", [null], [{}]]) {
    assert.equal(hasSecondFactor(amr), false, JSON.stringify(amr));
  }
});

test("the sign in API rejects bad input and says when accounts are not set up", async () => {
  const { POST } = await import("../src/app/api/account/sign-in/route.ts");
  const call = (body: unknown, ip: string) =>
    POST(new Request("http://x/api/account/sign-in", { method: "POST", headers: { "x-real-ip": ip }, body: JSON.stringify(body) }));
  assert.equal((await call({ mode: "login", email: "k@example.com" }, "1.1.1.1")).status, 400);
  assert.equal((await call({ mode: "signup", email: "k@example.com", password: "password123", name: "K", status: "student", lang: "id" }, "1.1.1.2")).status, 400);
  assert.equal((await call({ mode: "login", email: "nope", password: "x", lang: "id" }, "1.1.1.3")).status, 400);
  const res = await call({ mode: "login", email: "k@example.com", password: "x", lang: "id" }, "1.1.1.4");
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: "notConfigured" });
  assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  const huge = await POST(new Request("http://x", { method: "POST", headers: { "x-real-ip": "1.1.1.5" }, body: "x".repeat(9000) }));
  assert.equal(huge.status, 400);
});

test("the sign in API limits attempts per address", async () => {
  const { POST } = await import("../src/app/api/account/sign-in/route.ts");
  const statuses = [];
  for (let i = 0; i < 11; i++) {
    const res = await POST(new Request("http://x", { method: "POST", headers: { "x-real-ip": "9.9.9.9" }, body: "{}" }));
    statuses.push(res.status);
  }
  assert.equal(statuses.at(-1), 429);
  assert.equal(statuses.filter((s) => s === 429).length, 1);
});

test("the resend API needs a real challenge id", async () => {
  const { POST } = await import("../src/app/api/account/resend/route.ts");
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ challengeId: "not-a-uuid", lang: "id" }) }));
  assert.equal(res.status, 400);
});
