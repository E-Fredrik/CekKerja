import { z } from "zod";
import { signedInUserId } from "../../../lib/cv/store.ts";
import {
  createSnapTransaction,
  fetchMidtransOrderStatus,
  generateOrderId,
  midtransConfig,
} from "../../../lib/billing/midtrans.ts";
import { recordPendingOrder, settlePremiumOrder } from "../../../lib/billing/orders.ts";
import { loadPlanStatus, PREMIUM_PRICE_IDR } from "../../../lib/billing/plan.ts";
import { adminSupabase } from "../../../lib/db/admin.ts";
import { routeSupabase } from "../../../lib/db/server.ts";
import { SignInNeeded } from "../../../lib/http.ts";

const NO_STORE = { "Cache-Control": "private, no-store" };
const orderIdSchema = z.string().regex(/^CK-\d{8}-[a-f0-9]{8}$/);

export async function GET(request: Request) {
  try {
    const db = await routeSupabase();
    if (!db) throw new SignInNeeded();
    const userId = await signedInUserId(db);
    const config = midtransConfig();

    const orderIdParam = new URL(request.url).searchParams.get("orderId");
    if (orderIdParam && config) {
      const parsedOrder = orderIdSchema.safeParse(orderIdParam);
      if (parsedOrder.success) {
        const adminDb = adminSupabase();
        if (adminDb) {
          const { data: ownOrder } = await db
            .from("premium_orders")
            .select("order_id")
            .eq("order_id", parsedOrder.data)
            .eq("user_id", userId)
            .maybeSingle();

          if (ownOrder) {
            const remote = await fetchMidtransOrderStatus(config, parsedOrder.data);
            if (remote) {
              await settlePremiumOrder(adminDb, remote).catch(() => null);
            }
          }
        }
      }
    }

    const plan = await loadPlanStatus(db, userId);
    return Response.json(
      {
        plan,
        configured: Boolean(config && adminSupabase()),
        clientKey: config?.clientKey ?? null,
        snapScriptUrl: config?.snapScriptUrl ?? null,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    const status = error instanceof SignInNeeded ? 401 : 500;
    return Response.json({ error: status === 401 ? "signIn" : "unknown" }, { status, headers: NO_STORE });
  }
}

export async function POST() {
  try {
    const db = await routeSupabase();
    if (!db) throw new SignInNeeded();
    const userId = await signedInUserId(db);

    const { data: authData } = await db.auth.getUser();
    const email = authData.user?.email?.trim();
    if (!email) throw new SignInNeeded();
    const rawName = authData.user?.user_metadata?.name;
    const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : email.split("@")[0];

    const config = midtransConfig();
    const adminDb = adminSupabase();
    if (!config || !adminDb) {
      return Response.json({ error: "notConfigured" }, { status: 503, headers: NO_STORE });
    }

    const orderId = generateOrderId();
    const snap = await createSnapTransaction(config, {
      orderId,
      amount: PREMIUM_PRICE_IDR,
      itemName: "Cek Kerja Premium (30 hari)",
      customer: { name, email },
    });

    await recordPendingOrder(adminDb, {
      orderId,
      userId,
      amount: PREMIUM_PRICE_IDR,
      snapToken: snap.token,
    });

    return Response.json(
      {
        orderId,
        token: snap.token,
        redirectUrl: snap.redirectUrl,
        clientKey: config.clientKey,
        snapScriptUrl: config.snapScriptUrl,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof SignInNeeded) {
      return Response.json({ error: "signIn" }, { status: 401, headers: NO_STORE });
    }
    console.error("pay:", error instanceof Error ? error.message : error);
    return Response.json({ error: "paymentFailed" }, { status: 502, headers: NO_STORE });
  }
}
