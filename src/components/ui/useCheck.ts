"use client";

import { useState, useCallback } from "react";
import { useLang } from "@/components/ui/lang.tsx";

type CheckState<T> =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "done"; result: T }
  | { status: "error"; message: string };

type UseCheckReturn<T> = {
  state: CheckState<T>;
  run: (body: Record<string, unknown> | FormData) => Promise<void>;
  reset: () => void;
};

export function useCheck<T>(url: string): UseCheckReturn<T> {
  const { t } = useLang();
  const [state, setState] = useState<CheckState<T>>({ status: "idle" });

  const run = useCallback(
    async (body: Record<string, unknown> | FormData) => {
      setState({ status: "pending" });
      try {
        const isFormData = body instanceof FormData;
        const res = await fetch(url, {
          method: "POST",
          headers: isFormData ? undefined : { "Content-Type": "application/json" },
          body: isFormData ? body : JSON.stringify(body),
        });

        if (!res.ok) {
          let message = t.check.errorUnknown;
          try {
            const json = await res.json();
            if (typeof json?.error === "string") message = json.error;
          } catch {}
          setState({ status: "error", message });
          return;
        }

        const result: T = await res.json();
        setState({ status: "done", result });
      } catch {
        setState({ status: "error", message: t.check.errorNetwork });
      }
    },
    [url, t],
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, run, reset };
}
