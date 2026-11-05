"use client";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  inverse?: boolean;
  label: string;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  inverse = false,
  label,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={[
        "inline-flex items-center rounded-full p-0.5 gap-0.5",
        inverse ? "bg-shell border border-on-shell/20" : "bg-surface-2",
      ].join(" ")}
    >
      {options.map((opt) => {
        const checked = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(opt.value)}
            className={[
              "relative px-3 py-1 rounded-full text-[14px] font-[650] leading-none transition-colors cursor-pointer select-none",
              checked
                ? inverse
                  ? "bg-on-shell text-shell shadow-(--shadow-thumb)"
                  : "bg-surface text-ink shadow-(--shadow-thumb)"
                : inverse
                  ? "text-on-shell-soft hover:text-on-shell"
                  : "text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
