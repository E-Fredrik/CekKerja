import { buildEmail, createRateLimiter, EmailRequest, MAX_EMAIL_REQUEST_BYTES } from "../../../lib/mail/email-request.ts";
import { sendMail } from "../../../lib/mail/send.ts";

const allow = createRateLimiter(5, 10 * 60 * 1000);

const fail = (error: string, status: number) => Response.json({ error }, { status });

function clientKey(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_EMAIL_REQUEST_BYTES) return fail("tooLarge", 413);
  if (!allow(clientKey(req))) return fail("rateLimited", 429);

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
  try {
    await sendMail(to, mail);
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === "SMTP is not configured";
    if (!notConfigured) console.error("email-result:", error instanceof Error ? error.message : error);
    return fail(notConfigured ? "notConfigured" : "sendFailed", notConfigured ? 503 : 502);
  }

  return Response.json({ ok: true });
}
