import { NO_STORE, VerifyRequest, clientKey, fail, readJson } from "../../../../lib/auth/account-api.ts";
import { checkSignInCode } from "../../../../lib/auth/challenges.ts";
import { normalizeCode } from "../../../../lib/auth/validate.ts";
import { adminSupabase, serverSecret } from "../../../../lib/db/admin.ts";
import { routeSupabase } from "../../../../lib/db/server.ts";
import { createRateLimiter } from "../../../../lib/mail/email-request.ts";

const allowIp = createRateLimiter(30, 10 * 60 * 1000);

export async function POST(req: Request) {
  if (!allowIp(clientKey(req))) return fail("rateLimited", 429);
  const parsed = VerifyRequest.safeParse(await readJson(req));
  if (!parsed.success) return fail("invalid", 400);
  const code = normalizeCode(parsed.data.code);
  if (!code) return fail("codeInvalid", 400);

  const admin = adminSupabase();
  const secret = serverSecret();
  const session = await routeSupabase();
  if (!admin || !secret || !session) return fail("notConfigured", 503);

  const result = await checkSignInCode(admin, secret, parsed.data.challengeId, code);
  if (!result.ok) {
    return result.reason === "wrong"
      ? fail("codeWrong", 400, { attemptsLeft: result.attemptsLeft })
      : fail("codeExpired", 410);
  }

  const { data: found } = await admin.auth.admin.getUserById(result.userId);
  const email = found.user?.email;
  if (!email) return fail("unknown", 500);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link.properties?.hashed_token) return fail("unknown", 500);
  const { error } = await session.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (error) return fail("unknown", 500);

  return Response.json({ ok: true }, { headers: NO_STORE });
}
