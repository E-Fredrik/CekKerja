import { test } from "node:test";
import assert from "node:assert/strict";
import { ScrapeError, type ScrapeErrorCode } from "../src/lib/scraper/errors.ts";
import { assertPublicHost, checkUrl, isBlockedAddress } from "../src/lib/scraper/url-guard.ts";
import { extractQuestions, htmlToText } from "../src/lib/scraper/extract.ts";
import { isAllowedByRobots, matchesPattern } from "../src/lib/scraper/robots.ts";
import { USER_AGENT, fetchPage, type Fetcher } from "../src/lib/scraper/fetch-page.ts";

const hasCode = (code: ScrapeErrorCode) => (error: unknown) => error instanceof ScrapeError && error.code === code;

const publicLookup = async () => ["93.184.215.14"];

type Route = Response | (() => Response) | ((init: RequestInit) => Promise<Response>);

function fakeFetch(routes: Record<string, Route>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url: url.href, init });
    const route = routes[url.href];
    if (route === undefined) return new Response("not found", { status: 404 });
    return typeof route === "function" ? route(init) : route.clone();
  };
  return { fetcher, calls, pages: () => calls.map((call) => call.url).filter((url) => !url.endsWith("/robots.txt")) };
}

const html = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", ...headers } });

const redirect = (location: string, status = 301) => new Response(null, { status, headers: { location } });

test("checkUrl accepts public http and https links and drops the fragment", () => {
  assert.equal(checkUrl("https://karir.example.co.id/lowongan/123#apply").href, "https://karir.example.co.id/lowongan/123");
  assert.equal(checkUrl("  http://example.com  ").href, "http://example.com/");
  assert.equal(checkUrl("http://8.8.8.8/").hostname, "8.8.8.8");
  assert.equal(checkUrl("http://172.32.0.1/").hostname, "172.32.0.1");
});

test("checkUrl rejects other schemes, broken links and embedded credentials", () => {
  for (const input of ["ftp://example.com/", "file:///etc/passwd", "javascript:alert(1)", "data:text/html,hi", "not a link", ""]) {
    assert.throws(() => checkUrl(input), hasCode("invalid_url"), input);
  }
  assert.throws(() => checkUrl("https://user:pass@example.com/"), hasCode("invalid_url"));
});

test("checkUrl blocks localhost, local hostnames and single-label hosts", () => {
  for (const input of [
    "http://localhost:3000/",
    "http://LOCALHOST./admin",
    "http://app.localhost/",
    "http://printer.local/",
    "http://api.internal/",
    "http://nas.home.arpa/",
    "http://intranet/",
  ]) {
    assert.throws(() => checkUrl(input), hasCode("blocked_address"), input);
  }
});

test("checkUrl blocks private, loopback, link-local and disguised IP addresses", () => {
  for (const input of [
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0/",
    "http://100.64.0.1/",
    "http://224.0.0.1/",
    "http://2130706433/",
    "http://0x7f.1/",
    "http://017700000001/",
    "http://[::1]/",
    "http://[::]/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:192.168.0.1]/",
  ]) {
    assert.throws(() => checkUrl(input), hasCode("blocked_address"), input);
  }
});

test("checkUrl resolves a relative redirect against its base and re-checks it", () => {
  const base = new URL("https://example.com/jobs/1");
  assert.equal(checkUrl("/jobs/2", base).href, "https://example.com/jobs/2");
  assert.throws(() => checkUrl("http://127.0.0.1/", base), hasCode("blocked_address"));
});

test("isBlockedAddress separates public from private addresses and fails closed on garbage", () => {
  assert.equal(isBlockedAddress("8.8.8.8"), false);
  assert.equal(isBlockedAddress("2606:4700:4700::1111"), false);
  assert.equal(isBlockedAddress("10.0.0.1"), true);
  assert.equal(isBlockedAddress("fe80::1%eth0"), true);
  assert.equal(isBlockedAddress("not-an-ip"), true);
});

test("assertPublicHost blocks a public name that resolves to a private address", async () => {
  const url = new URL("https://rebind.example.com/");
  await assert.doesNotReject(assertPublicHost(url, publicLookup));
  await assert.rejects(assertPublicHost(url, async () => ["10.0.0.7"]), hasCode("blocked_address"));
  await assert.rejects(assertPublicHost(url, async () => ["93.184.215.14", "::1"]), hasCode("blocked_address"));
  await assert.rejects(assertPublicHost(url, async () => []), hasCode("network"));
  await assert.rejects(assertPublicHost(url, async () => Promise.reject(new Error("ENOTFOUND"))), hasCode("network"));
});

