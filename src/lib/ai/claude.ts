import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Part } from "@google/genai";
import type { z } from "zod";

export const CLAUDE_SMART = "claude-opus-5-5";
export const CLAUDE_FAST = "claude-haiku-5-5";
const EFFORT: Record<string, "low" | "high"> = { [CLAUDE_SMART]: "high", [CLAUDE_FAST]: "low" };
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

export class ModelRefusal extends Error {}

let client: Anthropic | null = null;
function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.");
  return (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 }));
}

export function toClaudeContent(parts: Part[]): Anthropic.ContentBlockParam[] {
  const files: Anthropic.ContentBlockParam[] = [];
  const texts: Anthropic.ContentBlockParam[] = [];
  for (const part of parts) {
    if (typeof part.text === "string") texts.push({ type: "text", text: part.text });
    const file = part.inlineData;
    if (!file?.data) continue;
    if (file.mimeType === "application/pdf") {
      files.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } });
    } else if (IMAGE_TYPES.includes(file.mimeType as ImageType)) {
      files.push({ type: "image", source: { type: "base64", media_type: file.mimeType as ImageType, data: file.data } });
    } else {
      throw new Error(`Unsupported file type for Claude: ${file.mimeType}`);
    }
  }
  if (texts.length === 0) texts.push({ type: "text", text: "Read the attached document." });
  return [...files, ...texts];
}

export async function claudeJson<S extends z.ZodType>(schema: S, system: string, parts: Part[], model: string): Promise<z.infer<S>> {
  const res = await anthropic().messages.parse({
    model,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: toClaudeContent(parts) }],
    output_config: { format: zodOutputFormat(schema), effort: EFFORT[model] ?? "high" },
  });
  if (res.stop_reason === "refusal") throw new ModelRefusal(`Claude ${model} declined the request`);
  if (res.parsed_output == null) throw new SyntaxError(`Claude ${model} returned no JSON (stop reason: ${res.stop_reason})`);
  return schema.parse(res.parsed_output);
}
