"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type CountUpProps = {
  to: number;
  locale: string;
  decimals?: number;
  suffix?: string;
  duration?: number;
};

const format = (value: number, locale: string, decimals: number, suffix: string) =>
  value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

export function CountUp({ to, locale, decimals = 0, suffix = "", duration = 1.6 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduceMotion) {
      el.textContent = format(to, locale, decimals, suffix);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v, locale, decimals, suffix);
      },
    });
    return () => controls.stop();
  }, [inView, reduceMotion, to, locale, decimals, suffix, duration]);

  return (
    <span className="tabular-nums">
      <span className="sr-only">{format(to, locale, decimals, suffix)}</span>
      <span ref={ref} aria-hidden="true">
        {format(0, locale, decimals, suffix)}
      </span>
    </span>
  );
}
