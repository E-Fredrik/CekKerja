"use client";

import Link from "next/link";
import { useLang } from "@/components/ui/lang.tsx";
import { VerdictSign } from "@/components/ui/VerdictSign.tsx";

type DemoFinding = {
  verdict: "red" | "yellow" | "green";
  washClass: string;
  textClass: string;
  code: string;
  title: string;
  quote: string;
  reason: string;
  basis: string;
  question?: string;
};

const PILL_PRIMARY =
  "inline-flex items-center justify-center h-11 px-[22px] text-[16px] font-[650] rounded-full bg-sign-blue text-on-sign-blue hover:ring-4 hover:ring-brand-wash active:scale-[0.98] transition-all";
const PILL_SECONDARY =
  "inline-flex items-center justify-center h-11 px-[22px] text-[16px] font-[650] rounded-full bg-surface text-ink border-[1.5px] border-line-strong hover:bg-surface-2 active:scale-[0.98] transition-all";

export default function Home() {
  const { t } = useLang();

  const findings: DemoFinding[] = [
    {
      verdict: "red",
      washClass: "bg-stop-wash",
      textClass: "text-stop-text",
      code: t.landing.demoRedCode,
      title: t.landing.demoRedTitle,
      quote: t.landing.demoRedQuote,
      reason: t.landing.demoRedReason,
      basis: t.landing.demoRedBasis,
      question: t.landing.demoRedQuestion,
    },
    {
      verdict: "yellow",
      washClass: "bg-warn-wash",
      textClass: "text-warn-text",
      code: t.landing.demoYellowCode,
      title: t.landing.demoYellowTitle,
      quote: t.landing.demoYellowQuote,
      reason: t.landing.demoYellowReason,
      basis: t.landing.demoYellowBasis,
      question: t.landing.demoYellowQuestion,
    },
    {
      verdict: "green",
      washClass: "bg-go-wash",
      textClass: "text-go-text",
      code: t.landing.demoGreenCode,
      title: t.landing.demoGreenTitle,
      quote: t.landing.demoGreenQuote,
      reason: t.landing.demoGreenReason,
      basis: t.landing.demoGreenBasis,
    },
  ];

  return (
    <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-20 sm:gap-24">
      <header className="flex flex-col gap-5 max-w-prose">
        <h1 className="text-large-title text-ink">{t.landing.title}</h1>
        <p className="text-body text-ink-soft">{t.landing.subtitle}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/kontrak" className={PILL_PRIMARY}>
            {t.landing.ctaContract}
          </Link>
          <Link href="/lowongan" className={PILL_SECONDARY}>
            {t.landing.ctaAd}
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 max-w-prose">
          <h2 className="text-title-1 text-ink">{t.landing.demoHeading}</h2>
          <p className="text-callout text-ink-soft">{t.landing.demoSubheading}</p>
        </div>

        <div className="bg-surface rounded-lg shadow-(--shadow-surface) flex flex-col divide-y divide-line">
          {findings.map((f) => (
            <div key={f.code} className="flex gap-4 p-6 sm:p-8">
              <div className="pt-0.5 shrink-0">
                <VerdictSign verdict={f.verdict} size={26} />
              </div>
              <div className="flex flex-col gap-3 min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-headline text-ink font-[650]">{f.title}</span>
                  <span className="text-code text-ink-soft tabular-nums shrink-0">{f.code}</span>
                </div>
                <blockquote
                  className={`${f.washClass} rounded-md px-4 py-3 text-quote text-ink`}
                >
                  {f.quote}
                </blockquote>
                <p className="text-body text-ink">{f.reason}</p>
                <p className="text-callout text-ink-soft">
                  <span className="font-[500]">{t.finding.legalBasis}</span>{" "}
                  {f.basis}
                </p>
                {f.question && (
                  <p className="text-callout text-ink-soft">
                    <span className="font-[500]">{t.finding.question}</span>{" "}
                    {f.question}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-shell text-on-shell rounded-lg p-6 sm:p-8 flex flex-col gap-6">
        <h2 className="text-title-1 text-on-shell">{t.landing.evidenceHeading}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-figure text-on-shell tabular-nums">
              {t.landing.evidenceStat1Number}
            </span>
            <p className="text-footnote text-on-shell-soft">
              {t.landing.evidenceStat1Label}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-figure text-on-shell tabular-nums">
              {t.landing.evidenceStat2Number}
            </span>
            <p className="text-footnote text-on-shell-soft">
              {t.landing.evidenceStat2Label}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-title-1 text-ink">{t.landing.toolsHeading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8 flex flex-col gap-6 justify-between">
            <div className="flex flex-col gap-3">
              <h3 className="text-title-2 text-ink">{t.landing.toolContractTitle}</h3>
              <p className="text-body text-ink-soft">{t.landing.toolContractDesc}</p>
            </div>
            <Link href="/kontrak" className={`${PILL_SECONDARY} self-start`}>
              {t.landing.ctaContract}
            </Link>
          </div>

          <div className="bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8 flex flex-col gap-6 justify-between">
            <div className="flex flex-col gap-3">
              <h3 className="text-title-2 text-ink">{t.landing.toolAdTitle}</h3>
              <p className="text-body text-ink-soft">{t.landing.toolAdDesc}</p>
            </div>
            <Link href="/lowongan" className={`${PILL_SECONDARY} self-start`}>
              {t.landing.ctaAd}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
