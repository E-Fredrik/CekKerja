"use client";

import { useState, type FormEvent } from "react";
import type { CheckedClause, ContractCheck } from "@/lib/ai/analyze.ts";
import type { Verdict } from "@/lib/ai/schemas.ts";
import type { Mode } from "@/lib/ai/gemini.ts";
import { Button } from "@/components/ui/Button.tsx";
import { FileDrop } from "@/components/ui/FileDrop.tsx";
import { Finding } from "@/components/ui/Finding.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { Segmented } from "@/components/ui/Segmented.tsx";
import { SummaryPlate } from "@/components/ui/SummaryPlate.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import { useCheck } from "@/components/ui/useCheck.ts";

const VERDICT_ORDER: Record<Verdict, number> = { red: 0, yellow: 1, green: 2 };

const SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8";

export default function KontrakPage() {
  const { t, lang } = useLang();
  const { state, run, reset } = useCheck<ContractCheck>("/api/check-contract");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("fast");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("lang", lang);
    form.append("mode", mode);
    run(form);
  }

  function startOver() {
    setFile(null);
    reset();
  }

  return (
    <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-3 max-w-prose">
        <h1 className="text-large-title text-ink">{t.kontrak.title}</h1>
        <p className="text-body text-ink-soft">{t.kontrak.intro}</p>
      </header>

      {state.status === "done" ? (
        <Result check={state.result} fileName={file?.name ?? ""} onAgain={startOver} />
      ) : (
        <form onSubmit={submit} className={`${SURFACE} flex flex-col gap-4 max-w-2xl`}>
          <p className="text-[16px] font-[600] text-ink">{t.kontrak.upload}</p>
          <FileDrop onFile={setFile} disabled={state.status === "pending"} />
          <div className="flex flex-col gap-1.5">
            <p className="text-[16px] font-[600] text-ink">{t.mode.label}</p>
            <div>
              <Segmented
                label={t.mode.label}
                value={mode}
                onChange={setMode}
                options={[
                  { value: "fast", label: t.mode.fast },
                  { value: "smart", label: t.mode.smart },
                ]}
              />
            </div>
            <p className="text-callout text-ink-soft">{t.mode.hint}</p>
          </div>
          {state.status === "error" && <Notice variant="error">{state.message}</Notice>}
          <div>
            <Button type="submit" disabled={!file} pending={state.status === "pending"}>
              {t.kontrak.submit}
            </Button>
          </div>
        </form>
      )}

      {state.status === "pending" && <Skeleton />}
    </div>
  );
}

function Result({ check, fileName, onAgain }: { check: ContractCheck; fileName: string; onAgain: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const clauses = check.clauses
    .map((c, i) => ({ c, i }))
    .sort((a, b) => VERDICT_ORDER[a.c.verdict] - VERDICT_ORDER[b.c.verdict] || a.i - b.i)
    .map(({ c }) => c);
  const count = (v: Verdict) => clauses.filter((c) => c.verdict === v).length;
  const toAsk = count("red") + count("yellow");
  const typeLabel = {
    PKWT: t.kontrak.typePKWT,
    PKWTT: t.kontrak.typePKWTT,
    magang: t.kontrak.typeMagang,
    unknown: t.kontrak.typeUnknown,
  }[check.contractType];

  async function copy() {
    await navigator.clipboard.writeText(check.negotiationMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      <SummaryPlate
        headline={toAsk > 0 ? t.kontrak.headlineSome.replace("{count}", String(toAsk)) : t.kontrak.headlineNone}
        documentLabel={[fileName, typeLabel].filter(Boolean).join(" · ")}
        red={count("red")}
        yellow={count("yellow")}
        green={count("green")}
      />

      <p className="text-body text-ink max-w-prose">{check.summary}</p>

      <section className={SURFACE} aria-labelledby="findings-title">
        <h2 id="findings-title" className="text-title-2 text-ink mb-6">
          {t.kontrak.findings}
        </h2>
        {clauses.map((c, i) => (
          <ClauseFinding key={i} clause={c} code={`K-${String(i + 1).padStart(2, "0")}`} />
        ))}
      </section>

      {check.negotiationMessage && (
        <section className={`${SURFACE} flex flex-col gap-3`} aria-labelledby="hr-title">
          <h2 id="hr-title" className="text-title-2 text-ink">
            {t.kontrak.hrTitle}
          </h2>
          <p className="text-callout text-ink-soft">{t.kontrak.hrHint}</p>
          <p className="bg-surface-2 text-quote text-ink rounded-md px-4 py-3 whitespace-pre-line">{check.negotiationMessage}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {check.negotiationMessage && (
          <Button onClick={copy} aria-live="polite">
            {copied ? t.kontrak.copied : t.kontrak.copy}
          </Button>
        )}
        <Button variant="secondary" onClick={onAgain}>
          {t.kontrak.again}
        </Button>
      </div>
    </div>
  );
}

function ClauseFinding({ clause, code }: { clause: CheckedClause; code: string }) {
  const { t } = useLang();
  return (
    <Finding
      verdict={clause.verdict}
      code={code}
      title={clause.title}
      quote={clause.text}
      reason={clause.explanation}
      legalBasis={clause.source ?? t.kontrak.noSource}
      question={clause.verdict === "green" ? undefined : clause.questionToAsk || undefined}
    />
  );
}

function Skeleton() {
  return (
    <div className={`${SURFACE} flex flex-col gap-6`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse motion-reduce:animate-none">
          <div className="w-[26px] h-[26px] rounded-full bg-surface-2 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 w-1/3 rounded-sm bg-surface-2" />
            <div className="h-12 rounded-md bg-surface-2" />
            <div className="h-4 w-2/3 rounded-sm bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
