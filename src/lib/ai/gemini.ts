import { GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";

export type Mode = "fast" | "smart";
const FAST = "gemini-flash-lite-latest";
const SMART = process.env.GEMINI_MODEL || "gemini-flash-latest";
export const modelsFor = (mode: Mode) => (mode === "smart" ? [SMART, FAST, FAST] : [FAST, FAST]);
const TIMEOUT_MS = 60_000;

let client: GoogleGenAI | null = null;
function ai() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set. Add it to .env.local.");
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: TIMEOUT_MS } }));
}

export const AI_BUSY_MESSAGE = "The AI service is busy right now. Wait a minute and try again.";
const RETRYABLE = new Set([429, 500, 503, 504]);
const retryable = (e: unknown) => {
  if (e instanceof SyntaxError || e instanceof z.ZodError) return true;
  const status = (e as { status?: number }).status;
  return status === undefined ? /timeout|abort|fetch failed/i.test(String(e)) : RETRYABLE.has(status);
};

export async function withRetry<T>(call: (model: string) => Promise<T>, models = modelsFor("fast"), pauseMs = 1500): Promise<T> {
  for (const [i, model] of models.entries()) {
    try {
      return await call(model);
    } catch (e) {
      if (!retryable(e)) throw e;
      console.warn(`Gemini ${model} attempt ${i + 1} failed:`, String(e).slice(0, 160));
      if (i === models.length - 1) throw new Error(AI_BUSY_MESSAGE);
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
  throw new Error("No model configured");
}

export async function generateJson<S extends z.ZodType>(
  schema: S,
  system: string,
  parts: Part[],
  mode: Mode = "fast",
): Promise<z.infer<S>> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return withRetry(async (model) => {
    const res = await ai().models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        temperature: 0.2,
      },
    });
    return schema.parse(JSON.parse(res.text ?? ""));
  }, modelsFor(mode));
}

export async function fileToPart(file: File): Promise<Part> {
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { inlineData: { mimeType: file.type || "application/pdf", data } };
}
