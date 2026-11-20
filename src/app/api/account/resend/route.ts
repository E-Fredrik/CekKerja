import { NO_STORE, ResendRequest, clientKey, fail, isSmtpMissing, readJson } from "../../../../lib/auth/account-api.ts";
import { challengeOwner, sendSignInCode } from "../../../../lib/auth/challenges.ts";
import { adminSupabase, serverSecret } from "../../../../lib/db/admin.ts";
import { createRateLimiter } from "../../../../lib/mail/email-request.ts";

const allowIp = createRateLimiter(10, 10 * 60 * 1000);

export async function POST(req: Request) {
  if (!allowIp(clientKey(req))) return fail("rateLimited", 429);
  const parsed = ResendRequest.safeParse(await readJson(req));
  if (!parsed.success) return fail("invalid", 400);

  const admin = adminSupabase();
  const secret = serverSecret();
  if (!admin || !secret) return fail("notConfigured", 503);

  const userId = await challengeOwner(admin, parsed.data.challengeId);
  if (!userId) return fail("codeExpired", 410);
  const { data } = await admin.auth.admin.getUserById(userId);
  if (!data.user?.email) return fail("codeExpired", 410);

  try {
    const sent = await sendSignInCode(admin, secret, { id: userId, email: data.user.email }, parsed.data.lang);
    if (!sent.ok) return fail("resendWait", 429, { retryAfterSeconds: sent.retryAfterSeconds });
    return Response.json({ challengeId: sent.challengeId }, { headers: NO_STORE });
  } catch (sendError) {
    if (isSmtpMissing(sendError)) return fail("mailNotConfigured", 503);
    console.error("account resend: code could not be sent");
    return fail("sendFailed", 502);
  }
}
