"use client";

import { type ButtonHTMLAttributes } from "react";
import { useLang } from "@/components/ui/lang.tsx";

type Variant = "primary" | "secondary" | "quiet" | "inverse";
type Size = "default" | "small";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  pending?: boolean;
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-sign-blue text-on-sign-blue hover:ring-4 hover:ring-brand-wash active:scale-[0.98]",
  secondary:
    "bg-surface text-ink border border-[1.5px] border-line-strong hover:bg-surface-2 active:scale-[0.98]",
  quiet: "text-sign-blue hover:bg-brand-wash active:scale-[0.98]",
  inverse:
    "bg-on-shell text-shell hover:bg-on-shell/90 active:scale-[0.98]",
};

const sizeClass: Record<Size, string> = {
  default: "h-11 px-[22px] text-[16px] font-[650]",
  small: "h-9 px-4 text-[14px] font-[650]",
};

export function Button({
  variant = "primary",
  size = "default",
  pending = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const { t } = useLang();
  const isDisabled = disabled || pending;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full leading-none whitespace-nowrap transition-all cursor-pointer select-none",
        "focus-visible:outline-3 focus-visible:outline-sign-blue focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(" ")}
    >
      {pending ? (
        <>
          <Spinner />
          {t.button.pending}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
