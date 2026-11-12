"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "@/components/auth/session.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Field } from "@/components/ui/Field.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import type { EmailKind } from "@/lib/mail/email-request.ts";

type ErrorCode = keyof ReturnType<typeof useLang>["t"]["emailResult"]["errors"];

type Status = { state: "idle" } | { state: "sending" } | { state: "sent"; to: string } | { state: "error"; code: ErrorCode };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailResult({ kind, result }: { kind: EmailKind; result: unknown }) {
  const { t, lang } = useLang();
  const { user } = useSession();
  const e = t.emailResult;
  const [typed, setTyped] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const email = typed ?? user?.email ?? "";
  const fieldError = status.state === "error" && status.code === "emailInvalid" ? e.errors.emailInvalid : undefined;

  async function send(event: FormEvent) {
    event.preventDefault();
    const to = email.trim();
    if (!EMAIL_PATTERN.test(to)) {
      setStatus({ state: "error", code: "emailInvalid" });
      return;
    }
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/email-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, to, lang, result }),
      });
      if (res.ok) {
        setStatus({ state: "sent", to });
        return;
      }
      const data: { error?: string } = await res.json().catch(() => ({}));
      const code = data.error && data.error in e.errors ? (data.error as ErrorCode) : "sendFailed";
      setStatus({ state: "error", code });
    } catch {
      setStatus({ state: "error", code: "network" });
    }
  }

  return (
    <form onSubmit={send} noValidate className="flex flex-col gap-3 max-w-xl">
      <Field
        label={e.label}
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        hint={e.hint}
        value={email}
        onChange={(event) => {
          setTyped(event.target.value);
          if (status.state !== "sending") setStatus({ state: "idle" });
        }}
        error={fieldError}
      />
      <div>
        <Button type="submit" variant="secondary" disabled={status.state === "sending"} aria-busy={status.state === "sending"}>
          {status.state === "sending" ? e.sending : e.send}
        </Button>
      </div>
      {status.state === "sent" && <Notice variant="success">{e.sent.replace("{email}", status.to)}</Notice>}
      {status.state === "error" && status.code !== "emailInvalid" && <Notice variant="error">{e.errors[status.code]}</Notice>}
    </form>
  );
}
