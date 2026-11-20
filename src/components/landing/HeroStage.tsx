"use client";

import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, type MotionValue } from "motion/react";
import { useState } from "react";
import { useLang } from "@/components/ui/lang.tsx";
import { VerdictSign, type VerdictKind } from "@/components/ui/VerdictSign.tsx";

const TrafficLight3D = dynamic(() => import("@/components/landing/TrafficLight3D.tsx").then((m) => m.TrafficLight3D), {
  ssr: false,
});

const WASH: Record<VerdictKind, string> = { red: "bg-stop-wash", yellow: "bg-warn-wash", green: "bg-go-wash" };
const LABEL: Record<VerdictKind, string> = { red: "text-stop-text", yellow: "text-warn-text", green: "text-go-text" };
const LAMP_FILL: Record<VerdictKind, string> = { red: "var(--stop)", yellow: "var(--warn)", green: "var(--go)" };
const ORDER: VerdictKind[] = ["red", "yellow", "green"];

function FlatLight({ verdict }: { verdict: VerdictKind }) {
  return (
    <svg viewBox="0 0 60 150" className="h-[46%] w-auto" aria-hidden="true">
      <rect x="2" y="2" width="56" height="146" rx="14" fill="var(--housing)" />
      {ORDER.map((kind, i) => (
        <circle
          key={kind}
          cx="30"
          cy={30 + i * 45}
          r="15"
          fill={LAMP_FILL[kind]}
          opacity={kind === verdict ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}

type HeroStageProps = {
  progress: MotionValue<number>;
  verdict: VerdictKind;
  reduceMotion: boolean;
};

export function HeroStage({ progress, verdict, reduceMotion }: HeroStageProps) {
  const { t } = useLang();
  const l = t.landing;
  const [ready, setReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(progress, "change", (p) => setScrolled(p > 0.04));

  const clause: Record<VerdictKind, { title: string; quote: string; basis: string }> = {
    red: { title: l.demoRedTitle, quote: l.demoRedQuote, basis: l.demoRedBasis },
    yellow: { title: l.demoYellowTitle, quote: l.demoYellowQuote, basis: l.demoYellowBasis },
    green: { title: l.demoGreenTitle, quote: l.demoGreenQuote, basis: l.demoGreenBasis },
  };
  const current = clause[verdict];

  return (
    <div className="relative isolate h-[500px] sm:h-[560px] lg:h-[min(700px,86svh)] rounded-lg bg-shell shadow-(--shadow-surface) overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 flex items-start justify-center pt-[12%]">
        <motion.div
          className="flex h-full w-full justify-center"
          initial={false}
          animate={{ opacity: ready ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          <FlatLight verdict={verdict} />
        </motion.div>
      </div>

      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.6 }}
      >
        <TrafficLight3D progress={progress} onReady={() => setReady(true)} />
      </motion.div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[14px] border-2 border-on-shell/75" />

      <motion.p
        aria-hidden="true"
        className="hidden lg:flex absolute top-7 left-8 items-center gap-2 text-footnote text-on-shell-soft"
        initial={false}
        animate={{ opacity: scrolled || reduceMotion ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v9M3 7.5 7 11.5l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {l.scrollCue}
      </motion.p>

      <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-7">
          <motion.figure
            key={verdict}
            className="flex flex-col gap-3 rounded-md bg-surface p-4 sm:p-5 shadow-(--shadow-surface)"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <figcaption className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <VerdictSign verdict={verdict} size={22} />
                <span className={`text-callout font-[700] shrink-0 ${LABEL[verdict]}`}>{t.verdict[verdict]}</span>
                <span className="text-callout text-ink truncate">{current.title}</span>
              </span>
            </figcaption>
            <blockquote className={`${WASH[verdict]} text-quote text-ink rounded-md px-4 py-3 italic`}>
              {current.quote}
            </blockquote>
            <p className="text-footnote text-ink-soft">
              <span className="font-[600]">{t.finding.legalBasis}</span> {current.basis}
              <span className="hidden sm:inline"> · {l.heroPlateLabel}</span>
            </p>
          </motion.figure>
      </div>
    </div>
  );
}
