import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { citedText, type CitedText, type LawText } from "./corpus.ts";

export const EMBED_CHUNK = 90;
export const EMBED_PAUSE_MS = 62_000;
export const MIN_SIMILARITY = 0.75;
export const MAX_RELATED = 10;

export type Embed = (texts: string[]) => Promise<number[][]>;

const Matches = z.array(z.object({ law: z.string(), article: z.string(), similarity: z.number() }));

export const articleRows = (laws: LawText[]) =>
  laws.flatMap((law) =>
    Object.entries(law.articles).map(([article, body]) => ({
      id: `${law.id}:${article}`,
      law: law.id,
      article,
      body,
      input: `${law.title} Pasal ${article}\n${body}`,
    })),
  );

async function closest(db: SupabaseClient, vector: number[]): Promise<CitedText | null> {
  const { data, error } = await db.rpc("match_law_articles", { query_embedding: JSON.stringify(vector), match_count: 1 });
  if (error) throw new Error(error.message);
  const best = Matches.parse(data)[0];
  return best && best.similarity >= MIN_SIMILARITY ? citedText({ law: best.law, article: best.article }) : null;
}

export async function relatedArticles(texts: string[], db: SupabaseClient | null, embed: Embed): Promise<(CitedText | null)[]> {
  const none = texts.map(() => null);
  const asked = texts.slice(0, MAX_RELATED);
  if (!db || asked.length === 0) return none;
  try {
    const vectors = await embed(asked);
    const found = await Promise.all(vectors.map((vector) => closest(db, vector)));
    return texts.map((_, i) => found[i] ?? null);
  } catch (e) {
    console.warn("Law retrieval skipped:", e instanceof Error ? e.message : "unknown error");
    return none;
  }
}
