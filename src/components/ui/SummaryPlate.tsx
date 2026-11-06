"use client";

import { TrafficLight } from "@/components/ui/TrafficLight.tsx";

type SummaryPlateProps = {
  headline: string;
  documentLabel: string;
  red: number;
  yellow: number;
  green: number;
};

export function SummaryPlate({
  headline,
  documentLabel,
  red,
  yellow,
  green,
}: SummaryPlateProps) {
  return (
    <div
      className="relative bg-shell text-on-shell overflow-hidden rounded-lg p-7"
      style={{
        clipPath: `polygon(0 0, calc(100% - var(--plate-cut)) 0, 100% 100%, 0 100%)`,
      }}
    >
      <div
        className="animate-[plateWipe_520ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        style={{ willChange: "transform, opacity" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-title-1 text-on-shell leading-tight">{headline}</h2>
            <p className="text-callout text-on-shell-soft mt-2 truncate">{documentLabel}</p>
          </div>
          <div className="shrink-0">
            <TrafficLight red={red} yellow={yellow} green={green} orientation="horizontal" />
          </div>
        </div>
      </div>
    </div>
  );
}
