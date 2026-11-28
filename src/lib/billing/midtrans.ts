import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export type MidtransConfig = {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  snapApiUrl: string;
  snapScriptUrl: string;
  coreApiUrl: string;
};

export function midtransConfig(): MidtransConfig | null {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY ?? process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY)?.trim();
  if (!serverKey || !clientKey) return null;

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION?.trim().toLowerCase() === "true";
  return {
    serverKey,
    clientKey,
    isProduction,
    snapApiUrl: isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions",
    snapScriptUrl: isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js",
    coreApiUrl: isProduction
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2",
  };
}

export function generateOrderId(now = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randPart = randomBytes(4).toString("hex");
  return `CK-${datePart}-${randPart}`;
}

const SnapResponseSchema = z.object({
  token: z.string().min(1),
  redirect_url: z.url(),
});

export type CreateSnapInput = {
  orderId: string;
  amount: number;
  itemName: string;
  customer: { name: string; email: string };
};

export async function createSnapTransaction(
  config: MidtransConfig,
  input: CreateSnapInput,
  fetcher: typeof fetch = fetch,
): Promise<{ token: string; redirectUrl: string }> {
  const auth = Buffer.from(`${config.serverKey}:`).toString("base64");
  const res = await fetcher(config.snapApiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.amount,
      },
      item_details: [
        {
          id: "cekkerja-premium-30d",
          price: input.amount,
          quantity: 1,
          name: input.itemName.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: input.customer.name.slice(0, 50),
        email: input.customer.email,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Midtrans Snap error (${res.status})`);
  }

  const parsed = SnapResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("Unexpected Midtrans Snap response");
  }

  return { token: parsed.data.token, redirectUrl: parsed.data.redirect_url };
}

export const MidtransNotificationSchema = z.object({
  order_id: z.string().min(1).max(100),
  status_code: z.string().min(1).max(10),
  gross_amount: z.string().min(1).max(30),
  signature_key: z.string().min(1).max(200),
  transaction_status: z.string().min(1).max(40),
  fraud_status: z.string().max(40).optional(),
  payment_type: z.string().max(40).optional(),
  transaction_id: z.string().max(100).optional(),
});

export type MidtransNotification = z.infer<typeof MidtransNotificationSchema>;

export function verifyMidtransSignature(
  payload: Pick<MidtransNotification, "order_id" | "status_code" | "gross_amount" | "signature_key">,
  serverKey: string,
): boolean {
  const expected = createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
    .digest("hex");

  const actualBuf = Buffer.from(payload.signature_key.toLowerCase(), "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}

export type OrderStatus = "pending" | "paid" | "failed" | "expired";

export function mapMidtransStatus(transactionStatus: string, fraudStatus?: string): OrderStatus {
  switch (transactionStatus) {
    case "capture":
      if (fraudStatus === "accept") return "paid";
      if (fraudStatus === "deny") return "failed";
      return "pending";
    case "settlement":
      return "paid";
    case "expire":
      return "expired";
    case "cancel":
    case "deny":
    case "failure":
      return "failed";
    default:
      return "pending";
  }
}

const CoreStatusSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  transaction_status: z.string().min(1),
  fraud_status: z.string().optional(),
  payment_type: z.string().optional(),
  transaction_id: z.string().optional(),
});

export async function fetchMidtransOrderStatus(
  config: MidtransConfig,
  orderId: string,
  fetcher: typeof fetch = fetch,
) {
  const auth = Buffer.from(`${config.serverKey}:`).toString("base64");
  const res = await fetcher(`${config.coreApiUrl}/${encodeURIComponent(orderId)}/status`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
  });
  if (!res.ok) return null;
  const parsed = CoreStatusSchema.safeParse(await res.json());
  return parsed.success ? parsed.data : null;
}
