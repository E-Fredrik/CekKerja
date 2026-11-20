import { AI_BUSY_MESSAGE, type Mode } from "./ai/gemini.ts";

export type Lang = "id" | "en";

export const MAX_UPLOAD = 8 * 1024 * 1024;
export const UPLOAD_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export type ErrorCode = "fileMissing" | "fileType" | "fileSize" | "signIn" | "busy" | "unknown";

export class BadRequest extends Error {
  code?: ErrorCode;
  constructor(message: string, code?: ErrorCode) {
    super(message);
    this.code = code;
  }
}

export class SignInNeeded extends BadRequest {
  constructor() {
    super("Sign in first", "signIn");
  }
}

export const langOf = (v: unknown): Lang => (v === "en" ? "en" : "id");
export const modeOf = (v: unknown): Mode => (v === "smart" ? "smart" : "fast");

export function checkFile(file: unknown, label: string): File {
  if (!(file instanceof File) || file.size === 0) throw new BadRequest(`${label}: file is missing`, "fileMissing");
  if (!UPLOAD_TYPES.includes(file.type)) throw new BadRequest(`${label}: use PDF, PNG, JPG or WEBP`, "fileType");
  if (file.size > MAX_UPLOAD) throw new BadRequest(`${label}: file is larger than 8 MB`, "fileSize");
  return file;
}

export function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      return Response.json(await fn(req));
    } catch (e) {
      const status = e instanceof SignInNeeded ? 401 : e instanceof BadRequest ? 400 : 500;
      if (status === 500) console.error(e);
      const busy = e instanceof Error && e.message === AI_BUSY_MESSAGE;
      const safeToShow = e instanceof BadRequest || busy;
      const message = safeToShow ? e.message : "Something went wrong. Try again.";
      const code = e instanceof BadRequest ? e.code : busy ? "busy" : "unknown";
      return Response.json(code ? { error: message, code } : { error: message }, { status });
    }
  };
}
