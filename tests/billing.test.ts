import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  createSnapTransaction,
  generateOrderId,
  mapMidtransStatus,
  MidtransNotificationSchema,
  verifyMidtransSignature,
} from "../src/lib/billing/midtrans.ts";
import { settlePremiumOrder } from "../src/lib/billing/orders.ts";
import {
  canRunCheck,
  extendPremiumUntil,
  FREE_MONTHLY_LIMIT,
  isPremiumActive,
  monthWindowStart,
} from "../src/lib/billing/plan.ts";

test("monthWindowStart returns the first day of the current month in WIB as UTC", () => {
  const earlyWib = new Date("2026-11-01T00:30:00+07:00");
  assert.equal(monthWindowStart(earlyWib), "2026-10-31T17:00:00.000Z");

  const lateUtcPrevMonth = new Date("2026-10-31T18:00:00.000Z");
  assert.equal(monthWindowStart(lateUtcPrevMonth), "2026-10-31T17:00:00.000Z");
});

test("isPremiumActive and extendPremiumUntil handle active, expired, and null dates", () => {
  const now = new Date("2026-11-25T10:00:00.000Z");
  assert.equal(isPremiumActive(null, now), false);
  assert.equal(isPremiumActive("2026-11-24T10:00:00.000Z", now), false);
  assert.equal(isPremiumActive("2026-12-01T10:00:00.000Z", now), true);

  assert.equal(extendPremiumUntil(null, now), "2026-12-25T10:00:00.000Z");
  assert.equal(extendPremiumUntil("2026-11-20T10:00:00.000Z", now), "2026-12-25T10:00:00.000Z");
  assert.equal(extendPremiumUntil("2026-12-05T10:00:00.000Z", now), "2027-01-04T10:00:00.000Z");
});

test("canRunCheck enforces monthly limit and smart mode for free accounts", () => {
  assert.deepEqual(canRunCheck({ isPremium: false, checksThisMonth: 0, monthlyLimit: FREE_MONTHLY_LIMIT }, "fast"), {
    allowed: true,
  });
  assert.deepEqual(canRunCheck({ isPremium: false, checksThisMonth: 5, monthlyLimit: FREE_MONTHLY_LIMIT }, "fast"), {
    allowed: false,
    reason: "limitReached",
  });
  assert.deepEqual(canRunCheck({ isPremium: false, checksThisMonth: 0, monthlyLimit: FREE_MONTHLY_LIMIT }, "smart"), {
    allowed: false,
    reason: "premiumRequired",
  });
  assert.deepEqual(canRunCheck({ isPremium: true, checksThisMonth: 99, monthlyLimit: FREE_MONTHLY_LIMIT }, "smart"), {
    allowed: true,
  });
});

test("generateOrderId produces Midtrans-safe unique order IDs", () => {
  const id = generateOrderId(new Date("2026-11-25T00:00:00.000Z"));
  assert.match(id, /^CK-20261125-[a-f0-9]{8}$/);
});

test("verifyMidtransSignature validates SHA-512 signatures and rejects tampering", () => {
  const serverKey = "SB-Mid-server-test-key";
  const order_id = "CK-20261125-1234abcd";
  const status_code = "200";
  const gross_amount = "15000.00";
  const signature_key = createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest("hex");

  assert.equal(verifyMidtransSignature({ order_id, status_code, gross_amount, signature_key }, serverKey), true);
  assert.equal(
    verifyMidtransSignature({ order_id, status_code, gross_amount: "1000.00", signature_key }, serverKey),
    false,
  );
  assert.equal(verifyMidtransSignature({ order_id, status_code, gross_amount, signature_key }, "wrong-key"), false);
});

test("mapMidtransStatus maps transaction and fraud statuses accurately", () => {
  assert.equal(mapMidtransStatus("settlement"), "paid");
  assert.equal(mapMidtransStatus("capture", "accept"), "paid");
  assert.equal(mapMidtransStatus("capture", "challenge"), "pending");
  assert.equal(mapMidtransStatus("capture", "deny"), "failed");
  assert.equal(mapMidtransStatus("pending"), "pending");
  assert.equal(mapMidtransStatus("expire"), "expired");
  assert.equal(mapMidtransStatus("cancel"), "failed");
  assert.equal(mapMidtransStatus("deny"), "failed");
});

