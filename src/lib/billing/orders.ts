import type { SupabaseClient } from "@supabase/supabase-js";
import { mapMidtransStatus, type OrderStatus } from "./midtrans.ts";
import { extendPremiumUntil } from "./plan.ts";

export type OrderSettlementInput = {
  order_id: string;
  gross_amount: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
};

export async function recordPendingOrder(
  db: SupabaseClient,
  input: { orderId: string; userId: string; amount: number; snapToken: string },
) {
  const { error } = await db.from("premium_orders").insert({
    order_id: input.orderId,
    user_id: input.userId,
    amount: input.amount,
    status: "pending",
    snap_token: input.snapToken,
  });
  if (error) throw new Error("Could not save payment order");
}

export async function settlePremiumOrder(
  db: SupabaseClient,
  input: OrderSettlementInput,
  now = new Date(),
): Promise<{ status: OrderStatus; userId: string } | null> {
  const { data: order, error: orderErr } = await db
    .from("premium_orders")
    .select("order_id, user_id, amount, status")
    .eq("order_id", input.order_id)
    .maybeSingle();

  if (orderErr) throw new Error("Could not load payment order");
  if (!order) return null;

  const expectedAmount = Number(order.amount);
  const receivedAmount = Math.round(Number(input.gross_amount));
  if (!Number.isFinite(receivedAmount) || receivedAmount !== expectedAmount) {
    throw new Error("Order amount mismatch");
  }

  const nextStatus = mapMidtransStatus(input.transaction_status, input.fraud_status);
  if (order.status === "paid") {
    return { status: "paid", userId: order.user_id };
  }

  const nowIso = now.toISOString();
  const { error: updateErr } = await db
    .from("premium_orders")
    .update({
      status: nextStatus,
      payment_type: input.payment_type ?? null,
      midtrans_transaction_id: input.transaction_id ?? null,
      paid_at: nextStatus === "paid" ? nowIso : null,
      updated_at: nowIso,
    })
    .eq("order_id", input.order_id);

  if (updateErr) throw new Error("Could not update payment order");

  if (nextStatus === "paid") {
    const { data: sub, error: subErr } = await db
      .from("premium_subscriptions")
      .select("premium_until")
      .eq("user_id", order.user_id)
      .maybeSingle();

    if (subErr) throw new Error("Could not load subscription");

    const premiumUntil = extendPremiumUntil(sub?.premium_until ?? null, now);
    const { error: upsertErr } = await db.from("premium_subscriptions").upsert(
      {
        user_id: order.user_id,
        premium_until: premiumUntil,
        updated_at: nowIso,
      },
      { onConflict: "user_id" },
    );

    if (upsertErr) throw new Error("Could not activate premium");
  }

  return { status: nextStatus, userId: order.user_id };
}
