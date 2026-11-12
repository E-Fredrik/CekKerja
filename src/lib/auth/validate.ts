export type AuthMode = "login" | "signup";

export type AuthInput = {
  name: string;
  email: string;
  password: string;
  consent: boolean;
};

export type AuthErrorCode = "nameRequired" | "emailInvalid" | "passwordRequired" | "passwordShort" | "consentRequired";

export type AuthErrors = Partial<Record<keyof AuthInput, AuthErrorCode>>;

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuth(mode: AuthMode, input: AuthInput): AuthErrors {
  const errors: AuthErrors = {};
  const signup = mode === "signup";

  if (signup && input.name.trim() === "") errors.name = "nameRequired";
  if (!EMAIL_PATTERN.test(input.email.trim())) errors.email = "emailInvalid";
  if (input.password === "") errors.password = "passwordRequired";
  else if (signup && input.password.length < MIN_PASSWORD_LENGTH) errors.password = "passwordShort";
  if (signup && !input.consent) errors.consent = "consentRequired";

  return errors;
}
