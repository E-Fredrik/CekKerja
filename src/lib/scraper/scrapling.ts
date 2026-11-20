import { execFile } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import { ScrapeError } from "./errors.ts";
import { cleanLines, htmlToText } from "./extract.ts";
import { assertReadable, fetchPage, PAGE_TYPES, TIMEOUT_MS, type FetchedPage, type FetchOptions } from "./fetch-page.ts";
import { checkUrl } from "./url-guard.ts";

export const SCRIPT_PATH = path.join(process.cwd(), "scripts", "scrapling_fetch.py");
export const PYTHON_STARTUP_MS = 4_000;
export const MAX_OUTPUT_BYTES = 6 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export type Runner = (python: string, args: string[], options: { timeout: number; maxBuffer: number }) => Promise<string>;

export type ScraplingOptions = FetchOptions & { python?: string; run?: Runner };

export class ScraplingUnavailable extends Error {}

const ScraplingOutput = z.union([
  z.object({ error: z.string() }),
  z.object({
    url: z.string(),
    status: z.number().int(),
    location: z.string().default(""),
    contentType: z.string().default(""),
    title: z.string().default(""),
    html: z.string(),
  }),
]);

export type ScraplingOutput = z.infer<typeof ScraplingOutput>;

export const runPython: Runner = (python, args, options) =>
  new Promise((resolve, reject) => {
    execFile(python, args, { ...options, windowsHide: true, encoding: "utf8" }, (error, stdout) => {
      if (!error) resolve(stdout);
      else if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") reject(new ScrapeError("too_large", "The page is too large to read"));
      else if (error.killed) reject(new ScrapeError("timeout", "The page took too long to answer"));
      else reject(new ScraplingUnavailable(error.message));
    });
  });

export function parseScraplingOutput(stdout: string): ScraplingOutput {
  try {
    return ScraplingOutput.parse(JSON.parse(stdout));
  } catch {
    throw new ScraplingUnavailable("The Scrapling script gave an unreadable answer");
  }
}

function toPage(url: URL, out: Extract<ScraplingOutput, { html: string }>): FetchedPage {
  if (out.status < 200 || out.status >= 300) throw new ScrapeError("http_error", `The page answered with status ${out.status}`);
  const mime = out.contentType.split(";")[0].trim().toLowerCase();
  if (!PAGE_TYPES.has(mime)) throw new ScrapeError("not_html", "The link is not a web page");
  const plain = mime === "text/plain";
  return {
    url: url.href,
    contentType: mime || "text/html",
    html: plain ? "" : out.html,
    text: plain ? cleanLines(out.html).join("\n") : htmlToText(out.html),
  };
}

export async function readWithScrapling(input: string, options: ScraplingOptions = {}): Promise<FetchedPage> {
  const python = options.python ?? process.env.SCRAPLING_PYTHON;
  if (!python) throw new ScraplingUnavailable("SCRAPLING_PYTHON is not set");
  const run = options.run ?? runPython;
  const timeout = (options.timeoutMs ?? TIMEOUT_MS) + PYTHON_STARTUP_MS;
  let url = checkUrl(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    url = await assertReadable(url, options);
    const out = parseScraplingOutput(await run(python, [SCRIPT_PATH, url.href], { timeout, maxBuffer: MAX_OUTPUT_BYTES }));
    if ("error" in out) throw new ScraplingUnavailable(out.error);
    if (out.status >= 300 && out.status < 400 && out.location) {
      url = checkUrl(out.location, url);
      continue;
    }
    return toPage(url, out);
  }
  throw new ScrapeError("too_many_redirects", "The page redirected too many times");
}

export async function readPage(input: string, options: ScraplingOptions = {}): Promise<FetchedPage> {
  try {
    return await readWithScrapling(input, options);
  } catch (error) {
    if (error instanceof ScrapeError) throw error;
    return fetchPage(input, options);
  }
}
