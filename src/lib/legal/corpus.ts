import uu27 from "../../../data/laws/uu-27-2026.json" with { type: "json" };
import type { Citation } from "./rules.ts";

export type LawText = { id: string; title: string; url: string; articles: Record<string, string> };
export type CitedText = { label: string; text: string; url: string };

export const LAWS: Record<string, LawText> = { [uu27.id]: uu27 };

export function ayatOf(article: string, ayat: number): string | null {
  const start = article.search(new RegExp(`(^|\\n)\\(${ayat}\\) `));
  if (start < 0) return null;
  const rest = article.slice(start).replace(/^\n/, "");
  const end = rest.search(new RegExp(`\\n\\(${ayat + 1}\\) `));
  return end < 0 ? rest : rest.slice(0, end);
}

export function citedText(cite: Citation): CitedText | null {
  const law = LAWS[cite.law];
  const article = law?.articles[cite.article];
  if (!law || !article) return null;
  const part = cite.ayat ? ayatOf(article, cite.ayat) : null;
  const label = `${law.title.split(" tentang ")[0]} Pasal ${cite.article}${part ? ` ayat (${cite.ayat})` : ""}`;
  return { label, text: part ?? article, url: law.url };
}

export const citedTexts = (cites: Citation[]): CitedText[] =>
  cites.map(citedText).filter((c): c is CitedText => c !== null);
