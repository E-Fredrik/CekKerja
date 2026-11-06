"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { useLang } from "@/components/ui/lang.tsx";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 8 * 1024 * 1024;

type FileDropProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function FileDrop({ onFile, disabled = false }: FileDropProps) {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) return t.fileDrop.errorType;
    if (file.size > MAX_BYTES) return t.fileDrop.errorSize;
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) {
      setError(err);
      setSelected(null);
      return;
    }
    setError(null);
    setSelected(file.name);
    onFile(file);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-label={t.fileDrop.idle}
        className={[
          "flex flex-col items-center justify-center gap-2 w-full min-h-[120px] rounded-md",
          "border-[1.5px] border-dashed border-line-strong px-4 py-6",
          "text-callout text-ink-soft cursor-pointer transition-colors",
          "focus-visible:outline-3 focus-visible:outline-sign-blue focus-visible:outline-offset-2",
          dragging
            ? "border-sign-blue bg-brand-wash text-sign-blue"
            : "bg-surface-2 hover:border-sign-blue hover:bg-brand-wash hover:text-sign-blue",
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
        ].join(" ")}
      >
        <UploadIcon />
        <span className="font-[500]">
          {dragging ? t.fileDrop.active : selected ? `${t.fileDrop.selected}: ${selected}` : t.fileDrop.idle}
        </span>
        <span className="text-footnote">{t.fileDrop.hint}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {error && (
        <p className="flex items-center gap-1.5 text-callout font-[600] text-stop-text">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="var(--stop)" strokeWidth="1.5" fill="var(--stop-wash)" />
            <line x1="8" y1="4.5" x2="8" y2="8.5" stroke="var(--stop)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.75" fill="var(--stop)" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 22V10M16 10l-5 5M16 10l5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 24a4 4 0 0 1-1-7.874A8 8 0 0 1 24 14a6 6 0 0 1 2 11.646"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
