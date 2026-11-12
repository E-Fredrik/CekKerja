import type { AuthInput, AuthMode } from "./validate.ts";

export type SessionUser = { name: string; email: string };

const MAX_FIELD_LENGTH = 200;

const isShortText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && value.length <= MAX_FIELD_LENGTH;

export function parseStoredUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const { name, email } = data as Record<string, unknown>;
    return isShortText(name) && isShortText(email) ? { name, email } : null;
  } catch {
    return null;
  }
}

export function userFromInput(mode: AuthMode, input: AuthInput): SessionUser {
  const email = input.email.trim();
  const name = mode === "signup" ? input.name.trim() : email.split("@")[0];
  return { name, email };
}
