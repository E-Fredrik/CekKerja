"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/auth/session.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { VerdictSign } from "@/components/ui/VerdictSign.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import type { HistoryPage, HistoryRow } from "@/lib/db/history.ts";

type Cursor = HistoryPage["next"];
const verdicts = ["red", "yellow", "green"] as const;

export default function HistoryPage() {
  const { t } = useLang();
  const { ready, user } = useSession();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-large-title text-ink">{t.history.title}</h1>
      {!ready ? (
        <p role="status" className="text-body text-ink-soft">{t.history.loading}</p>
      ) : user ? (
        <HistoryList key={user.email} />
      ) : <SignInLink />}
    </div>
  );
}

function SignInLink() {
  const { t } = useLang();
  return (
    <Link href="/masuk?next=%2Friwayat" className="self-start text-body text-sign-blue underline">
      {t.nav.masuk}
    </Link>
  );
}

async function fetchHistory(cursor: Cursor, signal: AbortSignal): Promise<HistoryPage | null> {
  const params = cursor && new URLSearchParams({ id: cursor.id, before: cursor.created_at });
  const response = await fetch(params ? `/api/history?${params}` : "/api/history", {
    cache: "no-store",
    signal,
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Could not load check history");
  return response.json();
}

function HistoryList() {
  const { t } = useLang();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [next, setNext] = useState<Cursor>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<"load" | "signIn" | null>(null);
  const [request, setRequest] = useState<{ cursor: Cursor }>({ cursor: null });

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(request.cursor, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        if (!page) {
          setRows([]);
          setError("signIn");
          return;
        }
        setRows((previous) => request.cursor ? [...previous, ...page.rows] : page.rows);
        setNext(page.next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("load");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [request]);

  function loadNext() {
    setError(null);
    setPending(true);
    setRequest({ cursor: next });
  }

  if (error === "signIn") return <SignInLink />;

  return (
    <div className="flex flex-col items-start gap-4">
      {rows.length > 0 && (
        <ol className="w-full divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-(--shadow-surface)">
          {rows.map((row) => <HistoryItem key={row.id} row={row} />)}
        </ol>
      )}
      {pending && <p role="status" className="text-callout text-ink-soft">{t.history.loading}</p>}
      {error === "load" && <Notice variant="error">{t.history.loadError}</Notice>}
      {!pending && !error && rows.length === 0 && !next && (
        <Notice variant="info">{t.history.empty}</Notice>
      )}
      {(next || error === "load") && (
        <Button variant="secondary" disabled={pending} onClick={loadNext}>
          {error ? t.history.retry : t.history.more}
        </Button>
      )}
    </div>
  );
}

function HistoryItem({ row }: { row: HistoryRow }) {
  const { lang, t } = useLang();
  const { entry } = row;
  const title = { ad: t.nav.lowongan, contract: t.nav.kontrak, interview: t.nav.interview }[entry.kind];
  const employer = "role" in entry ? [entry.role, entry.company].filter(Boolean).join(" · ") : "";
  const date = new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(row.created_at));

  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-headline text-ink">{title}</h2>
        <time dateTime={row.created_at} className="text-footnote text-ink-soft">{date}</time>
      </div>
      {employer && <p className="break-words text-callout text-ink-soft">{employer}</p>}
      {"summary" in entry && <p className="break-words text-body text-ink">{entry.summary}</p>}
      {entry.kind === "interview" ? (
        <p className="text-callout text-ink-soft">{t.history.questions.replace("{count}", String(entry.questionCount))}</p>
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-footnote text-ink-soft">
          {verdicts.map((verdict) => (
            <li key={verdict} className="flex items-center gap-1">
              <VerdictSign verdict={verdict} size={16} />
              {entry.counts[verdict]} {t.verdict[verdict]}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
