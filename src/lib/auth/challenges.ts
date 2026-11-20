import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "../i18n.ts";
import { sendMail } from "../mail/send.ts";
import { signInCodeTemplate } from "../mail/templates.ts";
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  canSendCode,
  challengeState,
  codesMatch,
  generateCode,
  hashCode,
} from "./sign-in-code.ts";

const TABLE = "sign_in_codes";
const HOUR_MS = 60 * 60 * 1000;

type Row = { id: string; user_id: string; code_hash: string; expires_at: string; attempts: number; used_at: string | null };

export type SendResult = { ok: true; challengeId: string } | { ok: false; retryAfterSeconds: number };

export async function sendSignInCode(
  admin: SupabaseClient,
  secret: string,
  user: { id: string; email: string },
  lang: Lang,
): Promise<SendResult> {
  const now = new Date();
  const { data: recent, error } = await admin
    .from(TABLE)
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", new Date(now.getTime() - HOUR_MS).toISOString());
  if (error) throw new Error("sign_in_codes lookup failed");

  const decision = canSendCode((recent ?? []).map((row) => new Date(row.created_at as string)), now);
  if (!decision.allowed) return { ok: false, retryAfterSeconds: decision.retryAfterSeconds };

  await admin.from(TABLE).update({ used_at: now.toISOString() }).eq("user_id", user.id).is("used_at", null);

  const challengeId = randomUUID();
  const code = generateCode();
  const { error: insertError } = await admin.from(TABLE).insert({
    id: challengeId,
    user_id: user.id,
    code_hash: hashCode(secret, challengeId, code),
    expires_at: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
  });
  if (insertError) throw new Error("sign_in_codes insert failed");

  try {
    await sendMail(user.email, signInCodeTemplate(code, lang));
  } catch (sendError) {
    await admin.from(TABLE).delete().eq("id", challengeId);
    throw sendError;
  }
  return { ok: true, challengeId };
}

export type CheckResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "wrong"; attemptsLeft: number }
  | { ok: false; reason: "expired" | "locked" | "used" | "missing" };

export async function checkSignInCode(admin: SupabaseClient, secret: string, challengeId: string, code: string): Promise<CheckResult> {
  for (let round = 0; round < MAX_ATTEMPTS; round++) {
    const { data, error } = await admin.from(TABLE).select("*").eq("id", challengeId).maybeSingle<Row>();
    if (error) throw new Error("sign_in_codes lookup failed");
    if (!data) return { ok: false, reason: "missing" };

    const state = challengeState(
      { expiresAt: new Date(data.expires_at), attempts: data.attempts, usedAt: data.used_at ? new Date(data.used_at) : null },
      new Date(),
    );
    if (state !== "open") return { ok: false, reason: state };

    const attempts = data.attempts + 1;
    const { data: claimed } = await admin
      .from(TABLE)
      .update({ attempts })
      .eq("id", challengeId)
      .eq("attempts", data.attempts)
      .is("used_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    if (!codesMatch(data.code_hash, hashCode(secret, challengeId, code))) {
      return attempts >= MAX_ATTEMPTS ? { ok: false, reason: "locked" } : { ok: false, reason: "wrong", attemptsLeft: MAX_ATTEMPTS - attempts };
    }

    const { data: used } = await admin
      .from(TABLE)
      .update({ used_at: new Date().toISOString() })
      .eq("id", challengeId)
      .is("used_at", null)
      .select("id");
    return used && used.length > 0 ? { ok: true, userId: data.user_id } : { ok: false, reason: "used" };
  }
  return { ok: false, reason: "locked" };
}

export async function challengeOwner(admin: SupabaseClient, challengeId: string): Promise<string | null> {
  const { data } = await admin.from(TABLE).select("user_id").eq("id", challengeId).maybeSingle<{ user_id: string }>();
  return data?.user_id ?? null;
}
