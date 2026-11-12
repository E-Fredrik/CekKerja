"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useState } from "react";
import { useLang } from "@/components/ui/lang.tsx";
import { Segmented } from "@/components/ui/Segmented.tsx";
import type { Lang } from "@/lib/i18n.ts";

function LogoMark() {
  return (
    <svg
      width="36"
      height="20"
      viewBox="0 0 36 20"
      fill="none"
      aria-hidden="true"
    >
      <rect width="36" height="20" rx="10" fill="var(--housing)" />
      <circle cx="10" cy="10" r="5" fill="var(--stop)" />
      <circle cx="18" cy="10" r="5" fill="var(--warn)" />
      <circle cx="26" cy="10" r="5" fill="var(--go)" />
    </svg>
  );
}

export function NavBar() {
  const { lang, t, setLang } = useLang();
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    setHidden(y > 80 && y > (scrollY.getPrevious() ?? 0));
  });
  const pathname = usePathname();

  const links = [
    { href: "/lowongan", label: t.nav.lowongan },
    { href: "/kontrak", label: t.nav.kontrak },
    { href: "/interview", label: t.nav.interview },
  ];

  const langOptions = [
    { value: "id" as Lang, label: t.lang.id },
    { value: "en" as Lang, label: t.lang.en },
  ];

  return (
    <motion.header
      className="bg-shell sticky top-0 z-40 w-full"
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
      onFocusCapture={() => setHidden(false)}
    >
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 focus-visible:outline-on-shell"
            aria-label={t.nav.brand}
          >
            <LogoMark />
            <span className="text-on-shell text-[19px] font-[800] leading-none tracking-tight">
              {t.nav.brand}
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="hidden min-[720px]:flex items-center gap-1"
          >
            {links.map(({ href, label }) => {
              const current = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={[
                    "relative px-3 py-1.5 text-[15px] font-[600] rounded-md transition-colors",
                    current
                      ? "text-on-shell"
                      : "text-on-shell-soft hover:text-on-shell",
                  ].join(" ")}
                >
                  {label}
                  {current && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-[3px] bg-on-shell rounded-full"
                      style={{ clipPath: "polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Segmented
              options={langOptions}
              value={lang}
              onChange={setLang}
              inverse
              label="Pilih bahasa / Choose language"
            />
            <Link
              href="/masuk"
              aria-current={pathname === "/masuk" ? "page" : undefined}
              className="inline-flex items-center h-9 px-4 rounded-full bg-on-shell text-shell text-[14px] font-[650] leading-none hover:bg-on-shell/90 active:scale-[0.98] transition-all focus-visible:outline-3 focus-visible:outline-on-shell focus-visible:outline-offset-2"
            >
              {t.nav.masuk}
            </Link>
          </div>
        </div>
      </div>

      <div className="min-[720px]:hidden border-t border-on-shell/10 overflow-x-auto">
        <div className="flex items-center gap-1 px-4 py-1.5 w-max">
          {links.map(({ href, label }) => {
            const current = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={[
                  "relative px-3 py-1.5 text-[15px] font-[600] rounded-md whitespace-nowrap transition-colors",
                  current
                    ? "text-on-shell"
                    : "text-on-shell-soft hover:text-on-shell",
                ].join(" ")}
              >
                {label}
                {current && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[3px] bg-on-shell rounded-full"
                    style={{ clipPath: "polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)" }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </motion.header>
  );
}
