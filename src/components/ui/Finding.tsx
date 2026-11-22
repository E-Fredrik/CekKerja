"use client";

import { useLang } from "@/components/ui/lang.tsx";
import { VerdictSign, type VerdictKind } from "@/components/ui/VerdictSign.tsx";

type FindingProps = {
  verdict: VerdictKind;
  code: string;
  title: string;
  quote: string;
  reason: string;
  legalBasis: string;
  question?: string;
  articles?: ArticleText[];
  related?: boolean;
};

export type ArticleText = { label: string; text: string; url: string };

const quoteWash: Record<VerdictKind, string> = {
  red: "bg-stop-wash",
  yellow: "bg-warn-wash",
  green: "bg-go-wash",
};

export function Finding({
  verdict,
  code,
  title,
  quote,
  reason,
  legalBasis,
  question,
  articles = [],
  related = false,
}: FindingProps) {
  const { t } = useLang();

  return (
    <article className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 border-b border-line last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <VerdictSign verdict={verdict} size={26} />
        </div>
        <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
          <h3 className="text-headline text-ink">{title}</h3>
          <span className="text-code text-ink-soft shrink-0 tabular-nums">{code}</span>
        </div>
      </div>

      <blockquote
        className={`${quoteWash[verdict]} text-quote text-ink rounded-md px-4 py-3 italic`}
      >
        {quote}
      </blockquote>

      <p className="text-body text-ink">{reason}</p>

      <p className="text-callout text-ink-soft">
        <span className="font-[500]">{t.finding.legalBasis}</span> {legalBasis}
      </p>

      {articles.length > 0 && (
        <details className="rounded-md bg-surface-2 px-4 py-3 text-callout text-ink-soft">
          <summary className="cursor-pointer font-[500] text-ink">
            {related ? t.finding.relatedArticle : t.finding.articleText}: {articles.map((a) => a.label).join("; ")}
          </summary>
          <div className="flex flex-col gap-3 pt-3">
            {related && <p>{t.finding.relatedNote}</p>}
            {articles.map((a) => (
              <div key={a.label} className="flex flex-col gap-1">
                <p className="font-[500] text-ink">{a.label}</p>
                <p className="text-ink whitespace-pre-line">{a.text}</p>
              </div>
            ))}
            <p className="text-footnote">
              {t.finding.ocrNote}{" "}
              <a href={articles[0].url} target="_blank" rel="noopener noreferrer" className="text-sign-blue underline underline-offset-4 hover:no-underline">
                {t.finding.officialPdf}
              </a>
            </p>
          </div>
        </details>
      )}

      {question && (
        <p className="text-callout text-ink-soft">
          <span className="font-[500]">{t.finding.question}</span> {question}
        </p>
      )}
    </article>
  );
}
