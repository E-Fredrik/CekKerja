import type { VerdictKind } from "@/components/ui/VerdictSign.tsx";

export const SIGNAL_ORDER: readonly VerdictKind[] = ["red", "yellow", "green"];

export function litLamp(progress: number): 0 | 1 | 2 {
  return progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;
}
