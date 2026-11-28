"use client";

import type { ReactNode } from "react";

type PlanCardProps = {
  name: string;
  price: string;
  period: string;
  features: readonly string[];
  highlighted?: boolean;
  current?: boolean;
  currentBadge?: string;
  meta?: string;
  action?: ReactNode;
};

function CheckMark() {
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true" className="shrink-0 mt-0.5">
      <rect x="0" y="0" width="20" height="16" rx="4" fill="var(--go)" />
      <path d="M5.5 8l3 3 6-6" stroke="var(--on-go)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlanCard({
  name,
  price,
  period,
  features,
  highlighted = false,
  current = false,
  currentBadge,
  meta,
  action,
}: PlanCardProps) {
  return (
    <section
      className={[
        "flex flex-col justify-between gap-6 rounded-lg bg-surface p-6 sm:p-8 shadow-(--shadow-surface)",
        highlighted ? "border-2 border-sign-blue" : "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title-2 text-ink">{name}</h2>
          {current && currentBadge && (
            <span className="rounded-full bg-brand-wash px-3 py-1 text-footnote font-[650] text-sign-blue">
              {currentBadge}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-figure tabular-nums text-ink">{price}</span>
          <span className="text-callout text-ink-soft">{period}</span>
        </div>

        {meta && <p className="text-callout text-ink-soft">{meta}</p>}

        <ul className="flex flex-col gap-3 pt-2">
          {features.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-body text-ink">
              <CheckMark />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </section>
  );
}
