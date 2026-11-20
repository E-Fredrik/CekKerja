import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTH_STEPS, MIN_PASSWORD_LENGTH, validateAuth, validateStep, type AuthInput } from "../src/lib/auth/validate.ts";
import { parseStoredUser, userFromInput } from "../src/lib/auth/session-user.ts";
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

test("the stored session user never contains the password and keeps the status", () => {
  const user = userFromInput("signup", validSignup);
  assert.deepEqual(user, { name: "Kenneth", email: "kenneth@example.com", status: "graduate" });
  assert.doesNotMatch(JSON.stringify(user), /Rahasia/);
});

test("login uses the part before the at sign as the name", () => {
  assert.deepEqual(userFromInput("login", { ...validSignup, name: "", email: " kenneth@example.com " }), {
    name: "kenneth",
    email: "kenneth@example.com",
  });
});

test("parseStoredUser accepts a valid user and rejects anything else", () => {
  assert.deepEqual(parseStoredUser('{"name":"Kenneth","email":"k@example.com"}'), { name: "Kenneth", email: "k@example.com" });
  assert.deepEqual(parseStoredUser('{"name":"K","email":"k@example.com","status":"student"}'), {
    name: "K",
    email: "k@example.com",
    status: "student",
  });
  for (const raw of [null, "", "not json", "null", "42", '"text"', "[]", '{"name":"Kenneth"}', '{"name":"","email":"k@example.com"}', '{"name":1,"email":"k@example.com"}']) {
    assert.equal(parseStoredUser(raw), null, String(raw));
  }
  assert.equal(parseStoredUser(JSON.stringify({ name: "x".repeat(201), email: "k@example.com" })), null);
});

test("parseStoredUser drops extra fields such as a password and an unknown status", () => {
  assert.deepEqual(parseStoredUser('{"name":"K","email":"k@example.com","password":"secret","status":"admin"}'), {
    name: "K",
    email: "k@example.com",
  });
});

test("signup has four steps and login two, covering every field the full check uses", () => {
  assert.deepEqual(AUTH_STEPS.signup.map((s) => s.name), ["email", "password", "profile", "review"]);
  assert.deepEqual(AUTH_STEPS.login.map((s) => s.name), ["email", "password"]);
  for (const mode of ["signup", "login"] as const) {
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