test("htmlToText keeps headings, paragraphs and list items one per line and drops page chrome", () => {
  const text = htmlToText(`
    <html><head><title>Ignored</title><style>p{color:red}</style></head>
    <body>
      <nav><a href="/">Home</a> <a href="/jobs">Jobs</a></nav>
      <h1>Staff   Admin&nbsp;Gudang</h1>
      <p>PT Contoh Maju is hiring.<br>Location: Surabaya</p>
      <ul><li>Usia maksimal 25 tahun</li><li>Berpenampilan <b>menarik</b></li></ul>
      <script>alert("x")</script>
      <div hidden>Secret</div>
      <footer>© 2026 PT Contoh</footer>
    </body></html>`);
  assert.equal(
    text,
    ["Staff Admin Gudang", "PT Contoh Maju is hiring.", "Location: Surabaya", "Usia maksimal 25 tahun", "Berpenampilan menarik"].join("\n"),
  );
});

test("htmlToText removes duplicate lines and keeps a parent list item apart from its nested items", () => {
  const text = htmlToText(`
    <p>Apply now</p><p>Apply now</p>
    <ul><li>Requirements<ul><li>S1 any major</li><li>Fresh graduates welcome</li></ul></li></ul>
    <table><tr><td>Salary</td><td>Rp5.000.000</td></tr></table>`);
  assert.deepEqual(text.split("\n"), ["Apply now", "Requirements", "S1 any major", "Fresh graduates welcome", "Salary", "Rp5.000.000"]);
});

test("htmlToText handles deeply nested pages without overflowing the stack", () => {
  const depth = 50_000;
  const text = htmlToText(`${"<div>".repeat(depth)}deep${"</div>".repeat(depth)}`);
  assert.equal(text, "deep");
});

test("extractQuestions finds numbered, bulleted and inline questions in both languages", () => {
  const questions = extractQuestions(
    [
      "Common interview questions",
      "1. Tell me about yourself?",
      "2) Why do you want to work at PT Contoh?",
      "Q3: What is your biggest weakness?",
      "- Apa kelebihan dan kekurangan Anda?",
      "• Mengapa Anda melamar posisi ini？",
      "We like honesty. How do you handle a deadline you cannot meet? Answer with an example.",
      "Ready?",
      "Why do you want to work at PT Contoh?",
      "WHY DO YOU WANT TO WORK AT PT CONTOH?",
    ].join("\n"),
  );
  assert.deepEqual(questions, [
    "Tell me about yourself?",
    "Why do you want to work at PT Contoh?",
    "What is your biggest weakness?",
    "Apa kelebihan dan kekurangan Anda?",
    "Mengapa Anda melamar posisi ini?",
    "How do you handle a deadline you cannot meet?",
  ]);
});

test("extractQuestions ignores text without questions and overly long sentences", () => {
  assert.deepEqual(extractQuestions("No questions here.\nJust statements."), []);
  assert.deepEqual(extractQuestions(`${"word ".repeat(80)}?`), []);
});

test("robots: no file or an empty disallow allows everything", () => {
  assert.equal(isAllowedByRobots("", "CekKerjaBot", "/jobs"), true);
  assert.equal(isAllowedByRobots("User-agent: *\nDisallow:", "CekKerjaBot", "/jobs"), true);
});

test("robots: the wildcard group applies when no group names the bot", () => {
  const robots = "User-agent: *\nDisallow: /private\n\nUser-agent: OtherBot\nDisallow: /";
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/jobs/1"), true);
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/private/x"), false);
});

test("robots: a group naming the bot replaces the wildcard group, case-insensitively", () => {
  const robots = "User-agent: *\nDisallow: /\n\nUser-agent: cekkerjabot\nUser-agent: OtherBot\nDisallow: /admin";
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/jobs"), true);
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/admin/users"), false);
});

test("robots: the longest matching rule wins and allow wins a tie", () => {
  const robots = "User-agent: *\nDisallow: /jobs\nAllow: /jobs/public\nDisallow: /a\nAllow: /a";
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/jobs/secret"), false);
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/jobs/public/1"), true);
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/a"), true);
});

