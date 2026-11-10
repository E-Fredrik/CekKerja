"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMotionValue, useReducedMotion, useScroll } from "motion/react";
import { useRef } from "react";
import { CountUp } from "@/components/landing/CountUp.tsx";
import { TiltedCard } from "@/components/landing/TiltedCard.tsx";
import { Finding } from "@/components/ui/Finding.tsx";
import { SummaryPlate } from "@/components/ui/SummaryPlate.tsx";
import { useLang } from "@/components/ui/lang.tsx";

const TrafficLight3D = dynamic(() => import("@/components/landing/TrafficLight3D.tsx").then((m) => m.TrafficLight3D), {
  ssr: false,
});

const PILL_PRIMARY =
  "inline-flex items-center justify-center h-11 px-[22px] text-[16px] font-[650] rounded-full bg-sign-blue text-on-sign-blue hover:ring-4 hover:ring-brand-wash active:scale-[0.98] transition-all";
const PILL_SECONDARY =
  "inline-flex items-center justify-center h-11 px-[22px] text-[16px] font-[650] rounded-full bg-surface text-ink border-[1.5px] border-line-strong hover:bg-surface-2 active:scale-[0.98] transition-all";

const SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8";

export default function Home() {
  const { t, lang } = useLang();
  const l = t.landing;
  const locale = lang === "id" ? "id-ID" : "en-US";
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: hero, offset: ["start start", "end end"] });
  const still = useMotionValue(0);
  const reduceMotion = useReducedMotion();

  const steps = [
    [l.howStep1Title, l.howStep1Desc],
    [l.howStep2Title, l.howStep2Desc],
    [l.howStep3Title, l.howStep3Desc],
  ];

  return (
    <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-20 sm:gap-24">
      <section ref={hero} className="relative h-[200svh] -mt-12">
        <div className="sticky top-0 h-svh grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 content-center items-center">
          <header className="flex flex-col gap-5 max-w-prose">
            <h1 className="text-large-title text-ink">{l.title}</h1>
            <p className="text-body text-ink-soft">{l.subtitle}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href="/kontrak" className={PILL_PRIMARY}>
                {l.ctaContract}
              </Link>
              <Link href="/lowongan" className={PILL_SECONDARY}>
                {l.ctaAd}
              </Link>
            </div>
          </header>

          <div className="h-[300px] sm:h-[420px] lg:h-[540px]" aria-hidden="true">
            <TrafficLight3D progress={reduceMotion ? still : scrollYProgress} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="demo-title">
        <div className="flex flex-col gap-1 max-w-prose">
          <h2 id="demo-title" className="text-title-1 text-ink">
            {l.demoHeading}
          </h2>
          <p className="text-callout text-ink-soft">{l.demoSubheading}</p>
        </div>
        <TiltedCard>
          <SummaryPlate headline={l.heroPlateHeadline} documentLabel={l.heroPlateLabel} red={1} yellow={1} green={1} />
        </TiltedCard>
        <div className={SURFACE}>
          <Finding
            verdict="red"
            code={l.demoRedCode}
            title={l.demoRedTitle}
            quote={l.demoRedQuote}
            reason={l.demoRedReason}
            legalBasis={l.demoRedBasis}
            question={l.demoRedQuestion}
          />
          <Finding
            verdict="yellow"
            code={l.demoYellowCode}
            title={l.demoYellowTitle}
            quote={l.demoYellowQuote}
            reason={l.demoYellowReason}
            legalBasis={l.demoYellowBasis}
            question={l.demoYellowQuestion}
          />
          <Finding
            verdict="green"
            code={l.demoGreenCode}
            title={l.demoGreenTitle}
            quote={l.demoGreenQuote}
            reason={l.demoGreenReason}
            legalBasis={l.demoGreenBasis}
          />
        </div>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="how-title">
        <h2 id="how-title" className="text-title-1 text-ink">
          {l.howHeading}
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(([title, desc]) => (
            <li key={title} className={`${SURFACE} flex flex-col gap-2`}>
              <h3 className="text-title-2 text-ink">{title}</h3>
              <p className="text-body text-ink-soft">{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${SURFACE} flex flex-col gap-6`} aria-labelledby="evidence-title">
        <h2 id="evidence-title" className="text-title-1 text-ink">
          {l.evidenceHeading}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-figure text-ink">
              <CountUp to={66.3} decimals={1} suffix="%" locale={locale} />
            </span>
            <p className="text-callout text-ink-soft">{l.evidenceStat1Label}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-figure text-ink">
              <CountUp to={38.8} decimals={1} suffix="%" locale={locale} />
            </span>
            <p className="text-callout text-ink-soft">{l.evidenceStat2Label}</p>
          </div>
        </div>
        <p className="text-footnote text-ink-soft">{l.evidenceSource}</p>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="tools-title">
        <h2 id="tools-title" className="text-title-1 text-ink">
          {l.toolsHeading}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${SURFACE} flex flex-col gap-6 justify-between`}>
            <div className="flex flex-col gap-3">
              <h3 className="text-title-2 text-ink">{l.toolContractTitle}</h3>
              <p className="text-body text-ink-soft">{l.toolContractDesc}</p>
            </div>
            <Link href="/kontrak" className={`${PILL_SECONDARY} self-start`}>
              {l.ctaContract}
            </Link>
          </div>
          <div className={`${SURFACE} flex flex-col gap-6 justify-between`}>
            <div className="flex flex-col gap-3">
              <h3 className="text-title-2 text-ink">{l.toolAdTitle}</h3>
              <p className="text-body text-ink-soft">{l.toolAdDesc}</p>
            </div>
            <Link href="/lowongan" className={`${PILL_SECONDARY} self-start`}>
              {l.ctaAd}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
