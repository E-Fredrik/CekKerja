"use client";

import { useState, type FormEvent } from "react";
import type { AdCheck, CheckedFlag } from "@/app/api/check-ad/analyze-ad.ts";
import type { Verdict } from "@/lib/ai/schemas.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Field } from "@/components/ui/Field.tsx";
import { Finding } from "@/components/ui/Finding.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { SummaryPlate } from "@/components/ui/SummaryPlate.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import { useCheck } from "@/components/ui/useCheck.ts";

const VERDICT_ORDER: Record<Verdict, number> = { red: 0, yellow: 1, green: 2 };

const SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8";

export default function LowonganPage() {
  const { t, lang } = useLang();
  const { state, run, reset } = useCheck<AdCheck>("/api/check-ad");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const pending = state.status === "pending";

  function submit(e: FormEvent) {
    e.preventDefault();
    run({ text: text.trim() || undefined, url: url.trim() || undefined, lang, mode: "fast" });
  }

  function startOver() {
    setText("");
    setUrl("");
    reset();
  }

  return (
    <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-3 max-w-prose">
        <h1 className="text-large-title text-ink">{t.lowongan.title}</h1>
        <p className="text-body text-ink-soft">{t.lowongan.intro}</p>
      </header>

      {state.status === "done" ? (
        <Result check={state.result} onAgain={startOver} />
      ) : (
        <form onSubmit={submit} className={`${SURFACE} flex flex-col gap-5 max-w-2xl`}>
          <Field
            as="textarea"
            label={t.lowongan.textLabel}
            hint={t.lowongan.textHint}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            disabled={pending}
          />
          <Field
            type="url"
            inputMode="url"
            label={t.lowongan.urlLabel}
            hint={t.lowongan.urlHint}
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={pending}
          />
          {state.status === "error" && <Notice variant="error">{state.message}</Notice>}
          <div>
            <Button type="submit" disabled={!text.trim() && !url.trim()} pending={pending}>
              {t.lowongan.submit}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Result({ check, onAgain }: { check: AdCheck; onAgain: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const flags = check.flags
    .map((f, i) => ({ f, i }))
    .sort((a, b) => VERDICT_ORDER[a.f.verdict] - VERDICT_ORDER[b.f.verdict] || a.i - b.i)
    .map(({ f }) => f);
  const count = (v: Verdict) => flags.filter((f) => f.verdict === v).length;
  const toAsk = count("red") + count("yellow");
  const headline =
    toAsk === 0 ? t.lowongan.headlineNone : (toAsk === 1 ? t.lowongan.headlineOne : t.lowongan.headlineSome).replace("{count}", String(toAsk));

  async function copy() {
    try {
      await navigator.clipboard.writeText(check.inclusiveRewrite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex flex-col gap-8">
      <SummaryPlate
        headline={headline}
        documentLabel={[check.role, check.company].filter(Boolean).join(" · ")}
        red={count("red")}
        yellow={count("yellow")}
        green={count("green")}
      />

      <p className="text-body text-ink max-w-prose">{check.summary}</p>

      {flags.length > 0 && (
        <section className={SURFACE} aria-labelledby="flags-title">
          <h2 id="flags-title" className="text-title-2 text-ink mb-6">
            {t.lowongan.findings}
          </h2>
          {flags.map((f, i) => (
            <FlagFinding key={i} flag={f} code={`L-${String(i + 1).padStart(2, "0")}`} />
          ))}
        </section>
      )}

      {check.inclusiveRewrite && (
        <section className={`${SURFACE} flex flex-col gap-3`} aria-labelledby="rewrite-title">
          <h2 id="rewrite-title" className="text-title-2 text-ink">
            {t.lowongan.rewriteTitle}
          </h2>
          <p className="text-callout text-ink-soft">{t.lowongan.rewriteHint}</p>
          <p className="bg-surface-2 text-quote text-ink rounded-md px-4 py-3 whitespace-pre-line">{check.inclusiveRewrite}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {check.inclusiveRewrite && (
          <Button onClick={copy} aria-live="polite">
            {copied ? t.lowongan.copied : t.lowongan.copy}
          </Button>
        )}
        <Button variant="secondary" onClick={onAgain}>
          {t.lowongan.again}
        </Button>
      </div>
    </div>
  );
}

function FlagFinding({ flag, code }: { flag: CheckedFlag; code: string }) {
  const { t } = useLang();
  const titles: Record<string, string> = t.lowongan.rules;
  return (
    <Finding
      verdict={flag.verdict}
      code={code}
      title={titles[flag.ruleId] ?? t.lowongan.rules.other}
      quote={flag.quote}
      reason={flag.explanation}
      legalBasis={flag.source ?? t.lowongan.noSource}
      question={flag.questionToAsk || undefined}
    />
  );
}
