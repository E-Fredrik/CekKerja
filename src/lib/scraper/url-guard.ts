import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { ScrapeError } from "./errors.ts";

const IPV4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const IPV6_BLOCKED: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
];

const blockedIpv4 = new BlockList();
for (const [network, prefix] of IPV4_BLOCKED) blockedIpv4.addSubnet(network, prefix, "ipv4");
const blockedIpv6 = new BlockList();
for (const [network, prefix] of IPV6_BLOCKED) blockedIpv6.addSubnet(network, prefix, "ipv6");

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan"];

export type Lookup = (hostname: string) => Promise<string[]>;

export const systemLookup: Lookup = async (hostname) =>
  (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);

const bareAddress = (address: string) => address.replace(/^\[|\]$/g, "").replace(/%.*$/, "");

const hostOf = (url: URL) => bareAddress(url.hostname.toLowerCase().replace(/\.$/, ""));

export function isBlockedAddress(address: string): boolean {
  const bare = bareAddress(address);
  const version = isIP(bare);
  if (version === 4) return blockedIpv4.check(bare, "ipv4");
  if (version === 6) return blockedIpv6.check(bare, "ipv6");
  return true;
}

function isBlockedHostname(host: string): boolean {
  return host === "localhost" || !host.includes(".") || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export function checkUrl(input: string, base?: URL): URL {
  let url: URL;
  try {
    url = new URL(input.trim(), base);
  } catch {
    throw new ScrapeError("invalid_url", "This is not a valid link");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("invalid_url", "Only http and https links are allowed");
  }
  if (url.username || url.password) {
    throw new ScrapeError("invalid_url", "Links with a username or password are not allowed");
  }
  const host = hostOf(url);
  const blocked = isIP(host) ? isBlockedAddress(host) : isBlockedHostname(host);
  if (blocked) throw new ScrapeError("blocked_address", `${host} is a private or local address`);
  url.hash = "";
  return url;
}

export async function assertPublicHost(url: URL, resolve: Lookup = systemLookup): Promise<void> {
  const host = hostOf(url);
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new ScrapeError("blocked_address", `${host} is a private or local address`);
    return;
  }
  let addresses: string[];
  try {
    addresses = await resolve(host);
  } catch {
    throw new ScrapeError("network", `Could not find ${host}`);
  }
  if (addresses.length === 0) throw new ScrapeError("network", `Could not find ${host}`);
  if (addresses.some(isBlockedAddress)) {
    throw new ScrapeError("blocked_address", `${host} points to a private or local address`);
  }
}