test("MidtransNotificationSchema accepts valid payloads and rejects missing fields", () => {
  const valid = MidtransNotificationSchema.safeParse({
    order_id: "CK-20261125-1234abcd",
    status_code: "200",
    gross_amount: "15000.00",
    signature_key: "abc",
    transaction_status: "settlement",
  });
  assert.equal(valid.success, true);

  const invalid = MidtransNotificationSchema.safeParse({ order_id: "CK-1" });
  assert.equal(invalid.success, false);
});

test("createSnapTransaction sends Basic auth and validates Snap response", async () => {
  let seenAuth = "";
  const mockFetch = (async (_url: unknown, init?: RequestInit) => {
    seenAuth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
    return new Response(JSON.stringify({ token: "snap-tok-123", redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-tok-123" }), {
      status: 201,
    });
  }) as typeof fetch;

  const result = await createSnapTransaction(
    {
      serverKey: "SB-Mid-server-abc",
      clientKey: "SB-Mid-client-xyz",
      isProduction: false,
      snapApiUrl: "https://app.sandbox.midtrans.com/snap/v1/transactions",
      snapScriptUrl: "https://app.sandbox.midtrans.com/snap/snap.js",
      coreApiUrl: "https://api.sandbox.midtrans.com/v2",
    },
    {
      orderId: "CK-20261125-1234abcd",
      amount: 15000,
      itemName: "Cek Kerja Premium (30 hari)",
      customer: { name: "Budi", email: "budi@example.com" },
    },
    mockFetch,
  );

  assert.equal(seenAuth, `Basic ${Buffer.from("SB-Mid-server-abc:").toString("base64")}`);
  assert.equal(result.token, "snap-tok-123");
});

test("settlePremiumOrder activates premium once and is idempotent on duplicate webhooks", async () => {
  const state = {
    order: { order_id: "CK-20261125-aaaa1111", user_id: "user-1", amount: 15000, status: "pending" },
    sub: null as { user_id: string; premium_until: string } | null,
    upserts: 0,
    failUpsert: false,
  };

  const fakeDb = {
    from(table: string) {
      if (table === "premium_orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { ...state.order }, error: null }),
            }),
          }),
          update: (values: { status: string }) => ({
            eq: () => ({
              neq: () => ({
                select: async () => {
                  if (state.order.status === "paid") return { data: [], error: null };
                  state.order.status = values.status;
                  return { data: [{ order_id: state.order.order_id }], error: null };
                },
              }),
              then: (resolve: (value: { error: null }) => void) => {
                state.order.status = values.status;
                resolve({ error: null });
              },
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.sub, error: null }),
          }),
        }),
        upsert: async (values: { user_id: string; premium_until: string }) => {
          if (state.failUpsert) return { error: { message: "down" } };
          state.upserts += 1;
          state.sub = values;
          return { error: null };
        },
      };
    },
  } as never;

  const now = new Date("2026-11-25T10:00:00.000Z");
  const first = await settlePremiumOrder(
    fakeDb,
    { order_id: state.order.order_id, gross_amount: "15000.00", transaction_status: "settlement" },
    now,
  );
  assert.deepEqual(first, { status: "paid", userId: "user-1" });
  assert.equal(state.upserts, 1);
  assert.equal(state.sub?.premium_until, "2026-12-25T10:00:00.000Z");

  const second = await settlePremiumOrder(
    fakeDb,
    { order_id: state.order.order_id, gross_amount: "15000.00", transaction_status: "settlement" },
    now,
  );
  assert.deepEqual(second, { status: "paid", userId: "user-1" });
  assert.equal(state.upserts, 1);

  state.order.status = "pending";
  state.failUpsert = true;
  await assert.rejects(
    settlePremiumOrder(fakeDb, { order_id: state.order.order_id, gross_amount: "15000.00", transaction_status: "settlement" }, now),
    /Could not activate premium/,
  );
  assert.equal(state.order.status, "pending");
  state.failUpsert = false;
  const retried = await settlePremiumOrder(
    fakeDb,
    { order_id: state.order.order_id, gross_amount: "15000.00", transaction_status: "settlement" },
    now,
  );
  assert.deepEqual(retried, { status: "paid", userId: "user-1" });
  assert.equal(state.upserts, 2);
});
