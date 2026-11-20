import { isUserStatus, type UserStatus } from "./validate.ts";

export type SessionUser = { name: string; email: string; status?: UserStatus };

export type AuthUserLike = { email?: string | null; user_metadata?: Record<string, unknown> | null };

const MAX_FIELD_LENGTH = 200;

const isShortText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && value.length <= MAX_FIELD_LENGTH;

export function userFromAuth(user: AuthUserLike | null | undefined): SessionUser | null {
  const email = user?.email?.trim();
  if (!isShortText(email)) return null;
  const metadata = user?.user_metadata ?? {};
  const name = isShortText(metadata.name) ? metadata.name.trim() : email.split("@")[0];
  return isUserStatus(metadata.status) ? { name, email, status: metadata.status } : { name, email };
}

export type AuthServerError =
  | "invalidCredentials"
  | "emailTaken"
  | "weakPassword"
  | "rateLimited"
  | "emailNotConfirmed"
  | "notConfigured"
  | "unknown";

export function authServerError(error: { code?: string; status?: number } | null | undefined): AuthServerError {
  switch (error?.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "user_already_exists":
    case "email_exists":
      return "emailTaken";
    case "weak_password":
      return "weakPassword";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";
    case "email_not_confirmed":
      return "emailNotConfirmed";
  }
  return error?.status === 429 ? "rateLimited" : "unknown";
}
