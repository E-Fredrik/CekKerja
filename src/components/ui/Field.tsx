"use client";

import { type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";

type FieldBaseProps = {
  label: string;
  hint?: string;
  error?: string;
};

export type InputFieldProps = FieldBaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
  };

export type TextareaFieldProps = FieldBaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: "textarea";
  };

export type FieldProps = InputFieldProps | TextareaFieldProps;

export function Field(props: FieldProps) {
  const generatedId = useId();

  if (props.as === "textarea") {
    const { label, hint, error, as, id = generatedId, className = "", ...rest } = props;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <label htmlFor={id} className="text-[16px] font-[600] text-ink leading-snug">
          {label}
        </label>
        <textarea
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            "w-full bg-surface text-ink text-body rounded-md border border-[1.5px] border-line-strong",
            "px-[14px] py-[11px] min-h-[120px] leading-snug resize-y",
            "placeholder:text-ink-soft",
            "focus:outline-none focus:border-sign-blue focus:ring-4 focus:ring-brand-wash",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-stop focus:border-stop focus:ring-stop-wash" : "",
          ].join(" ")}
          {...rest}
        />
        {hint && !error && (
          <p id={hintId} className="text-callout text-ink-soft">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex items-center gap-1.5 text-callout font-[600] text-stop-text">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
              <circle cx="8" cy="8" r="7" stroke="var(--stop)" strokeWidth="1.5" fill="var(--stop-wash)" />
              <line x1="8" y1="4.5" x2="8" y2="8.5" stroke="var(--stop)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11" r="0.75" fill="var(--stop)" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }

  const { label, hint, error, as, id = generatedId, className = "", type = "text", ...rest } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[16px] font-[600] text-ink leading-snug">
        {label}
      </label>
      <input
        id={id}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          "w-full bg-surface text-ink text-body rounded-md border border-[1.5px] border-line-strong",
          "px-[14px] py-[11px] min-h-[46px] leading-snug",
          "placeholder:text-ink-soft",
          "focus:outline-none focus:border-sign-blue focus:ring-4 focus:ring-brand-wash",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-stop focus:border-stop focus:ring-stop-wash" : "",
        ].join(" ")}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-callout text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-callout font-[600] text-stop-text">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="var(--stop)" strokeWidth="1.5" fill="var(--stop-wash)" />
            <line x1="8" y1="4.5" x2="8" y2="8.5" stroke="var(--stop)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.75" fill="var(--stop)" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
