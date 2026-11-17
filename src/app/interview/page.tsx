"use client";

import { useState, type FormEvent } from "react";
import type { InterviewPrep } from "@/app/api/interview/prepare-interview.ts";
import type { Mode } from "@/lib/ai/gemini.ts";
import type { InterviewQuestion } from "@/lib/ai/schemas.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Field } from "@/components/ui/Field.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { Segmented } from "@/components/ui/Segmented.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import { useCheck } from "@/components/ui/useCheck.ts";

const SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8";

const EMPTY = { role: "", company: "", jobText: "", jobUrl: "", companyUrl: "", profile: "" };

const isWebLink = (url: string) => /^https?:\/\//i.test(url);

export default function InterviewPage() {
  const { t, lang } = useLang();
  const { state, run, reset } = useCheck<InterviewPrep>("/api/interview");
  const [form, setForm] = useState(EMPTY);
  const [mode, setMode] = useState<Mode>("fast");
  const pending = state.status === "pending";

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    const filled = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]));
    run({ ...filled, lang, mode });
  }

  function startOver() {
    setForm(EMPTY);
    reset();
  }

  return (
    <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-3 max-w-prose">
        <h1 className="text-large-title text-ink">{t.interview.title}</h1>
        <p className="text-body text-ink-soft">{t.interview.intro}</p>
      </header>

      {state.status === "done" ? (
        <Result prep={state.result} onAgain={startOver} />
      ) : (
        <form onSubmit={submit} className={`${SURFACE} flex flex-col gap-5 max-w-2xl`}>
          <Field label={t.interview.roleLabel} placeholder={t.interview.rolePlaceholder} value={form.role} onChange={set("role")} required disabled={pending} />
          <Field label={t.interview.companyLabel} value={form.company} onChange={set("company")} disabled={pending} />
          <Field as="textarea" label={t.interview.jobTextLabel} hint={t.interview.jobTextHint} value={form.jobText} onChange={set("jobText")} rows={6} disabled={pending} />
          <Field type="url" inputMode="url" label={t.interview.jobUrlLabel} placeholder="https://" value={form.jobUrl} onChange={set("jobUrl")} disabled={pending} />
          <Field type="url" inputMode="url" label={t.interview.companyUrlLabel} hint={t.interview.companyUrlHint} placeholder="https://" value={form.companyUrl} onChange={set("companyUrl")} disabled={pending} />
          <Field as="textarea" label={t.interview.profileLabel} hint={t.interview.profileHint} value={form.profile} onChange={set("profile")} rows={4} disabled={pending} />
          <div className="flex flex-col gap-2">
            <Segmented
              label={t.mode.label}
              value={mode}
              onChange={setMode}
              options={[
                { value: "fast", label: t.mode.fast },
                { value: "smart", label: t.mode.smart },
              ]}
            />
            <p className="text-callout text-ink-soft">{t.mode.hint}</p>
          </div>
          {pending && <Notice variant="info">{t.interview.pendingHint}</Notice>}
          {state.status === "error" && <Notice variant="error">{state.message}</Notice>}
          <div>
            <Button type="submit" disabled={form.role.trim().length < 2} pending={pending}>
              {t.interview.submit}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Result({ prep, onAgain }: { prep: InterviewPrep; onAgain: () => void }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-8">
      <section className={`${SURFACE} flex flex-col gap-3`} aria-labelledby="snapshot-title">
        <h2 id="snapshot-title" className="text-title-2 text-ink">
          {[prep.role, prep.company].filter(Boolean).join(" · ")}
        </h2>
        <p className="text-body text-ink">{prep.candidateSnapshot}</p>
      </section>

      <section className={SURFACE} aria-labelledby="questions-title">
        <h2 id="questions-title" className="text-title-2 text-ink mb-6">
          {t.interview.questionsTitle}
        </h2>
        <ol className="flex flex-col">
          {prep.questions.map((q, i) => (
            <QuestionItem key={i} question={q} code={`Q-${String(i + 1).padStart(2, "0")}`} />
          ))}
        </ol>
      </section>

      {prep.questionsToAskThem.length > 0 && (
        <section className={`${SURFACE} flex flex-col gap-3`} aria-labelledby="ask-title">
          <h2 id="ask-title" className="text-title-2 text-ink">
            {t.interview.askThemTitle}
          </h2>
          <p className="text-callout text-ink-soft">{t.interview.askThemHint}</p>
          <ul className="list-disc pl-5 flex flex-col gap-2 text-body text-ink">
            {prep.questionsToAskThem.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      {prep.unreadSources.length > 0 && (
        <Notice variant="info">
          {t.interview.unread} {prep.unreadSources.map((s) => s.url).join(", ")}
        </Notice>
      )}

      <div>
        <Button variant="secondary" onClick={onAgain}>
          {t.interview.again}
        </Button>
      </div>
    </div>
  );
}

function QuestionItem({ question, code }: { question: InterviewQuestion; code: string }) {
  const { t } = useLang();
  const fromWeb = isWebLink(question.source);
  return (
    <li className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 border-b border-line last:border-b-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-callout text-ink-soft">{t.interview.categories[question.category]}</span>
        <span className="text-code text-ink-soft shrink-0 tabular-nums">{code}</span>
      </div>
      <h3 className="text-headline text-ink">{question.question}</h3>
      <p className="text-body text-ink">
        <span className="text-ink-soft">{t.interview.why}</span> {question.whyTailored}
      </p>
      <p className="text-body text-ink">
        <span className="text-ink-soft">{t.interview.tips}</span> {question.answerTips}
      </p>
      <p className="text-callout text-ink-soft">
        {t.interview.source}{" "}
        {fromWeb ? (
          <a href={question.source} target="_blank" rel="noopener noreferrer" className="underline text-sign-blue break-all">
            {new URL(question.source).hostname}
          </a>
        ) : (
          t.interview.generated
        )}
      </p>
    </li>
  );
}
