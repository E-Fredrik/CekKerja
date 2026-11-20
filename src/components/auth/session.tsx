"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { browserSupabase } from "@/lib/db/browser.ts";
import { userFromAuth, type SessionUser } from "@/lib/auth/session-user.ts";

const LEGACY_STORAGE_KEY = "ck-session";

type SessionContextValue = {
  user: SessionUser | null;
  ready: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
    const supabase = browserSupabase();
    if (!supabase) {
      queueMicrotask(() => setReady(true));
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(userFromAuth(session?.user));
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await browserSupabase()?.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }, [router]);

  return <SessionContext.Provider value={{ user, ready, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
