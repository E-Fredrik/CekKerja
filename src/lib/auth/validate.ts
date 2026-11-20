import { MIN_SIGNUP_STRENGTH, passwordStrength } from "./password-strength.ts";

export type AuthMode = "login" | "signup";

export const USER_STATUSES = ["student", "graduate", "seeker"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export type AuthInput = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  status: UserStatus | "";
  consent: boolean;
};

export type AuthErrorCode =
  | "nameRequired"
  | "statusRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordShort"
  | "passwordWeak"
  | "passwordMismatch"
  | "consentRequired";

export type AuthErrors = Partial<Record<keyof AuthInput, AuthErrorCode>>;

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isUserStatus = (value: unknown): value is UserStatus =>
  typeof value === "string" && (USER_STATUSES as readonly string[]).includes(value);

export function validateAuth(mode: AuthMode, input: AuthInput): AuthErrors {
  const errors: AuthErrors = {};
  const signup = mode === "signup";

  if (!EMAIL_PATTERN.test(input.email.trim())) errors.email = "emailInvalid";
  if (input.password === "") errors.password = "passwordRequired";
  else if (signup && input.password.length < MIN_PASSWORD_LENGTH) errors.password = "passwordShort";
  else if (signup && passwordStrength(input.password).level < MIN_SIGNUP_STRENGTH) errors.password = "passwordWeak";
  if (signup && input.confirmPassword !== input.password) errors.confirmPassword = "passwordMismatch";
  if (signup && input.name.trim() === "") errors.name = "nameRequired";
  if (signup && !isUserStatus(input.status)) errors.status = "statusRequired";
  if (signup && !input.consent) errors.consent = "consentRequired";

  return errors;
}

export type AuthStepName = "email" | "password" | "profile" | "review";

export type AuthStep = { name: AuthStepName; fields: (keyof AuthInput)[] };

export const AUTH_STEPS: Record<AuthMode, AuthStep[]> = {
  signup: [
    { name: "email", fields: ["email"] },
    { name: "password", fields: ["password", "confirmPassword"] },
    { name: "profile", fields: ["name", "status"] },
    { name: "review", fields: ["consent"] },
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
