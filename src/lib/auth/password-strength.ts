export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export type StrengthHint = "longer" | "notCommon" | "addCase" | "addNumberOrSymbol";

export type PasswordStrength = { level: StrengthLevel; hint: StrengthHint | null };

export const MIN_SIGNUP_STRENGTH: StrengthLevel = 2;

const MIN_LENGTH = 8;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "11111111",
  "00000000",
  "87654321",
  "qwerty123",
  "qwertyuiop",
  "1q2w3e4r",
  "abc12345",
  "abcd1234",
  "iloveyou",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "welcome1",
  "admin123",
  "letmein1",
  "rahasia1",
  "rahasia123",
  "bismillah",
  "indonesia",
  "jakarta123",
  "sayang123",
  "katasandi",
  "cekkerja",
  "cekkerja123",
]);

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;
  return new Set(lower).size <= 2;
}

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < MIN_LENGTH) return { level: 0, hint: "longer" };
  if (isCommonPassword(password)) return { level: 0, hint: "notCommon" };

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  const lengthBonus = (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0);
  const level = Math.min(4, Math.max(1, variety - 1 + lengthBonus)) as StrengthLevel;

  let hint: StrengthHint | null = null;
  if (level < 4) {
    if (!(hasLower && hasUpper)) hint = "addCase";
    else if (!hasDigit || !hasSymbol) hint = "addNumberOrSymbol";
    else hint = "longer";
  }
  return { level, hint };
}
