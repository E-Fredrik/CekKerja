import { embedTexts } from "../src/lib/ai/gemini.ts";
import { adminSupabase } from "../src/lib/db/admin.ts";
import { LAWS } from "../src/lib/legal/corpus.ts";
import { articleRows, EMBED_CHUNK, EMBED_PAUSE_MS } from "../src/lib/legal/retrieve.ts";

const db = adminSupabase();
if (!db) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env first.");

const rows = articleRows(Object.values(LAWS));
const { data: stored, error } = await db.from("law_articles").select("id, body");
if (error) throw new Error(error.message);
const unchanged = new Map(stored.map((row) => [row.id, row.body]));
const todo = rows.filter((row) => unchanged.get(row.id) !== row.body);
console.log(`${rows.length} articles, ${todo.length} new or changed`);

for (let i = 0; i < todo.length; i += EMBED_CHUNK) {
  if (i > 0) await new Promise((resolve) => setTimeout(resolve, EMBED_PAUSE_MS));
  const chunk = todo.slice(i, i + EMBED_CHUNK);
  const vectors = await embedTexts(chunk.map((row) => row.input), "RETRIEVAL_DOCUMENT");
  const { error: upsertError } = await db
    .from("law_articles")
    .upsert(chunk.map((row, j) => ({ id: row.id, law: row.law, article: row.article, body: row.body, embedding: JSON.stringify(vectors[j]) })));
  if (upsertError) throw new Error(upsertError.message);
  console.log(`saved ${Math.min(i + EMBED_CHUNK, todo.length)} of ${todo.length}`);
}
