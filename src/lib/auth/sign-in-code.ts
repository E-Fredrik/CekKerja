import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const RESEND_GAP_MS = 60 * 1000;
export const MAX_SENDS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

export function generateCode(random: (max: number) => number = randomInt): string {
  return String(random(10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export function hashCode(secret: string, challengeId: string, code: string): string {
  return createHmac("sha256", secret).update(`${challengeId}:${code}`).digest("hex");
}

export function codesMatch(expectedHash: string, actualHash: string): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && expected.length > 0 && timingSafeEqual(expected, actual);
}

export type Challenge = { expiresAt: Date; attempts: number; usedAt: Date | null };

export type ChallengeState = "open" | "expired" | "locked" | "used";

export function challengeState(challenge: Challenge, now: Date): ChallengeState {
  if (challenge.usedAt) return "used";
  if (challenge.attempts >= MAX_ATTEMPTS) return "locked";
  if (now.getTime() >= challenge.expiresAt.getTime()) return "expired";
  return "open";
}

export type SendDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function canSendCode(sentAt: Date[], now: Date): SendDecision {
  const t = now.getTime();
  const lastHour = sentAt.map((d) => d.getTime()).filter((s) => s <= t && t - s < HOUR_MS).sort((a, b) => b - a);
  if (lastHour.length > 0 && t - lastHour[0] < RESEND_GAP_MS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((RESEND_GAP_MS - (t - lastHour[0])) / 1000) };
  }
  if (lastHour.length >= MAX_SENDS_PER_HOUR) {
    const oldest = lastHour[MAX_SENDS_PER_HOUR - 1];
    return { allowed: false, retryAfterSeconds: Math.ceil((HOUR_MS - (t - oldest)) / 1000) };
  }
  return { allowed: true };
}
