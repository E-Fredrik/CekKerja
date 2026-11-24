"use client";

import Link from "next/link";
import type { CvMatch, MatchStatus } from "@/lib/match/match.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import { useCheck } from "@/components/ui/useCheck.ts";
import { useCvProfile } from "@/components/profile/cv-store.ts";

const SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8";
const LINK = "self-start text-callout font-[650] text-sign-blue underline underline-offset-4 hover:no-underline";
const STATUS_ORDER: Record<MatchStatus, number> = { missing: 0, partial: 1, met: 2 };

export function CvMatchSection({ adText }: { adText: string }) {
  const { t, lang } = useLang();
  const { cv, signedIn } = useCvProfile();
  const { state, run } = useCheck<CvMatch>("/api/match-cv");
  const pending = state.status === "pending";

  return (
    <section className={`${SURFACE} flex flex-col gap-4`} aria-labelledby="match-title">
      <h2 id="match-title" className="text-title-2 text-ink">
        {t.match.title}
      </h2>
      <p className="text-callout text-ink-soft">{t.match.hint}</p>

      {!signedIn ? (
        <>
          <p className="text-body text-ink">{t.match.needSignIn}</p>
          <Link href="/masuk" className={LINK}>
            {t.match.toSignIn}
          </Link>
        </>
      ) : !cv ? (
        <>
          <p className="text-body text-ink">{t.match.needCv}</p>
          <Link href="/profil" className={LINK}>
            {t.match.toProfile}
          </Link>
        </>
      ) : (
        <>
          <p role="status" className="sr-only">
            {state.status === "done" && state.result.score !== null ? t.match.score.replace("{score}", String(state.result.score)) : ""}
          </p>
          {state.status === "done" && <MatchList match={state.result} />}
          {pending && <Notice variant="info">{t.match.pending}</Notice>}
          {state.status === "error" && <Notice variant="error">{state.message}</Notice>}
          <div>
            <Button variant="secondary" pending={pending} onClick={() => run({ adText, cv, lang, mode: "fast" })}>
              {state.status === "done" ? t.match.again : t.match.run}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function MatchList({ match }: { match: CvMatch }) {
  const { t } = useLang();
  if (match.score === null) return <p className="text-body text-ink">{t.match.none}</p>;
  const requirements = [...match.requirements].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-title-2 text-ink tabular-nums">{t.match.score.replace("{score}", String(match.score))}</p>
        <p className="text-callout text-ink-soft">{t.match.scoreNote}</p>
      </div>
      <p className="text-body text-ink">{match.summary}</p>
      <ul className="flex flex-col wrap-anywhere">
        {requirements.map((r, i) => (
          <li key={i} className="flex flex-col gap-2 py-4 border-b border-line last:border-b-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-headline text-ink">{r.requirement}</h3>
              <span className="text-callout text-ink bg-surface-2 rounded-full px-3 py-0.5 shrink-0">{t.match.status[r.status]}</span>
            </div>
            {r.evidence && (
              <p className="text-body text-ink">
                <span className="text-ink-soft">{t.match.evidence}</span> {r.evidence}
              </p>
            )}
            <p className="text-body text-ink">
              <span className="text-ink-soft">{t.match.tip}</span> {r.tip}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
