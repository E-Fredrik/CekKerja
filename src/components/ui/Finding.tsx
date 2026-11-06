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
};

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

      {question && (
        <p className="text-callout text-ink-soft">
          <span className="font-[500]">{t.finding.question}</span> {question}
        </p>
      )}
    </article>
  );
}
