import { z } from "zod";
import { USER_STATUSES } from "./validate.ts";

export const MAX_ACCOUNT_REQUEST_BYTES = 8 * 1024;

const email = z.string().trim().min(3).max(254);
const lang = z.enum(["id", "en"]);

export const SignInRequest = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("login"), email, password: z.string().min(1).max(200), lang }),
  z.object({
    mode: z.literal("signup"),
    email,
    password: z.string().min(1).max(200),
    name: z.string().trim().min(1).max(200),
    status: z.enum(USER_STATUSES),
    lang,
  }),
]);

export const VerifyRequest = z.object({ challengeId: z.uuid(), code: z.string().max(20) });

export const ResendRequest = z.object({ challengeId: z.uuid(), lang });

export const NO_STORE = { "cache-control": "private, no-store, max-age=0" };

export const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  Response.json({ error, ...extra }, { status, headers: NO_STORE });

export function clientKey(req: Request): string {
  return req.headers.get("x-real-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
}

export async function readJson(req: Request): Promise<unknown | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_ACCOUNT_REQUEST_BYTES) return null;
  try {
    const raw = await req.text();
    return raw.length > MAX_ACCOUNT_REQUEST_BYTES ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export const isSmtpMissing = (error: unknown) => error instanceof Error && error.message === "SMTP is not configured";
