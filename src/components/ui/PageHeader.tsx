import type { Ref } from "react";

type PageHeaderProps = {
  title: string;
  intro?: string;
  titleRef?: Ref<HTMLHeadingElement>;
  width?: "wide" | "narrow";
};

export function PageHeader({ title, intro, titleRef, width = "wide" }: PageHeaderProps) {
  return (
    <header className="gantry">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${width === "wide" ? "max-w-[76rem]" : "max-w-4xl"}`}>
        <div className="gantry-sign flex w-fit max-w-full flex-col gap-4 lg:max-w-[52rem]">
          <h1 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="text-large-title text-on-gantry text-balance">
            {title}
          </h1>
          {intro && <p className="text-body text-on-gantry-soft max-w-[60ch] text-pretty">{intro}</p>}
        </div>
      </div>
    </header>
  );
}
