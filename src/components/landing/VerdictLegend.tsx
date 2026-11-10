"use client";

import { useLang } from "@/components/ui/lang.tsx";
import { VerdictSign, type VerdictKind } from "@/components/ui/VerdictSign.tsx";

const ORDER: VerdictKind[] = ["red", "yellow", "green"];

const labelClass: Record<VerdictKind, string> = {
  red: "text-stop-text",
  yellow: "text-warn-text",
  green: "text-go-text",
};

const activeWash: Record<VerdictKind, string> = {
  red: "bg-stop-wash",
  yellow: "bg-warn-wash",
  green: "bg-go-wash",
};

export function VerdictLegend({ active }: { active: VerdictKind | null }) {
  const { t } = useLang();
  const l = t.landing;
  const meaning: Record<VerdictKind, string> = { red: l.legendRed, yellow: l.legendYellow, green: l.legendGreen };

  return (
    <ul aria-label={l.legendLabel} className="flex flex-col gap-1 -mx-3">
      {ORDER.map((verdict) => {
        const isActive = verdict === active;
        return (
          <li
            key={verdict}
            aria-current={isActive ? "true" : undefined}
            className={[
              "grid grid-cols-[26px_1fr] gap-x-3 items-start rounded-md px-3 py-2.5",
              "transition-colors duration-500 ease-(--ease-out)",
              isActive ? activeWash[verdict] : "bg-transparent",
            ].join(" ")}
          >
            <span className="pt-px">
              <VerdictSign verdict={verdict} size={24} />
            </span>
            <p className="text-callout">
              <span className={`font-[700] ${labelClass[verdict]}`}>{t.verdict[verdict]}</span>{" "}
              <span className={isActive ? "text-ink" : "text-ink-soft"}>{meaning[verdict]}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
