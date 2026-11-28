import {
  MidtransNotificationSchema,
  midtransConfig,
  verifyMidtransSignature,
} from "../../../lib/billing/midtrans.ts";
import { settlePremiumOrder } from "../../../lib/billing/orders.ts";
import { adminSupabase } from "../../../lib/db/admin.ts";

const MAX_WEBHOOK_BYTES = 16 * 1024;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(req: Request) {
  const config = midtransConfig();
  const adminDb = adminSupabase();
  if (!config || !adminDb) {
    return Response.json({ error: "notConfigured" }, { status: 503, headers: NO_STORE });
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "tooLarge" }, { status: 413, headers: NO_STORE });
  }

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_WEBHOOK_BYTES) {
      return Response.json({ error: "tooLarge" }, { status: 413, headers: NO_STORE });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalidJson" }, { status: 400, headers: NO_STORE });
  }

  const parsed = MidtransNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalidPayload" }, { status: 400, headers: NO_STORE });
  }

  if (!verifyMidtransSignature(parsed.data, config.serverKey)) {
    return Response.json({ error: "invalidSignature" }, { status: 403, headers: NO_STORE });
  }

  try {
    await settlePremiumOrder(adminDb, parsed.data);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error("midtrans:", error instanceof Error ? error.message : error);
    return Response.json({ error: "settlementFailed" }, { status: 400, headers: NO_STORE });
  }
}
