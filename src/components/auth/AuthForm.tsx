"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type FormEvent } from "react";
import { PasswordStrength } from "@/components/auth/PasswordStrength.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Field } from "@/components/ui/Field.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import { safeNextPath } from "@/lib/auth/routes.ts";
import { authServerError, type AuthServerError } from "@/lib/auth/session-user.ts";
import { browserSupabase } from "@/lib/db/browser.ts";
import {
  AUTH_STEPS,
  USER_STATUSES,
  validateStep,
  type AuthErrors,
  type AuthInput,
  type AuthMode,
} from "@/lib/auth/validate.ts";

const SURFACE = "bg-surface rounded-lg shadow-(--shadow-surface) p-6 sm:p-8";

const EMPTY: AuthInput = { email: "", password: "", confirmPassword: "", name: "", status: "", consent: false };

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-callout font-[600] text-stop-text">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
        <circle cx="8" cy="8" r="7" stroke="var(--stop)" strokeWidth="1.5" fill="var(--stop-wash)" />
        <line x1="8" y1="4.5" x2="8" y2="8.5" stroke="var(--stop)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.75" fill="var(--stop)" />
      </svg>
      {message}
    </p>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const { t } = useLang();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const a = t.auth;
  const signup = mode === "signup";
  const consentId = useId();
  const statusId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [input, setInput] = useState<AuthInput>(EMPTY);
  const [tried, setTried] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<AuthServerError | null>(null);
  const steps = AUTH_STEPS[mode];
  const current = steps[step];
  const last = step === steps.length - 1;
  const shows = (key: keyof AuthInput) => current.fields.includes(key);

  const errors: AuthErrors = tried ? validateStep(mode, step, input) : {};
  const message = (key: keyof AuthInput) => (errors[key] ? a.errors[errors[key]] : undefined);

  function update<K extends keyof AuthInput>(key: K, value: AuthInput[K]) {
    setInput((existing) => ({ ...existing, [key]: value }));
  }

  function focusFirst(selector: string) {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(selector)?.focus());
  }

  function goTo(next: number) {
    setTried(false);
    setServerError(null);
    setStep(next);
    focusFirst("[data-step] input:not([hidden])");
  }

  async function finish() {
    const supabase = browserSupabase();
    if (!supabase) {
      setServerError("notConfigured");
      return;
    }
    setPending(true);
    setServerError(null);
    const email = input.email.trim();
    const { data, error } = signup
      ? await supabase.auth.signUp({
          email,
          password: input.password,
          options: { data: { name: input.name.trim(), status: input.status } },
        })
      : await supabase.auth.signInWithPassword({ email, password: input.password });
    if (error || !data.session) {
      setPending(false);
      setServerError(error ? authServerError(error) : "emailNotConfirmed");
      return;
    }
    router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
    router.refresh();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setTried(true);
    if (Object.keys(validateStep(mode, step, input)).length > 0) {
      focusFirst("input[aria-invalid='true'], [aria-invalid='true'] input");
      return;
    }
    if (!last) {
      goTo(step + 1);
      return;
    }
    void finish();
  }

  const stepOf = (name: (typeof steps)[number]["name"]) => steps.findIndex((s) => s.name === name);
  const review = [
    { label: a.email, value: input.email.trim(), step: stepOf("email") },
    { label: a.name, value: input.name.trim(), step: stepOf("profile") },
    { label: a.status, value: input.status ? a.statuses[input.status] : "", step: stepOf("profile") },
  ];

  return (
    <form ref={formRef} onSubmit={submit} noValidate className={`${SURFACE} flex flex-col gap-5 w-full max-w-md`}>
      <header className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{signup ? a.signupTitle : a.loginTitle}</h1>
        <p className="text-callout text-ink-soft">{signup ? a.signupLead : a.loginLead}</p>
      </header>

      <div className="flex flex-col gap-2">
        <p className="text-footnote text-ink-soft">
          {a.stepOf.replace("{step}", String(step + 1)).replace("{total}", String(steps.length))}
        </p>
        <ol className="flex gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <li
              key={s.name}
              className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= step ? "bg-sign-blue" : "bg-line"}`}
            />
          ))}
        </ol>
      </div>

      <motion.div
        key={step}
        data-step
        className="flex flex-col gap-4"
        initial={reduceMotion ? false : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-title-2 text-ink" aria-live="polite">
          {!signup && current.name === "password" ? a.password : a.steps[current.name]}
        </h2>

        {!shows("email") && current.name !== "review" && (
          <p className="text-callout text-ink-soft">
            {a.accountFor} <span className="font-[650] text-ink break-all">{input.email.trim()}</span>
          </p>
        )}
        {!shows("email") && (
          <input type="email" name="username" autoComplete="username" value={input.email.trim()} readOnly hidden />
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
          <div className="flex flex-col gap-2">
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
            {signup && <PasswordStrength password={input.password} />}
          </div>
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

        {shows("status") && (
          <fieldset
            role="radiogroup"
            aria-labelledby={`${statusId}-label`}
            className="flex flex-col gap-2"
            aria-invalid={errors.status ? true : undefined}
            aria-describedby={errors.status ? `${statusId}-error` : undefined}
          >
            <legend id={`${statusId}-label`} className="text-[16px] font-[600] text-ink pb-1.5">{a.status}</legend>
            {USER_STATUSES.map((status) => (
              <label
                key={status}
                className={`flex items-center gap-3 rounded-md border-[1.5px] px-3.5 py-3 text-body text-ink cursor-pointer transition-colors ${
                  input.status === status ? "border-sign-blue bg-brand-wash" : "border-line-strong hover:bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={input.status === status}
                  onChange={() => update("status", status)}
                  className="size-5 shrink-0 accent-sign-blue cursor-pointer"
                />
                {a.statuses[status]}
              </label>
            ))}
            {errors.status && <FieldError id={`${statusId}-error`} message={a.errors[errors.status]} />}
          </fieldset>
        )}

        {current.name === "review" && (
          <>
            <p className="text-callout text-ink-soft">{a.reviewLead}</p>
            <dl className="flex flex-col rounded-md bg-surface-2 px-4">
              {review.map((row) => (
                <div key={row.label} className="flex items-center gap-3 py-3 border-b border-line last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <dt className="text-footnote text-ink-soft">{row.label}</dt>
                    <dd className="text-body text-ink break-all">{row.value}</dd>
                  </div>
                  <Button type="button" variant="quiet" size="small" onClick={() => goTo(row.step)}>
                    {a.edit}
                    <span className="sr-only"> {row.label}</span>
                  </Button>
                </div>
              ))}
            </dl>
          </>
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
              <div className="pl-8">
                <FieldError id={`${consentId}-error`} message={a.errors[errors.consent]} />
              </div>
            )}
          </div>
        )}
      </motion.div>

      {serverError && (
        <Notice variant={serverError === "rateLimited" ? "limit" : "error"}>{a.serverErrors[serverError]}</Notice>
      )}

      <div className={`flex items-center gap-3 pt-1 ${step > 0 ? "justify-between" : "justify-end"}`}>
        {step > 0 && (
          <Button type="button" variant="quiet" disabled={pending} onClick={() => goTo(step - 1)}>
            {a.back}
          </Button>
        )}
        <Button type="submit" pending={pending}>
          {!last ? a.next : signup ? a.createAccount : a.login}
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
