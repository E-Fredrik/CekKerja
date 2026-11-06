"use client";

import { useLang } from "@/components/ui/lang.tsx";

export type VerdictKind = "red" | "yellow" | "green";

type VerdictSignProps = {
  verdict: VerdictKind;
  size?: number;
};

export function VerdictSign({ verdict, size = 26 }: VerdictSignProps) {
  if (verdict === "red") return <RedSign size={size} />;
  if (verdict === "yellow") return <YellowSign size={size} />;
  return <GreenSign size={size} />;
}

function RedSign({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="11.5" stroke="var(--stop)" strokeWidth="3" fill="var(--surface)" />
      <line
        x1="8.5" y1="13" x2="17.5" y2="13"
        stroke="var(--stop)" strokeWidth="3" strokeLinecap="round"
        transform="rotate(45 13 13)"
      />
    </svg>
  );
}

function YellowSign({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path
        d="M13 2L24 13L13 24L2 13Z"
        fill="var(--warn)"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="13" y1="8" x2="13" y2="14" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="13" cy="18" r="1.1" fill="var(--ink)" />
    </svg>
  );
}

function GreenSign({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="22" height="14" rx="4" fill="var(--go)" />
      <path
        d="M8 13l3.5 3.5 6.5-6.5"
        stroke="var(--on-go)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type VerdictTagProps = {
  verdict: VerdictKind;
};

const verdictTextClass: Record<VerdictKind, string> = {
  red: "text-stop-text",
  yellow: "text-warn-text",
  green: "text-go-text",
};

export function VerdictTag({ verdict }: VerdictTagProps) {
  const { t } = useLang();
  const label =
    verdict === "red"
      ? t.verdict.red
      : verdict === "yellow"
        ? t.verdict.yellow
        : t.verdict.green;

  return (
    <span className="inline-flex items-center gap-1.5">
      <VerdictSign verdict={verdict} size={20} />
      <span className={`text-[15px] font-[700] ${verdictTextClass[verdict]}`}>
        {label}
      </span>
    </span>
  );
}
