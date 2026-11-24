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

const historyPaths = new Map([
  ["/api/check-ad", "/api/history/ad"],
  ["/api/check-contract", "/api/history/contract"],
  ["/api/interview", "/api/history/interview"],
]);

export function useCheck<T>(url: string): UseCheckReturn<T> {
  const { t } = useLang();
  const [state, setState] = useState<CheckState<T>>({ status: "idle" });

  const run = useCallback(
    async (body: Record<string, unknown> | FormData) => {
      setState({ status: "pending" });
      try {
        const isFormData = body instanceof FormData;
        const historyPath = historyPaths.get(url);
        const headers: Record<string, string> = {};
        if (!isFormData) headers["Content-Type"] = "application/json";
        if (historyPath) headers["X-CekKerja-History"] = "1";
        const res = await fetch(historyPath ?? url, {
          method: "POST",
          headers,
          body: isFormData ? body : JSON.stringify(body),
        });

        if (!res.ok) {
          let message = t.check.errorUnknown;
          try {
            const json = await res.json();
            const codes: Record<string, string> = t.check.errors;
            if (typeof json?.code === "string" && json.code in codes) message = codes[json.code];
            else if (typeof json?.error === "string") message = json.error;
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
