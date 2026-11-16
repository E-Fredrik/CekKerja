"use client";

import type { ReactNode } from "react";
import { useLang } from "@/components/ui/lang.tsx";
import type { CvProfile } from "@/lib/cv/profile.ts";

function Section({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  const { t } = useLang();
  return (
    <section className="flex flex-col gap-2 py-5 border-t border-line first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="text-headline text-ink">{title}</h3>
      {empty ? <p className="text-callout text-ink-soft">{t.profile.nothing}</p> : children}
    </section>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-sm bg-surface-2 px-2.5 py-1 text-callout text-ink">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CvView({ cv }: { cv: CvProfile }) {
  const { t } = useLang();
  const p = t.profile;
  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-1 pb-5">
        <h2 className="text-title-2 text-ink">{cv.name || p.noName}</h2>
        {cv.headline && <p className="text-body text-ink-soft">{cv.headline}</p>}
      </header>

      <Section title={p.education} empty={cv.education.length === 0}>
        <ul className="flex flex-col gap-2">
          {cv.education.map((e, i) => (
            <li key={i} className="text-body text-ink">
              <span className="font-[650]">{e.school}</span>
              {e.degree && <span>, {e.degree}</span>}
              {e.years && <span className="text-callout text-ink-soft"> · {e.years}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={p.experience} empty={cv.experience.length === 0}>
        <ul className="flex flex-col gap-4">
          {cv.experience.map((e, i) => (
            <li key={i} className="flex flex-col gap-1">
              <p className="text-body text-ink">
                <span className="font-[650]">{e.role}</span>
                {e.organisation && <span>, {e.organisation}</span>}
                {e.years && <span className="text-callout text-ink-soft"> · {e.years}</span>}
              </p>
              {e.highlights.length > 0 && (
                <ul className="list-disc pl-5 text-callout text-ink-soft flex flex-col gap-1">
                  {e.highlights.map((h, j) => (
                    <li key={j}>{h}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={p.skills} empty={cv.skills.length === 0}>
        <Tags items={cv.skills} />
      </Section>

      <Section title={p.languages} empty={cv.languages.length === 0}>
        <Tags items={cv.languages} />
      </Section>
    </div>
  );
}
