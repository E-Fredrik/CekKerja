"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CvView } from "@/components/profile/CvView.tsx";
import { useCvProfile } from "@/components/profile/cv-store.ts";
import { Button } from "@/components/ui/Button.tsx";
import { FileDrop } from "@/components/ui/FileDrop.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { useLang } from "@/components/ui/lang.tsx";

const SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8";

type Status = { state: "idle" | "pending" | "saved" | "removed" } | { state: "error"; message: string };

export default function ProfilPage() {
  const { t, lang } = useLang();
  const p = t.profile;
  const { cv, signedIn, saveCv, clearCv } = useCvProfile();
  const [file, setFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const pending = status.state === "pending";

  async function read(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus({ state: "pending" });
    const form = new FormData();
    form.append("file", file);
    form.append("lang", lang);
    try {
      const res = await fetch("/api/cv", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const codes: Record<string, string> = t.check.errors;
        const message = typeof data?.code === "string" && data.code in codes ? codes[data.code] : typeof data?.error === "string" ? data.error : t.check.errorUnknown;
        setStatus({ state: "error", message });
        return;
      }
      saveCv(data);
      setFile(null);
      setReplacing(false);
      setStatus({ state: "saved" });
    } catch {
      setStatus({ state: "error", message: t.check.errorNetwork });
    }
  }

  function remove() {
    clearCv();
    setReplacing(false);
    setStatus({ state: "removed" });
  }

  return (
    <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-3 max-w-prose">
        <h1 className="text-large-title text-ink">{p.title}</h1>
        <p className="text-body text-ink-soft">{p.intro}</p>
      </header>

      {!signedIn ? (
        <div className="flex flex-col gap-4 max-w-2xl">
          <Notice variant="info">{p.signInNeeded}</Notice>
          <Link href="/masuk" className="self-start text-callout font-[650] text-sign-blue underline underline-offset-4 hover:no-underline">
            {p.signIn}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-2xl">
          {status.state === "saved" && <Notice variant="success">{p.saved}</Notice>}
          {status.state === "removed" && <Notice variant="info">{p.removed}</Notice>}

          {cv && !replacing ? (
            <>
              <section className={SURFACE} aria-label={p.cvTitle}>
                <CvView cv={cv} />
              </section>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setReplacing(true)}>
                  {p.replace}
                </Button>
                <Button variant="quiet" onClick={remove}>
                  {p.remove}
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={read} className={`${SURFACE} flex flex-col gap-4`}>
              <h2 className="text-title-2 text-ink">{p.cvTitle}</h2>
              <p className="text-[16px] font-[600] text-ink">{p.pick}</p>
              <FileDrop onFile={setFile} disabled={pending} />
              <p className="text-callout text-ink-soft">{p.privacy}</p>
              {status.state === "error" && <Notice variant="error">{status.message}</Notice>}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={!file} pending={pending}>
                  {p.read}
                </Button>
                {replacing && (
                  <Button type="button" variant="quiet" onClick={() => setReplacing(false)}>
                    {p.cancel}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
