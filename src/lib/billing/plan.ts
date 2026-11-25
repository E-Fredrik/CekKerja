import type { SupabaseClient } from "@supabase/supabase-js";

export const FREE_MONTHLY_LIMIT = 5;
export const PREMIUM_PRICE_IDR = 15000;
export const PREMIUM_DAYS = 30;

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PlanStatus = {
  plan: "free" | "premium";
  isPremium: boolean;
  premiumUntil: string | null;
  checksThisMonth: number;
  monthlyLimit: number;
  remainingChecks: number | null;
};

export function monthWindowStart(now = new Date()): string {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const startUtcMs = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1, 0, 0, 0) - WIB_OFFSET_MS;
  return new Date(startUtcMs).toISOString();
}

export function isPremiumActive(premiumUntil: string | Date | null | undefined, now = new Date()): boolean {
  if (!premiumUntil) return false;
  const untilMs = new Date(premiumUntil).getTime();
  return Number.isFinite(untilMs) && untilMs > now.getTime();
}

export function extendPremiumUntil(currentUntil: string | Date | null | undefined, now = new Date()): string {
  const baseMs = isPremiumActive(currentUntil, now)
    ? new Date(currentUntil as string | Date).getTime()
    : now.getTime();
  return new Date(baseMs + PREMIUM_DAYS * DAY_MS).toISOString();
}

export function canRunCheck(
  status: Pick<PlanStatus, "isPremium" | "checksThisMonth" | "monthlyLimit">,
  mode: "fast" | "smart",
): { allowed: true } | { allowed: false; reason: "limitReached" | "premiumRequired" } {
  if (status.isPremium) return { allowed: true };
  if (mode === "smart") return { allowed: false, reason: "premiumRequired" };
  if (status.checksThisMonth >= status.monthlyLimit) return { allowed: false, reason: "limitReached" };
  return { allowed: true };
}

export async function loadPlanStatus(
  db: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<PlanStatus> {
  const since = monthWindowStart(now);
  const [subRes, countRes] = await Promise.all([
    db.from("premium_subscriptions").select("premium_until").eq("user_id", userId).maybeSingle(),
    db
      .from("check_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since),
  ]);

  if (subRes.error) throw new Error("Could not load subscription status");
  if (countRes.error) throw new Error("Could not load monthly usage");

  const premiumUntil = typeof subRes.data?.premium_until === "string" ? subRes.data.premium_until : null;
  const isPremium = isPremiumActive(premiumUntil, now);
  const checksThisMonth = countRes.count ?? 0;

  return {
    plan: isPremium ? "premium" : "free",
    isPremium,
    premiumUntil: isPremium ? premiumUntil : null,
    checksThisMonth,
    monthlyLimit: FREE_MONTHLY_LIMIT,
    remainingChecks: isPremium ? null : Math.max(0, FREE_MONTHLY_LIMIT - checksThisMonth),
  };
}
