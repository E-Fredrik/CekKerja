"use client";

import { PageHeader } from "@/components/ui/PageHeader.tsx";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/auth/session.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Notice } from "@/components/ui/Notice.tsx";
import { PlanCard } from "@/components/ui/PlanCard.tsx";
import { useLang } from "@/components/ui/lang.tsx";
import type { PlanStatus } from "@/lib/billing/plan.ts";

type PayInfoResponse = {
  plan: PlanStatus;
  configured: boolean;
  clientKey: string | null;
  snapScriptUrl: string | null;
};

type SnapWindow = Window & {
  snap?: {
    pay: (
      token: string,
      callbacks: {
        onSuccess?: () => void;
        onPending?: () => void;
        onError?: () => void;
        onClose?: () => void;
      },
    ) => void;
  };
};

type NoticeState =
  | { variant: "success" | "limit" | "error" | "info"; text: string }
  | null;

function loadSnapScript(src: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as SnapWindow).snap) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Snap failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Snap failed to load"));
    document.body.appendChild(script);
  });
}

export function PremiumClient() {
  const { lang, t } = useLang();
  const { ready, user } = useSession();
  const p = t.premium;

  const [info, setInfo] = useState<PayInfoResponse | null>(null);
  const [fetched, setFetched] = useState(false);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const fetchPlan = useCallback(
    async (orderId?: string): Promise<PayInfoResponse | null> => {
      try {
        const url = orderId ? `/api/pay?orderId=${encodeURIComponent(orderId)}` : "/api/pay";
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 401) {
          setInfo(null);
          return null;
        }
        if (!res.ok) throw new Error("loadError");
        const data: PayInfoResponse = await res.json();
        setInfo(data);
        return data;
      } catch {
        setNotice({ variant: "error", text: p.loadError });
        return null;
      } finally {
        setFetched(true);
      }
    },
    [p.loadError],
  );

  useEffect(() => {
    if (!ready || !user) return;
    const controller = new AbortController();
    fetch("/api/pay", { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (controller.signal.aborted) return;
        if (res.status === 401) {
          setInfo(null);
          return;
        }
        if (!res.ok) throw new Error("loadError");
        const data: PayInfoResponse = await res.json();
        if (!controller.signal.aborted) setInfo(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotice({ variant: "error", text: p.loadError });
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetched(true);
      });
    return () => controller.abort();
  }, [ready, user, p.loadError]);

  async function startPayment() {
    setNotice(null);
    setPaying(true);
    try {
      const res = await fetch("/api/pay", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({
          variant: "error",
          text: data.error === "notConfigured" ? p.notConfigured : p.payError,
        });
        setPaying(false);
        return;
      }

      const { orderId, token, redirectUrl, clientKey, snapScriptUrl } = data as {
        orderId: string;
        token: string;
        redirectUrl: string;
        clientKey: string;
        snapScriptUrl: string;
      };

      await loadSnapScript(snapScriptUrl, clientKey).catch(() => null);
      const snap = (window as SnapWindow).snap;
      if (!snap) {
        window.location.href = redirectUrl;
        return;
      }

      snap.pay(token, {
        onSuccess: async () => {
          setNotice({ variant: "info", text: p.verifying });
          const updated = await fetchPlan(orderId);
          setPaying(false);
          if (updated?.plan.isPremium) {
            setNotice({ variant: "success", text: p.success });
          } else {
            setNotice({ variant: "limit", text: p.pending });
          }
        },
        onPending: () => {
          setPaying(false);
          setNotice({ variant: "limit", text: p.pending });
        },
        onError: () => {
          setPaying(false);
          setNotice({ variant: "error", text: p.payError });
        },
        onClose: () => {
          setPaying(false);
        },
      });
    } catch {
      setPaying(false);
      setNotice({ variant: "error", text: p.payError });
    }
  }

  const plan = info?.plan;
  const isPremium = Boolean(plan?.isPremium);
  const formattedUntil = plan?.premiumUntil
    ? new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { dateStyle: "long" }).format(
        new Date(plan.premiumUntil),
      )
    : null;

  const freeMeta = plan
    ? p.freeUsage
        .replace("{used}", String(plan.checksThisMonth))
        .replace("{limit}", String(plan.monthlyLimit))
    : undefined;

  const premiumMeta = formattedUntil ? p.premiumActiveUntil.replace("{date}", formattedUntil) : undefined;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pb-16 sm:px-6 lg:px-8">
      <PageHeader title={p.title} intro={p.lead} width="narrow" />

      {!ready || (user && !fetched && !info) ? (
        <p role="status" className="text-body text-ink-soft">
          {p.loading}
        </p>
      ) : !user ? (
        <Notice variant="info">
          <div className="flex flex-wrap items-center gap-3">
            <span>{p.signInPrompt}</span>
            <Link href="/masuk?next=%2Fpremium" className="font-[650] text-sign-blue underline">
              {p.signIn}
            </Link>
          </div>
        </Notice>
      ) : null}

      {notice && <Notice variant={notice.variant}>{notice.text}</Notice>}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PlanCard
          name={p.freeName}
          price={p.freePrice}
          period={p.freePeriod}
          features={p.freeFeatures}
          current={Boolean(user && plan && !isPremium)}
          currentBadge={p.currentBadge}
          meta={!isPremium ? freeMeta : undefined}
        />

        <PlanCard
          name={p.premiumName}
          price={p.premiumPrice}
          period={p.premiumPeriod}
          features={p.premiumFeatures}
          highlighted
          current={isPremium}
          currentBadge={p.currentBadge}
          meta={premiumMeta}
          action={
            user ? (
              <Button
                type="button"
                variant="primary"
                onClick={startPayment}
                disabled={paying || info?.configured === false}
                aria-busy={paying}
              >
                {paying ? p.paying : isPremium ? p.extend : p.upgrade}
              </Button>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
