import { isUserStatus, type AuthInput, type AuthMode, type UserStatus } from "./validate.ts";

export type SessionUser = { name: string; email: string; status?: UserStatus };

const MAX_FIELD_LENGTH = 200;

const isShortText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && value.length <= MAX_FIELD_LENGTH;

export function parseStoredUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const { name, email, status } = data as Record<string, unknown>;
    if (!isShortText(name) || !isShortText(email)) return null;
    return isUserStatus(status) ? { name, email, status } : { name, email };
  } catch {
    return null;
  }
}

export function userFromInput(mode: AuthMode, input: AuthInput): SessionUser {
  const email = input.email.trim();
  if (mode === "login") return { name: email.split("@")[0], email };
  const name = input.name.trim();
  return isUserStatus(input.status) ? { name, email, status: input.status } : { name, email };
}
