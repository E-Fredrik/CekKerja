import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_PASSWORD_LENGTH, validateAuth, type AuthInput } from "../src/lib/auth/validate.ts";
import { parseStoredUser, userFromInput } from "../src/lib/auth/session-user.ts";

const validSignup: AuthInput = {
  name: "Kenneth",
  email: "kenneth@example.com",
  password: "rahasia123",
  confirmPassword: "rahasia123",
  consent: true,
};

test("a complete signup and a complete login have no errors", () => {
  assert.deepEqual(validateAuth("signup", validSignup), {});
  assert.deepEqual(validateAuth("login", { ...validSignup, name: "", confirmPassword: "", consent: false }), {});
});

test("an empty signup flags every field", () => {
  const empty: AuthInput = { name: "", email: "", password: "", confirmPassword: "", consent: false };
  assert.deepEqual(validateAuth("signup", empty), {
    name: "nameRequired",
    email: "emailInvalid",
    password: "passwordRequired",
    consent: "consentRequired",
  });
});

test("a name of only spaces counts as empty", () => {
  assert.equal(validateAuth("signup", { ...validSignup, name: "   " }).name, "nameRequired");
});

test("emails without an at sign, a domain or with spaces are rejected, and padding is trimmed", () => {
  for (const email of ["abc", "abc@", "abc@test", "a b@test.com", "@test.com"]) {
    assert.equal(validateAuth("login", { ...validSignup, email }).email, "emailInvalid", email);
  }
  assert.equal(validateAuth("login", { ...validSignup, email: "  kenneth@example.com  " }).email, undefined);
});

test("signup passwords need at least the minimum length, exactly the minimum passes", () => {
  const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
  const exact = "a".repeat(MIN_PASSWORD_LENGTH);
  assert.equal(validateAuth("signup", { ...validSignup, password: short, confirmPassword: short }).password, "passwordShort");
  assert.equal(validateAuth("signup", { ...validSignup, password: exact, confirmPassword: exact }).password, undefined);
});

test("login does not apply the length rule but still needs a password", () => {
  assert.equal(validateAuth("login", { ...validSignup, password: "abc" }).password, undefined);
  assert.equal(validateAuth("login", { ...validSignup, password: "" }).password, "passwordRequired");
});

test("signup needs the confirmation to match exactly, login ignores it", () => {
  assert.equal(validateAuth("signup", { ...validSignup, confirmPassword: "rahasia124" }).confirmPassword, "passwordMismatch");
  assert.equal(validateAuth("signup", { ...validSignup, confirmPassword: "Rahasia123" }).confirmPassword, "passwordMismatch");
  assert.equal(validateAuth("login", { ...validSignup, confirmPassword: "" }).confirmPassword, undefined);
});

test("signup needs consent, login does not", () => {
  assert.equal(validateAuth("signup", { ...validSignup, consent: false }).consent, "consentRequired");
  assert.equal(validateAuth("login", { ...validSignup, consent: false }).consent, undefined);
});

test("the stored session user never contains the password", () => {
  const user = userFromInput("signup", validSignup);
  assert.deepEqual(user, { name: "Kenneth", email: "kenneth@example.com" });
  assert.doesNotMatch(JSON.stringify(user), /rahasia/);
});

test("login uses the part before the at sign as the name", () => {
  assert.deepEqual(userFromInput("login", { ...validSignup, name: "", email: " kenneth@example.com " }), {
    name: "kenneth",
    email: "kenneth@example.com",
  });
});

test("parseStoredUser accepts a valid user and rejects anything else", () => {
  assert.deepEqual(parseStoredUser('{"name":"Kenneth","email":"k@example.com"}'), { name: "Kenneth", email: "k@example.com" });
  for (const raw of [null, "", "not json", "null", "42", '"text"', "[]", '{"name":"Kenneth"}', '{"name":"","email":"k@example.com"}', '{"name":1,"email":"k@example.com"}']) {
    assert.equal(parseStoredUser(raw), null, String(raw));
  }
  assert.equal(parseStoredUser(JSON.stringify({ name: "x".repeat(201), email: "k@example.com" })), null);
});

test("parseStoredUser drops extra fields such as a password", () => {
  assert.deepEqual(parseStoredUser('{"name":"K","email":"k@example.com","password":"secret"}'), { name: "K", email: "k@example.com" });
});
