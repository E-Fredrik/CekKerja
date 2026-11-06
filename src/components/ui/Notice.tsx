"use client";

import { type ReactNode } from "react";

type NoticeVariant = "error" | "limit" | "success" | "info";

type NoticeProps = {
  variant: NoticeVariant;
  children: ReactNode;
};

const variantConfig: Record<
  NoticeVariant,
  { bg: string; sign: ReactNode }
> = {
  error: {
    bg: "bg-stop-wash",
    sign: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 mt-[1px]">
        <circle cx="8" cy="8" r="6.5" stroke="var(--stop)" strokeWidth="1.8" fill="var(--surface)" />
        <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" stroke="var(--stop)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  limit: {
    bg: "bg-warn-wash",
    sign: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 mt-[1px]">
        <path d="M8 1.5L14.5 8L8 14.5L1.5 8Z" fill="var(--warn)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
        <line x1="8" y1="5" x2="8" y2="9" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="8" cy="11.3" r="0.75" fill="var(--ink)" />
      </svg>
    ),
  },
  success: {
    bg: "bg-go-wash",
    sign: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 mt-[1px]">
        <rect x="1.5" y="3.5" width="13" height="9" rx="2" fill="var(--go)" />
        <path d="M4.5 7.5l2.5 2.5 4-4" stroke="var(--on-go)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  info: {
    bg: "bg-brand-wash",
    sign: null,
  },
};

export function Notice({ variant, children }: NoticeProps) {
  const { bg, sign } = variantConfig[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 ${bg} text-ink rounded-md px-4 py-3 text-callout`}
    >
      {sign}
      <span>{children}</span>
    </div>
  );
}
