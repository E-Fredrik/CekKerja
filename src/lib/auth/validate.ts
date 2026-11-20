export type AuthMode = "login" | "signup";

export type AuthInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
};

export type AuthErrorCode =
  | "nameRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordShort"
  | "passwordMismatch"
  | "consentRequired";

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
  if (signup && input.confirmPassword !== input.password) errors.confirmPassword = "passwordMismatch";
  if (signup && !input.consent) errors.consent = "consentRequired";

  return errors;
}

export type AuthStepName = "about" | "email" | "password" | "consent";

export type AuthStep = { name: AuthStepName; fields: (keyof AuthInput)[] };

export const AUTH_STEPS: Record<AuthMode, AuthStep[]> = {
  signup: [
    { name: "about", fields: ["name", "email"] },
    { name: "password", fields: ["password", "confirmPassword"] },
    { name: "consent", fields: ["consent"] },
  ],
  login: [
    { name: "email", fields: ["email"] },
    { name: "password", fields: ["password"] },
  ],
};

export function validateStep(mode: AuthMode, step: number, input: AuthInput): AuthErrors {
  const all = validateAuth(mode, input);
  const errors: AuthErrors = {};
  for (const field of AUTH_STEPS[mode][step]?.fields ?? []) {
    if (all[field]) errors[field] = all[field];
  }
  return errors;
}
