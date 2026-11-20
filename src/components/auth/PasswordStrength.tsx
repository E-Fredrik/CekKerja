"use client";

import { useLang } from "@/components/ui/lang.tsx";
import { passwordStrength } from "@/lib/auth/password-strength.ts";

const SEGMENTS = [1, 2, 3, 4];

export function PasswordStrength({ password }: { password: string }) {
  const { t } = useLang();
  const a = t.auth;
  const { level, hint } = passwordStrength(password);
  const empty = password === "";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {SEGMENTS.map((segment) => (
            <span
              key={segment}
              className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                !empty && segment <= level ? "bg-sign-blue" : "bg-line"
              }`}
            />
          ))}
        </div>
        <p className="text-footnote text-ink-soft min-w-[6.5rem] text-right" aria-live="polite">
          {empty ? (
            <span className="sr-only">{a.strength.label}</span>
          ) : (
            <>
              <span className="sr-only">{a.strength.label}: </span>
              {a.strength[`level${level}`]}
            </>
          )}
        </p>
      </div>
      {!empty && hint && <p className="text-footnote text-ink-soft">{a.strengthHints[hint]}</p>}
    </div>
  );
}
