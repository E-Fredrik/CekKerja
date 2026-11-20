"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/auth/session.tsx";
import { CvProfile } from "@/lib/cv/profile.ts";

const LEGACY_PREFIX = "ck-cv:";

type Loaded = { email: string; cv: CvProfile | null };

function dropLegacyCopies() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(LEGACY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}

const parseCv = (value: unknown): CvProfile | null => {
  const parsed = CvProfile.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export function useCvProfile() {
  const { user, ready } = useSession();
  const email = user?.email ?? null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    dropLegacyCopies();
    if (!email) return;
    let active = true;
    fetch("/api/cv", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        if (active) setLoaded({ email, cv: parseCv(data?.cv) });
      });
    return () => {
      active = false;
    };
  }, [email]);

  const current = email && loaded?.email === email ? loaded : null;

  const saveCv = useCallback(
    (next: unknown) => {
      if (email) setLoaded({ email, cv: parseCv(next) });
    },
    [email],
  );

  const clearCv = useCallback(async (): Promise<boolean> => {
    if (!email) return false;
    const res = await fetch("/api/cv", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return false;
    setLoaded({ email, cv: null });
    return true;
  }, [email]);

  return { cv: current?.cv ?? null, signedIn: email !== null, loading: !ready || (email !== null && !current), saveCv, clearCv };
}
