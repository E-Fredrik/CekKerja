import { createServerClient } from "@supabase/ssr";
import { loadPlanStatus } from "../../../lib/billing/plan.ts";
import { signedInUserId } from "../../../lib/cv/store.ts";
import { supabaseConfig } from "../../../lib/db/config.ts";
import { SignInNeeded } from "../../../lib/http.ts";
import { buildEmail, createRateLimiter, EmailRequest, MAX_EMAIL_REQUEST_BYTES } from "../../../lib/mail/email-request.ts";
import { sendMail } from "../../../lib/mail/send.ts";

const allowIp = createRateLimiter(5, 10 * 60 * 1000);
const allowRecipient = createRateLimiter(3, 60 * 60 * 1000);
const allowAll = createRateLimiter(100, 60 * 60 * 1000);

const fail = (error: string, status: number) => Response.json({ error }, { status });

function clientKey(req: Request) {
  return req.headers.get("x-real-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
}

function parseCookies(header: string | null) {
  if (!header) return [];
  return header.split(";").flatMap((part) => {
    const idx = part.indexOf("=");
    if (idx <= 0) return [];
    return [{ name: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() }];
  });
}

async function requirePremiumIfConfigured(req: Request): Promise<Response | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const db = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => parseCookies(req.headers.get("cookie")),
      setAll: () => {},
    },
  });

  try {
    const userId = await signedInUserId(db);
    const plan = await loadPlanStatus(db, userId);
    if (!plan.isPremium) return fail("premiumRequired", 403);
    return null;
  } catch (error) {
    if (error instanceof SignInNeeded) return fail("signIn", 401);
    return fail("sendFailed", 500);
  }
}

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_EMAIL_REQUEST_BYTES) return fail("tooLarge", 413);
  if (!allowIp(clientKey(req))) return fail("rateLimited", 429);

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_EMAIL_REQUEST_BYTES) return fail("tooLarge", 413);
    body = JSON.parse(raw);
  } catch {
    return fail("invalid", 400);
  }

  const parsed = EmailRequest.safeParse(body);
  if (!parsed.success) {
    const badEmail = parsed.error.issues.some((issue) => issue.path[0] === "to");
    return fail(badEmail ? "emailInvalid" : "invalid", 400);
  }

  const { to, mail } = buildEmail(parsed.data);
  if (!allowRecipient(to.toLowerCase()) || !allowAll("all")) return fail("rateLimited", 429);

  const blocked = await requirePremiumIfConfigured(req);
  if (blocked) return blocked;

  try {
    await sendMail(to, mail);
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === "SMTP is not configured";
    if (!notConfigured) console.error("email-result:", error instanceof Error ? error.message : error);
    return fail(notConfigured ? "notConfigured" : "sendFailed", notConfigured ? 503 : 502);
  }

  return Response.json({ ok: true });
}
