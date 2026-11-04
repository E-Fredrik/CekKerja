import type { Mode } from "./ai/gemini.ts";

export type Lang = "id" | "en";

export const MAX_UPLOAD = 8 * 1024 * 1024;
export const UPLOAD_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export class BadRequest extends Error {}

// Anything unexpected falls back to the defaults: Indonesian and the fast model.
export const langOf = (v: unknown): Lang => (v === "en" ? "en" : "id");
export const modeOf = (v: unknown): Mode => (v === "smart" ? "smart" : "fast");

export function checkFile(file: unknown, label: string): File {
  if (!(file instanceof File) || file.size === 0) throw new BadRequest(`${label}: file is missing`);
  if (!UPLOAD_TYPES.includes(file.type)) throw new BadRequest(`${label}: use PDF, PNG, JPG or WEBP`);
  if (file.size > MAX_UPLOAD) throw new BadRequest(`${label}: file is larger than 8 MB`);
  return file;
}

// Wraps a route handler so every failure becomes a { error } JSON with the right status.
// ponytail: no auth or plan checks yet; add them here when accounts (K07) and Premium (K09) land.
export function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      return Response.json(await fn(req));
    } catch (e) {
      const status = e instanceof BadRequest ? 400 : 500;
      if (status === 500) console.error(e);
      // 500s can carry internal details, so only BadRequest messages and our own busy message go out.
      const message = e instanceof Error && (status === 400 || /busy right now/.test(e.message)) ? e.message : "Something went wrong. Try again.";
      return Response.json({ error: message }, { status });
    }
  };
}
