"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useSession } from "@/components/auth/session.tsx";
import { parseStoredCv, trimCv, type CvProfile } from "@/lib/cv/profile.ts";

const listeners = new Set<() => void>();

const keyFor = (email: string) => `ck-cv:${email.toLowerCase()}`;

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith("ck-cv:")) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

const notify = () => listeners.forEach((callback) => callback());

export function useCvProfile() {
  const { user } = useSession();
  const email = user?.email ?? null;
  const raw = useSyncExternalStore(
    subscribe,
    () => (email ? localStorage.getItem(keyFor(email)) : null),
    () => null,
  );
  const cv = parseStoredCv(raw);

  const saveCv = useCallback(
    (next: CvProfile) => {
      if (!email) return;
      localStorage.setItem(keyFor(email), JSON.stringify(trimCv(next)));
      notify();
    },
    [email],
  );

  const clearCv = useCallback(() => {
    if (!email) return;
    localStorage.removeItem(keyFor(email));
    notify();
  }, [email]);

  return { cv, signedIn: email !== null, saveCv, clearCv };
}
