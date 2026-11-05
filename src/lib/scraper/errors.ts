export type ScrapeErrorCode =
  | "invalid_url"
  | "blocked_address"
  | "robots_disallowed"
  | "timeout"
  | "too_large"
  | "not_html"
  | "http_error"
  | "too_many_redirects"
  | "network";

export class ScrapeError extends Error {
  readonly code: ScrapeErrorCode;

  constructor(code: ScrapeErrorCode, message: string) {
    super(message);
    this.name = "ScrapeError";
    this.code = code;
  }
}
