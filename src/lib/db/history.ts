import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { Verdict } from "../ai/schemas.ts";

const TABLE = "check_history";
const PAGE_SIZE = 20;
const text = z.string().max(120);
const summary = z.string().max(800);
const count = z.number().int().nonnegative();
const counts = z.object({ red: count, yellow: count, green: count });
const employer = { role: text, company: text };

export const historyKind = z.enum(["ad", "contract", "interview"]);
type HistoryKind = z.infer<typeof historyKind>;

const entrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ad"), ...employer, summary, counts }),
  z.object({ kind: z.literal("contract"), summary, counts }),
  z.object({ kind: z.literal("interview"), ...employer, questionCount: count }),
]);

export const historyCursor = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
});

const historyRow = historyCursor.extend({ entry: entrySchema });

type Entry = z.infer<typeof entrySchema>;
type Cursor = z.infer<typeof historyCursor>;
export type HistoryRow = z.infer<typeof historyRow>;
export type HistoryPage = { rows: HistoryRow[]; next: Cursor | null };

const label = z.string().trim().transform((value) => value.slice(0, 120).toWellFormed());
const summaryText = z.string().trim().transform((value) => value.slice(0, 800).toWellFormed());
const labels = { role: label, company: label };
const verdicts = z.array(z.object({ verdict: Verdict })).transform((findings) => {
  const totals = { red: 0, yellow: 0, green: 0 };
  for (const { verdict } of findings) totals[verdict]++;
  return totals;
});
const adResult = z.object({ ...labels, summary: summaryText, flags: verdicts });
const contractResult = z.object({ summary: summaryText, clauses: verdicts });
const interviewResult = z.object({ ...labels, questions: z.array(z.unknown()) });

export function historyEntry(kind: HistoryKind, result: unknown): Entry {
  switch (kind) {
    case "ad": {
      const { role, company, summary, flags } = adResult.parse(result);
      return { kind, role, company, summary, counts: flags };
    }
    case "contract": {
      const { summary, clauses } = contractResult.parse(result);
      return { kind, summary, counts: clauses };
    }
    case "interview": {
      const { role, company, questions } = interviewResult.parse(result);
      return { kind, role, company, questionCount: questions.length };
    }
  }
}

export async function saveHistory(db: SupabaseClient, userId: string, entry: Entry) {
  const { error } = await db.from(TABLE).insert({ user_id: userId, entry });
  if (error) throw new Error("Could not save check history");
}

export async function loadHistory(db: SupabaseClient, userId: string, before?: Cursor): Promise<HistoryPage> {
  const query = db.from(TABLE).select("id, created_at, entry").eq("user_id", userId)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE + 1);
  if (before) {
    const { id, created_at } = before;
    query.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
  }
  const { data, error } = await query;
  if (error) throw new Error("Could not load check history");

  const page = data.slice(0, PAGE_SIZE);
  const rows = page.flatMap((record) => {
    const parsed = historyRow.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
  const next = data.length > PAGE_SIZE ? historyCursor.parse(page[PAGE_SIZE - 1]) : null;
  return { rows, next };
}
