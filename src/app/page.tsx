"use client";

import Link from "next/link";
import { useLang } from "@/components/ui/lang.tsx";
import { VerdictSign } from "@/components/ui/VerdictSign.tsx";

const CARD_SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8 flex flex-col justify-between border border-line";

export default function Home() {
  const { t, lang } = useLang();

  return (
    <div className="flex flex-col gap-16 sm:gap-24 py-12 px-4 sm:px-6 lg:px-8 max-w-[76rem] mx-auto w-full">
      <section className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto pt-6 sm:pt-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-line shadow-xs">
          <span className="w-2 h-2 rounded-full bg-sign-blue animate-pulse" />
          <span className="text-[13px] font-[600] text-ink-soft tracking-wide uppercase">
            {t.landing.heroTagline}
          </span>
        </div>

        <h1 className="text-large-title text-ink font-[800] tracking-tight">
          {t.landing.heroTitle}
        </h1>

        <p className="text-body text-ink-soft max-w-2xl leading-relaxed">
          {t.landing.heroSubtitle}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/kontrak"
            className="inline-flex items-center justify-center h-11 px-[22px] text-[16px] font-[650] rounded-full bg-sign-blue text-on-sign-blue hover:ring-4 hover:ring-brand-wash active:scale-[0.98] transition-all"
          >
            {t.landing.ctaContract}
          </Link>
          <Link
            href="/lowongan"
            className="inline-flex items-center justify-center h-11 px-[22px] text-[16px] font-[650] rounded-full bg-surface text-ink border border-line-strong hover:bg-surface-2 active:scale-[0.98] transition-all"
          >
            {t.landing.ctaAd}
          </Link>
        </div>
      </section>

      <section className="bg-surface rounded-lg border border-line p-6 sm:p-10 shadow-(--shadow-surface)">
        <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-12">
          <h2 className="text-title-2 text-ink font-[700] mb-3">
            {t.landing.verdictTitle}
          </h2>
          <p className="text-callout text-ink-soft">
            {t.landing.verdictDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-md bg-stop-wash flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <VerdictSign verdict="red" size={28} />
              <span className="text-[17px] font-[700] text-stop-text">
                {t.verdict.red}
              </span>
            </div>
            <p className="text-footnote text-ink leading-relaxed">
              {lang === "en"
                ? "Clauses or terms suspected of violating labor regulations or unfairly disadvantageous to workers."
                : "Klausul atau syarat yang diduga melanggar undang-undang ketenagakerjaan atau merugikan pekerja secara sepihak."}
            </p>
          </div>

          <div className="p-6 rounded-md bg-warn-wash flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <VerdictSign verdict="yellow" size={28} />
              <span className="text-[17px] font-[700] text-warn-text">
                {t.verdict.yellow}
              </span>
            </div>
            <p className="text-footnote text-ink leading-relaxed">
              {lang === "en"
                ? "Points that are ambiguous, not fully regulated, or need direct clarification with HR before signing."
                : "Poin yang ambigu, belum diatur lengkap, atau perlu kamu konfirmasikan langsung ke HR sebelum menyetujui."}
            </p>
          </div>

          <div className="p-6 rounded-md bg-go-wash flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <VerdictSign verdict="green" size={28} />
              <span className="text-[17px] font-[700] text-go-text">
                {t.verdict.green}
              </span>
            </div>
            <p className="text-footnote text-ink leading-relaxed">
              {lang === "en"
                ? "Standard terms that are fair and compliant with prevailing labor regulations."
                : "Ketentuan standar yang wajar dan sesuai dengan peraturan ketenagakerjaan yang berlaku."}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div>
          <h2 className="text-title-1 text-ink font-[750] tracking-tight">
            {t.landing.toolsTitle}
          </h2>
          <p className="text-body text-ink-soft mt-1">
            {t.landing.toolsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={CARD_SURFACE}>
            <div className="flex flex-col gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center text-sign-blue font-[700] text-[18px]">
                01
              </div>
              <h3 className="text-title-2 text-ink">{t.landing.toolKontrakTitle}</h3>
              <p className="text-callout text-ink-soft leading-relaxed">
                {t.landing.toolKontrakDesc}
              </p>
            </div>
            <Link
              href="/kontrak"
              className="inline-flex items-center justify-center h-10 px-5 text-[15px] font-[650] rounded-full bg-sign-blue text-on-sign-blue hover:ring-4 hover:ring-brand-wash active:scale-[0.98] transition-all self-start"
            >
              {t.landing.toolKontrakAction}
            </Link>
          </div>

          <div className={CARD_SURFACE}>
            <div className="flex flex-col gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center text-sign-blue font-[700] text-[18px]">
                02
              </div>
              <h3 className="text-title-2 text-ink">{t.landing.toolLowonganTitle}</h3>
              <p className="text-callout text-ink-soft leading-relaxed">
                {t.landing.toolLowonganDesc}
              </p>
            </div>
            <Link
              href="/lowongan"
              className="inline-flex items-center justify-center h-10 px-5 text-[15px] font-[650] rounded-full bg-sign-blue text-on-sign-blue hover:ring-4 hover:ring-brand-wash active:scale-[0.98] transition-all self-start"
            >
              {t.landing.toolLowonganAction}
            </Link>
          </div>

          <div className={`${CARD_SURFACE} opacity-85`}>
            <div className="flex flex-col gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-ink-soft font-[700] text-[18px]">
                03
              </div>
              <h3 className="text-title-2 text-ink">{t.landing.toolInterviewTitle}</h3>
              <p className="text-callout text-ink-soft leading-relaxed">
                {t.landing.toolInterviewDesc}
              </p>
            </div>
            <span className="inline-flex items-center justify-center h-10 px-5 text-[14px] font-[600] rounded-full bg-surface-2 text-ink-soft cursor-not-allowed self-start">
              {t.landing.toolInterviewAction}
            </span>
          </div>
        </div>
      </section>

      <section className="bg-shell text-on-shell rounded-lg p-8 sm:p-12 relative overflow-hidden">
        <div className="max-w-2xl relative z-10 flex flex-col gap-6">
          <h2 className="text-title-1 text-on-shell font-[750]">
            {t.landing.evidenceTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="flex flex-col gap-2">
              <span className="text-figure text-warn font-[800] leading-none">
                {t.landing.evidenceStat1Number}
              </span>
              <p className="text-footnote text-on-shell-soft leading-relaxed">
                {t.landing.evidenceStat1Label}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-figure text-on-shell font-[800] leading-none">
                {t.landing.evidenceStat2Number}
              </span>
              <p className="text-footnote text-on-shell-soft leading-relaxed">
                {t.landing.evidenceStat2Label}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-8 pb-8">
        <div>
          <h2 className="text-title-1 text-ink font-[750]">
            {t.landing.principleTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg bg-surface border border-line flex flex-col gap-2">
            <h3 className="text-headline text-ink font-[650]">{t.landing.principle1Title}</h3>
            <p className="text-callout text-ink-soft leading-relaxed">{t.landing.principle1Desc}</p>
          </div>

          <div className="p-6 rounded-lg bg-surface border border-line flex flex-col gap-2">
            <h3 className="text-headline text-ink font-[650]">{t.landing.principle2Title}</h3>
            <p className="text-callout text-ink-soft leading-relaxed">{t.landing.principle2Desc}</p>
          </div>

          <div className="p-6 rounded-lg bg-surface border border-line flex flex-col gap-2">
            <h3 className="text-headline text-ink font-[650]">{t.landing.principle3Title}</h3>
            <p className="text-callout text-ink-soft leading-relaxed">{t.landing.principle3Desc}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
