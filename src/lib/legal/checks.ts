import type { ContractResult, Verdict } from "../ai/schemas.ts";

export type NumberFinding = { ruleId: string; verdict: Verdict; found: number; limit: number; basis?: string };

export const INTERNSHIP_MAX_MONTHS = 6;
export const PKWT_MAX_MONTHS = 24;

const known = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

const finding = (ruleId: string, found: number, limit: number, ok: boolean): NumberFinding => ({
  ruleId,
  verdict: ok ? "green" : "red",
  found,
  limit,
});

export function checkWage(
  monthlyWage: number | null,
  minimumWage: number | null,
  basis?: string,
  cityLevel = false,
): NumberFinding | null {
  if (!known(monthlyWage) || !known(minimumWage)) return null;
  const result = finding("minimum-wage", monthlyWage, minimumWage, monthlyWage >= minimumWage);
  const verdict = result.verdict === "green" && !cityLevel ? "yellow" : result.verdict;
  return basis ? { ...result, verdict, basis } : { ...result, verdict };
}

export function checkDuration(contractType: ContractResult["contractType"], months: number | null): NumberFinding | null {
  if (!known(months)) return null;
  if (contractType === "magang") return finding("internship-length", months, INTERNSHIP_MAX_MONTHS, months <= INTERNSHIP_MAX_MONTHS);
  if (contractType === "PKWT") return finding("pkwt-length", months, PKWT_MAX_MONTHS, months <= PKWT_MAX_MONTHS);
  return null;
}
