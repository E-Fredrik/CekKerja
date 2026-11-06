"use client";

import { useLang } from "@/components/ui/lang.tsx";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-line mt-auto">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-callout text-ink-soft text-center">
          {t.footer.disclaimer}
        </p>
      </div>
    </footer>
  );
}
