import { GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";

// "fast" (default) uses Flash-Lite. "smart" tries Flash first and drops to Flash-Lite if Flash is
// overloaded. GEMINI_MODEL overrides the smart model (|| so an empty value falls back too).
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

// Gemini's free tier often answers 503 (busy) or 429 (rate limit), or just hangs.
// Try each model in turn (with a short pause), then fail with a message people can act on.
const RETRYABLE = new Set([429, 500, 503, 504]);
const retryable = (e: unknown) => {
  // An empty or cut-off JSON answer: another attempt usually returns a full one.
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
      if (i === models.length - 1) throw new Error("The AI service is busy right now. Wait a minute and try again.");
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
  throw new Error("No model configured");
}

// Asks Gemini for JSON shaped by the zod schema and validates the answer before returning it.
// The model only classifies and explains; numbers and laws are decided elsewhere in code.
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

// Turns an uploaded PDF or image into a part Gemini can read directly.
export async function fileToPart(file: File): Promise<Part> {
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { inlineData: { mimeType: file.type || "application/pdf", data } };
}
