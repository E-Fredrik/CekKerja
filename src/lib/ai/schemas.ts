import { z } from "zod";

// red = Melanggar? / Violation?, yellow = Cek lagi / Check again, green = Aman / OK (DESIGN.md).
export const Verdict = z.enum(["red", "yellow", "green"]);

export const Flag = z.object({
  quote: z.string().describe("Exact text from the job ad this flag is about"),
  verdict: Verdict,
  ruleId: z.string().describe("Rule id from the provided list, or 'other' if none fits"),
  explanation: z.string().describe("Plain-language explanation for a student"),
  questionToAsk: z.string().describe("A polite question the candidate can ask the employer"),
});

export const AdResult = z.object({
  summary: z.string(),
  role: z.string(),
  company: z.string(),
  flags: z.array(Flag),
  inclusiveRewrite: z.string().describe("The ad rewritten without exclusionary criteria"),
});

export const Clause = z.object({
  title: z.string().describe("Short name of the clause, e.g. 'Masa percobaan'"),
  text: z.string().describe("The clause text exactly as written in the contract"),
  verdict: Verdict,
  ruleId: z.string().describe("Rule id from the provided list, or 'other' if none fits"),
  explanation: z.string(),
  questionToAsk: z.string().describe("A polite question for HR about this clause; empty for green clauses"),
});

export const ContractResult = z.object({
  contractType: z.enum(["PKWT", "PKWTT", "magang", "unknown"]),
  summary: z.string(),
  monthlyWage: z.number().nullable().describe("Monthly wage in rupiah if stated, else null"),
  city: z.string().nullable().describe("Work location city if stated, else null"),
  durationMonths: z.number().nullable().describe("Contract or internship length in months if stated, else null"),
  clauses: z.array(Clause),
  negotiationMessage: z.string().describe("Polite message to HR about the red and yellow clauses"),
});

export const InterviewQuestion = z.object({
  question: z.string(),
  category: z.enum(["role", "behavioral", "company", "cv", "portfolio"]),
  whyTailored: z.string().describe("Why this question fits this candidate and job"),
  source: z.string().describe("URL of the scraped source it came from, or 'generated'"),
  answerTips: z.string(),
});

export const InterviewResult = z.object({
  role: z.string(),
  company: z.string(),
  candidateSnapshot: z.string().describe("2-3 sentences: strengths and gaps vs the job"),
  questions: z.array(InterviewQuestion),
  questionsToAskThem: z.array(z.string()).describe("Questions the candidate should ask, incl. contract and rights"),
});

export type Verdict = z.infer<typeof Verdict>;
export type Flag = z.infer<typeof Flag>;
export type AdResult = z.infer<typeof AdResult>;
export type Clause = z.infer<typeof Clause>;
export type ContractResult = z.infer<typeof ContractResult>;
export type InterviewQuestion = z.infer<typeof InterviewQuestion>;
export type InterviewResult = z.infer<typeof InterviewResult>;
