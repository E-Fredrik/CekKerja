import { NO_STORE, SignInRequest, clientKey, fail, isSmtpMissing, readJson } from "../../../../lib/auth/account-api.ts";
import { sendSignInCode } from "../../../../lib/auth/challenges.ts";
import { authServerError } from "../../../../lib/auth/session-user.ts";
import { validateAuth } from "../../../../lib/auth/validate.ts";
import { adminSupabase, passwordCheckSupabase, serverSecret } from "../../../../lib/db/admin.ts";
import { createRateLimiter } from "../../../../lib/mail/email-request.ts";

const allowIp = createRateLimiter(10, 10 * 60 * 1000);

export async function POST(req: Request) {
  if (!allowIp(clientKey(req))) return fail("rateLimited", 429);
  const parsed = SignInRequest.safeParse(await readJson(req));
  if (!parsed.success) return fail("invalid", 400);
  const body = parsed.data;

  const input =
    body.mode === "signup"
      ? { email: body.email, password: body.password, confirmPassword: body.password, name: body.name, status: body.status, consent: true }
      : { email: body.email, password: body.password, confirmPassword: "", name: "", status: "" as const, consent: false };
  if (Object.keys(validateAuth(body.mode, input)).length > 0) return fail("invalid", 400);

  const admin = adminSupabase();
  const secret = serverSecret();
  const checker = passwordCheckSupabase();
  if (!admin || !secret || !checker) return fail("notConfigured", 503);

  const email = body.email.trim();
  const { data, error } =
    body.mode === "signup"
      ? await checker.auth.signUp({ email, password: body.password, options: { data: { name: body.name, status: body.status } } })
      : await checker.auth.signInWithPassword({ email, password: body.password });
  if (data.session) await checker.auth.signOut();
  if (error || !data.user?.email) return fail(error ? authServerError(error) : "unknown", error?.status === 429 ? 429 : 400);

  try {
    const sent = await sendSignInCode(admin, secret, { id: data.user.id, email: data.user.email }, body.lang);
    if (!sent.ok) return fail("resendWait", 429, { retryAfterSeconds: sent.retryAfterSeconds });
    return Response.json({ challengeId: sent.challengeId }, { headers: NO_STORE });
  } catch (sendError) {
    if (isSmtpMissing(sendError)) return fail("mailNotConfigured", 503);
    console.error("account sign-in: code could not be sent");
    return fail("sendFailed", 502);
  }
}