test("robots: wildcards, end anchors, query strings and comments", () => {
  const robots = "# comment\nUser-agent: * # all bots\nDisallow: /*.pdf$\nDisallow: /search?*q=\nDisallow: /tmp/*/cache";
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/files/cv.pdf"), false);
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/files/cv.pdf?x=1"), true);
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/search?page=2&q=admin"), false);
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/search"), true);
  assert.equal(isAllowedByRobots(robots, "CekKerjaBot", "/tmp/a/b/cache/x"), false);
  assert.equal(isAllowedByRobots("User-agent: *\nDisallow: /", "CekKerjaBot", "/robots.txt"), true);
});

test("robots: hostile wildcard patterns finish quickly", () => {
  const started = performance.now();
  assert.equal(matchesPattern(`/${"*a".repeat(200)}b$`, `/${"a".repeat(5000)}`), false);
  assert.ok(performance.now() - started < 1000);
});

test("fetchPage reads robots.txt first, identifies itself and returns the page text", async () => {
  const { fetcher, calls } = fakeFetch({
    "https://jobs.example.com/robots.txt": new Response("User-agent: *\nDisallow: /admin", { headers: { "content-type": "text/plain" } }),
    "https://jobs.example.com/lowongan/1": html("<h1>Admin Gudang</h1><p>Gaji Rp5.000.000</p>"),
  });
  const page = await fetchPage("https://jobs.example.com/lowongan/1", { fetch: fetcher, lookup: publicLookup });
  assert.deepEqual(page, {
    url: "https://jobs.example.com/lowongan/1",
    contentType: "text/html",
    html: "<h1>Admin Gudang</h1><p>Gaji Rp5.000.000</p>",
    text: "Admin Gudang\nGaji Rp5.000.000",
  });
  assert.deepEqual(calls.map((call) => call.url), ["https://jobs.example.com/robots.txt", "https://jobs.example.com/lowongan/1"]);
  for (const call of calls) {
    assert.equal((call.init.headers as Record<string, string>)["user-agent"], USER_AGENT);
    assert.equal(call.init.redirect, "manual");
  }
});

test("fetchPage stops when robots.txt disallows the page", async () => {
  const { fetcher, pages } = fakeFetch({
    "https://jobs.example.com/robots.txt": new Response("User-agent: *\nDisallow: /"),
    "https://jobs.example.com/lowongan/1": html("<p>hidden</p>"),
  });
  await assert.rejects(fetchPage("https://jobs.example.com/lowongan/1", { fetch: fetcher, lookup: publicLookup }), hasCode("robots_disallowed"));
  assert.deepEqual(pages(), []);
});

test("fetchPage treats a missing robots.txt as allowed and a failing one as disallowed", async () => {
  const missing = fakeFetch({ "https://a.example.com/": html("<p>ok</p>") });
  assert.equal((await fetchPage("https://a.example.com/", { fetch: missing.fetcher, lookup: publicLookup })).text, "ok");
  const failing = fakeFetch({
    "https://b.example.com/robots.txt": new Response("down", { status: 503 }),
    "https://b.example.com/": html("<p>ok</p>"),
  });
  await assert.rejects(fetchPage("https://b.example.com/", { fetch: failing.fetcher, lookup: publicLookup }), hasCode("robots_disallowed"));
});

test("fetchPage follows redirects and checks robots.txt again on the new site", async () => {
  const { fetcher, calls } = fakeFetch({
    "https://short.example/x": redirect("https://jobs.example.com/lowongan/9", 302),
    "https://jobs.example.com/robots.txt": new Response("User-agent: *\nDisallow: /lowongan"),
  });
  await assert.rejects(fetchPage("https://short.example/x", { fetch: fetcher, lookup: publicLookup }), hasCode("robots_disallowed"));
  assert.ok(calls.some((call) => call.url === "https://jobs.example.com/robots.txt"));
});

test("fetchPage re-checks every redirect against private addresses", async () => {
  const direct = fakeFetch({ "https://jobs.example.com/go": redirect("http://169.254.169.254/latest/meta-data/") });
  await assert.rejects(fetchPage("https://jobs.example.com/go", { fetch: direct.fetcher, lookup: publicLookup }), hasCode("blocked_address"));
  assert.deepEqual(direct.pages(), ["https://jobs.example.com/go"]);

  const rebind = fakeFetch({ "https://jobs.example.com/go": redirect("https://evil.example.net/") });
  const lookup = async (host: string) => (host === "evil.example.net" ? ["192.168.0.10"] : ["93.184.215.14"]);
  await assert.rejects(fetchPage("https://jobs.example.com/go", { fetch: rebind.fetcher, lookup }), hasCode("blocked_address"));
  assert.deepEqual(rebind.pages(), ["https://jobs.example.com/go"]);
});

