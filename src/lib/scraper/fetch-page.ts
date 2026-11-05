import { ScrapeError } from "./errors.ts";
import { cleanLines, htmlToText } from "./extract.ts";
import { DISALLOW_ALL, isAllowedByRobots } from "./robots.ts";
import { assertPublicHost, checkUrl, systemLookup, type Lookup } from "./url-guard.ts";

export const BOT_NAME = "CekKerjaBot";
export const USER_AGENT = `${BOT_NAME}/0.1 (+https://github.com/E-Fredrik/CekKerja)`;
export const TIMEOUT_MS = 8_000;
export const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_ROBOTS_BYTES = 512 * 1024;
const MAX_REDIRECTS = 5;
const PAGE_TYPES = new Set(["", "text/html", "application/xhtml+xml", "text/plain"]);
const PAGE_ACCEPT = "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1";

export type Fetcher = (url: URL, init: RequestInit) => Promise<Response>;

export type FetchOptions = {
  fetch?: Fetcher;
  lookup?: Lookup;
  timeoutMs?: number;
  maxBytes?: number;
};

export type FetchedPage = {
  url: string;
  contentType: string;
  html: string;
  text: string;
};

type Session = {
  fetch: Fetcher;
  lookup: Lookup;
  signal: AbortSignal;
  robots: Map<string, string>;
};

function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function discard(response: Response): void {
  response.body?.cancel().catch(() => undefined);
}

async function readBytes(response: Response, maxBytes: number, truncate: boolean): Promise<Buffer> {
  const declared = Number(response.headers.get("content-length"));
  if (!truncate && declared > maxBytes) {
    discard(response);
    throw new ScrapeError("too_large", "The page is too large to read");
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.byteLength > maxBytes) {
      reader.cancel().catch(() => undefined);
      if (!truncate) throw new ScrapeError("too_large", "The page is too large to read");
      chunks.push(value.subarray(0, maxBytes - size));
      break;
    }
    chunks.push(value);
    size += value.byteLength;
  }
  return Buffer.concat(chunks);
}

function decode(bytes: Buffer, contentType: string): string {
  const charset = /charset=["']?([^;"'\s]+)/i.exec(contentType)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

async function follow(start: URL, session: Session, accept: string, checkRobots: boolean) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await untilAborted(assertPublicHost(url, session.lookup), session.signal);
    if (checkRobots) await assertRobotsAllow(url, session);
    const response = await session.fetch(url, {
      redirect: "manual",
      signal: session.signal,
      headers: { "user-agent": USER_AGENT, accept },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      discard(response);
      url = checkUrl(location, url);
      continue;
    }
    return { response, url };
  }
  throw new ScrapeError("too_many_redirects", "The page redirected too many times");
}

async function loadRobots(origin: string, session: Session): Promise<string> {
  const { response } = await follow(new URL("/robots.txt", origin), session, "text/plain", false);
  if (response.ok) return decode(await readBytes(response, MAX_ROBOTS_BYTES, true), "");
  discard(response);
  return response.status >= 400 && response.status < 500 ? "" : DISALLOW_ALL;
}

async function assertRobotsAllow(url: URL, session: Session): Promise<void> {
  let robotsTxt = session.robots.get(url.origin);
  if (robotsTxt === undefined) {
    robotsTxt = await loadRobots(url.origin, session);
    session.robots.set(url.origin, robotsTxt);
  }
  if (!isAllowedByRobots(robotsTxt, BOT_NAME, url.pathname + url.search)) {
    throw new ScrapeError("robots_disallowed", `${url.hostname} does not allow automated reading of this page`);
  }
}

export async function fetchPage(input: string, options: FetchOptions = {}): Promise<FetchedPage> {
  const signal = AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS);
  const session: Session = {
    fetch: options.fetch ?? ((url, init) => fetch(url, init)),
    lookup: options.lookup ?? systemLookup,
    signal,
    robots: new Map(),
  };
  try {
    const { response, url } = await follow(checkUrl(input), session, PAGE_ACCEPT, true);
    if (!response.ok) {
      discard(response);
      throw new ScrapeError("http_error", `The page answered with status ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    const mime = contentType.split(";")[0].trim().toLowerCase();
    if (!PAGE_TYPES.has(mime)) {
      discard(response);
      throw new ScrapeError("not_html", "The link is not a web page");
    }
    const body = decode(await readBytes(response, options.maxBytes ?? MAX_PAGE_BYTES, false), contentType);
    const plain = mime === "text/plain";
    return {
      url: url.href,
      contentType: mime || "text/html",
      html: plain ? "" : body,
      text: plain ? cleanLines(body).join("\n") : htmlToText(body),
    };
  } catch (error) {
    if (error instanceof ScrapeError) throw error;
    if (signal.aborted) throw new ScrapeError("timeout", "The page took too long to answer");
    throw new ScrapeError("network", "Could not reach the page");
  }
}
