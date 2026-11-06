"use client";

import { useLang } from "@/components/ui/lang.tsx";
import { VerdictSign, type VerdictKind } from "@/components/ui/VerdictSign.tsx";

type TrafficLightProps = {
  red: number;
  yellow: number;
  green: number;
  orientation?: "vertical" | "horizontal";
};

type LampProps = {
  verdict: VerdictKind;
  count: number;
};

const lampColor: Record<VerdictKind, string> = {
  red: "bg-stop",
  yellow: "bg-warn",
  green: "bg-go",
};

const lampOnText: Record<VerdictKind, string> = {
  red: "text-on-stop",
  yellow: "text-on-warn",
  green: "text-on-go",
};

function Lamp({ verdict, count }: LampProps) {
  const active = count > 0;
  return (
    <div
      className={[
        "w-11 h-11 rounded-full flex items-center justify-center transition-opacity",
        lampColor[verdict],
        active ? "opacity-100" : "opacity-[0.22]",
      ].join(" ")}
      aria-hidden="true"
    >
      {active && (
        <span className={`text-[18px] font-[800] leading-none tabular-nums ${lampOnText[verdict]}`}>
          {count}
        </span>
      )}
    </div>
  );
}

export function TrafficLight({
  red,
  yellow,
  green,
  orientation = "vertical",
}: TrafficLightProps) {
  const { t } = useLang();

  const srLabel = t.trafficLight.srLabel
    .replace("{red}", String(red))
    .replace("{yellow}", String(yellow))
    .replace("{green}", String(green));

  const isHorizontal = orientation === "horizontal";

  return (
    <div
      role="img"
      aria-label={srLabel}
      className={[
        "inline-flex bg-housing rounded-lg border border-line/10",
        isHorizontal
          ? "flex-row items-center gap-3 px-4 py-3"
          : "flex-col items-center gap-3 px-3 py-4",
      ].join(" ")}
    >
      <Lamp verdict="red" count={red} />
      <Lamp verdict="yellow" count={yellow} />
      <Lamp verdict="green" count={green} />

      {!isHorizontal && (
        <div className="flex flex-col gap-1 mt-1">
          <VerdictTag verdict="red" count={red} />
          <VerdictTag verdict="yellow" count={yellow} />
          <VerdictTag verdict="green" count={green} />
        </div>
      )}
    </div>
  );
}

function VerdictTag({ verdict, count }: { verdict: VerdictKind; count: number }) {
  const { t } = useLang();
  const verdictTextClass: Record<VerdictKind, string> = {
    red: "text-stop-text",
    yellow: "text-warn-text",
    green: "text-go-text",
  };
  const label =
    verdict === "red"
      ? t.verdict.red
      : verdict === "yellow"
        ? t.verdict.yellow
        : t.verdict.green;

  return (
    <span className="inline-flex items-center gap-1 text-on-shell">
      <VerdictSign verdict={verdict} size={16} />
      <span className={`text-footnote font-[500] ${verdictTextClass[verdict]}`}>
        {count} {label}
      </span>
    </span>
  );
}
