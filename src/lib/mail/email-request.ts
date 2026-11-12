import { z } from "zod";
import { contractResultTemplate, jobAdResultTemplate } from "./templates.ts";
import type { MailPayload } from "./send.ts";

export const MAX_EMAIL_REQUEST_BYTES = 256 * 1024;
export const MAX_ITEMS = 80;

const verdict = z.enum(["red", "yellow", "green"]);
const text = (max: number) => z.string().max(max);
const line = (max: number) => z.string().max(max).regex(/^[^\r\n]*$/, "single line only");
const source = z.string().max(300).nullable().optional();

const contractResult = z.object({
  contractType: line(40),
  summary: text(3000),
  clauses: z
    .array(
      z.object({
        title: line(200),
        text: text(6000),
        verdict,
        ruleId: line(80),
        explanation: text(3000),
        source,
        questionToAsk: text(1000).optional(),
      }),
    )
    .max(MAX_ITEMS),
  negotiationMessage: text(6000).optional(),
});

const adResult = z.object({
  role: line(200),
  company: line(200),
  summary: text(3000),
  flags: z
    .array(
      z.object({
        quote: text(3000),
        verdict,
        ruleId: line(80),
        explanation: text(3000),
        source,
        questionToAsk: text(1000),
      }),
    )
    .max(MAX_ITEMS),
  inclusiveRewrite: text(8000).optional(),
});

const base = { to: z.string().trim().max(254).email(), lang: z.enum(["id", "en"]) };

export const EmailRequest = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("contract"), ...base, result: contractResult }),
  z.object({ kind: z.literal("ad"), ...base, result: adResult }),
]);

export type EmailRequest = z.infer<typeof EmailRequest>;
export type EmailKind = EmailRequest["kind"];

export function buildEmail(request: EmailRequest): { to: string; mail: MailPayload } {
  const mail =
    request.kind === "contract"
      ? contractResultTemplate({ ...request.result, lang: request.lang })
      : jobAdResultTemplate({ ...request.result, lang: request.lang });
  return { to: request.to, mail };
}

export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return function allow(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
    return true;
  };
}