test("fetchPage gives up after too many redirects", async () => {
  const { fetcher } = fakeFetch({
    "https://loop.example.com/a": redirect("/b"),
    "https://loop.example.com/b": redirect("/a"),
  });
  await assert.rejects(fetchPage("https://loop.example.com/a", { fetch: fetcher, lookup: publicLookup }), hasCode("too_many_redirects"));
});

test("fetchPage rejects a blocked or broken link before making any request", async () => {
  const { fetcher, calls } = fakeFetch({});
  await assert.rejects(fetchPage("http://localhost:3000/", { fetch: fetcher, lookup: publicLookup }), hasCode("blocked_address"));
  await assert.rejects(fetchPage("javascript:alert(1)", { fetch: fetcher, lookup: publicLookup }), hasCode("invalid_url"));
  assert.equal(calls.length, 0);
});

test("fetchPage times out a page that never answers", async () => {
  const { fetcher } = fakeFetch({
    "https://slow.example.com/": (init: RequestInit) =>
      new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
  });
  const started = performance.now();
  await assert.rejects(fetchPage("https://slow.example.com/", { fetch: fetcher, lookup: publicLookup, timeoutMs: 50 }), hasCode("timeout"));
  assert.ok(performance.now() - started < 2000);
});

test("fetchPage times out a DNS lookup that hangs", async () => {
  const { fetcher } = fakeFetch({});
  const lookup = () => new Promise<string[]>(() => undefined);
  await assert.rejects(fetchPage("https://hang.example.com/", { fetch: fetcher, lookup, timeoutMs: 50 }), hasCode("timeout"));
});

test("fetchPage refuses pages larger than the size cap", async () => {
  const big = "x".repeat(2048);
  const declared = fakeFetch({ "https://big.example.com/": html(big, { "content-length": "2048" }) });
  await assert.rejects(
    fetchPage("https://big.example.com/", { fetch: declared.fetcher, lookup: publicLookup, maxBytes: 1024 }),
    hasCode("too_large"),
  );
  const streamed = fakeFetch({ "https://big.example.com/": () => html(big) });
  await assert.rejects(
    fetchPage("https://big.example.com/", { fetch: streamed.fetcher, lookup: publicLookup, maxBytes: 1024 }),
    hasCode("too_large"),
  );
});

test("fetchPage refuses files that are not web pages and pages with an error status", async () => {
  const { fetcher } = fakeFetch({
    "https://files.example.com/cv.pdf": new Response("%PDF-1.7", { headers: { "content-type": "application/pdf" } }),
    "https://files.example.com/gone": new Response("gone", { status: 410, headers: { "content-type": "text/html" } }),
  });
  await assert.rejects(fetchPage("https://files.example.com/cv.pdf", { fetch: fetcher, lookup: publicLookup }), hasCode("not_html"));
  await assert.rejects(fetchPage("https://files.example.com/gone", { fetch: fetcher, lookup: publicLookup }), hasCode("http_error"));
});

test("fetchPage decodes the declared charset and reads plain text pages", async () => {
  const latin1 = new Uint8Array([0x43, 0x61, 0x66, 0xe9]);
  const { fetcher } = fakeFetch({
    "https://old.example.com/": () => new Response(latin1, { headers: { "content-type": "text/html; charset=iso-8859-1" } }),
    "https://old.example.com/notes.txt": new Response("Line one\n\n  Line   two \nLine one", { headers: { "content-type": "text/plain" } }),
  });
  assert.equal((await fetchPage("https://old.example.com/", { fetch: fetcher, lookup: publicLookup })).text, "Café");
  const notes = await fetchPage("https://old.example.com/notes.txt", { fetch: fetcher, lookup: publicLookup });
  assert.equal(notes.text, "Line one\nLine two");
  assert.equal(notes.html, "");
});

test("fetchPage reports an unreachable site as a network error", async () => {
  const fetcher: Fetcher = async () => Promise.reject(new TypeError("fetch failed"));
  await assert.rejects(fetchPage("https://down.example.com/", { fetch: fetcher, lookup: publicLookup }), hasCode("network"));
});
