"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { useSession } from "@/components/auth/session.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Field } from "@/components/ui/Field.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import { userFromInput } from "@/lib/auth/session-user.ts";
import { AUTH_STEPS, validateStep, type AuthErrors, type AuthInput, type AuthMode } from "@/lib/auth/validate.ts";

const SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8";

const EMPTY: AuthInput = { name: "", email: "", password: "", confirmPassword: "", consent: false };

export function AuthForm({ mode }: { mode: AuthMode }) {
  const { t } = useLang();
  const { signIn } = useSession();
  const router = useRouter();
  const a = t.auth;
  const signup = mode === "signup";
  const consentId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [input, setInput] = useState<AuthInput>(EMPTY);
  const [tried, setTried] = useState(false);
  const [step, setStep] = useState(0);
  const steps = AUTH_STEPS[mode];
  const last = step === steps.length - 1;
  const shows = (key: keyof AuthInput) => steps[step].fields.includes(key);

  const errors: AuthErrors = tried ? validateStep(mode, step, input) : {};
  const message = (key: keyof AuthInput) => (errors[key] ? a.errors[errors[key]] : undefined);

  function update<K extends keyof AuthInput>(key: K, value: AuthInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function focusFirst(selector: string) {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(selector)?.focus());
  }

  function goTo(next: number) {
    setTried(false);
    setStep(next);
    focusFirst("input:not([hidden])");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (Object.keys(validateStep(mode, step, input)).length > 0) {
      focusFirst("[aria-invalid='true']");
      return;
    }
    if (!last) {
      goTo(step + 1);
      return;
    }
    signIn(userFromInput(mode, input));
    router.push("/");
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className={`${SURFACE} flex flex-col gap-4 w-full max-w-md`}>
      <header className="flex flex-col gap-2 pb-2">
        <h1 className="text-title-1 text-ink">{signup ? a.signupTitle : a.loginTitle}</h1>
        <p className="text-callout text-ink-soft">{signup ? a.signupLead : a.loginLead}</p>
      </header>

      <div className="flex flex-col gap-2">
        <p className="text-footnote font-[650] text-ink-soft" aria-live="polite">
          {a.stepOf.replace("{step}", String(step + 1)).replace("{total}", String(steps.length))}
          {": "}
          <span className="text-ink">{a.steps[steps[step].name]}</span>
        </p>
        <ol className="flex gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <li
              key={s.name}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-sign-blue" : "bg-line"}`}
            />
          ))}
        </ol>
      </div>

      {!shows("email") && (
        <p className="text-callout text-ink-soft">
          {a.accountFor} <span className="font-[650] text-ink break-all">{input.email.trim()}</span>
          <input type="email" name="username" autoComplete="username" value={input.email.trim()} readOnly hidden />
        </p>
      )}

      {shows("name") && (
        <Field
          label={a.name}
          name="name"
          autoComplete="name"
          value={input.name}
          onChange={(e) => update("name", e.target.value)}
          error={message("name")}
        />
      )}
      {shows("email") && (
      <Field
        label={a.email}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={input.email}
        onChange={(e) => update("email", e.target.value)}
        error={message("email")}
      />
      )}
      {shows("password") && (
      <Field
        label={a.password}
        name="password"
        type="password"
        autoComplete={signup ? "new-password" : "current-password"}
        hint={signup ? a.passwordHint : undefined}
        value={input.password}
        onChange={(e) => update("password", e.target.value)}
        error={message("password")}
      />
      )}
      {shows("confirmPassword") && (
        <Field
          label={a.confirmPassword}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={input.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          error={message("confirmPassword")}
        />
      )}

      {shows("consent") && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={consentId} className="flex items-start gap-3 text-callout text-ink cursor-pointer">
            <input
              id={consentId}
              type="checkbox"
              checked={input.consent}
              onChange={(e) => update("consent", e.target.checked)}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? `${consentId}-error` : undefined}
              className="mt-0.5 size-5 shrink-0 accent-sign-blue cursor-pointer"
            />
            <span>{a.consent}</span>
          </label>
          {errors.consent && (
            <p id={`${consentId}-error`} className="flex items-center gap-1.5 pl-8 text-callout font-[600] text-stop-text">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                <circle cx="8" cy="8" r="7" stroke="var(--stop)" strokeWidth="1.5" fill="var(--stop-wash)" />
                <line x1="8" y1="4.5" x2="8" y2="8.5" stroke="var(--stop)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill="var(--stop)" />
              </svg>
              {a.errors[errors.consent]}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-2">
        {step > 0 && (
          <Button type="button" variant="secondary" onClick={() => goTo(step - 1)}>
            {a.back}
          </Button>
        )}
        <Button type="submit" className="flex-1">
          {!last ? a.next : signup ? a.signup : a.login}
        </Button>
      </div>

      <p className="text-callout text-ink-soft text-center">
        {signup ? a.haveAccount : a.noAccount}{" "}
        <Link
          href={signup ? "/masuk" : "/daftar"}
          className="font-[650] text-sign-blue underline underline-offset-4 hover:no-underline"
        >
          {signup ? a.login : a.signup}
        </Link>
      </p>
    </form>
  );
}
