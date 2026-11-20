import { ScrapeError } from "./errors.ts";

const BLOCKED_SITES = new Set([
  "glassdoor", "indeed", "facebook", "fb", "instagram", "twitter", "x", "tiktok",
  "youtube", "youtu", "reddit", "quora", "threads", "pinterest",
]);

const LINKEDIN_HOSTS = new Set(["linkedin.com", "www.linkedin.com", "id.linkedin.com"]);
const LINKEDIN_JOB_PATH = /^\/jobs\/view\/[A-Za-z0-9-]+\/?$/;

const siteLabels = (url: URL) => url.hostname.toLowerCase().split(".").slice(0, -1);

export const isLinkedInHost = (url: URL) => siteLabels(url).includes("linkedin");

export const isBlockedSite = (url: URL) => siteLabels(url).some((label) => BLOCKED_SITES.has(label));

export function isLinkedInJobUrl(url: URL): boolean {
  return url.protocol === "https:" && LINKEDIN_HOSTS.has(url.hostname.toLowerCase()) && LINKEDIN_JOB_PATH.test(url.pathname);
}

export function guardSite(url: URL): URL {
  if (isBlockedSite(url)) throw new ScrapeError("site_not_allowed", `${url.hostname} does not allow automated reading`);
  if (!isLinkedInHost(url)) return url;
  if (!isLinkedInJobUrl(url)) throw new ScrapeError("site_not_allowed", "Only public LinkedIn job ad pages can be read");
  return new URL(url.origin + url.pathname);
}
