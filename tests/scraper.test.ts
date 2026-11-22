import { test } from "node:test";
import assert from "node:assert/strict";
import { ScrapeError, type ScrapeErrorCode } from "../src/lib/scraper/errors.ts";
import { assertPublicHost, checkUrl, isBlockedAddress } from "../src/lib/scraper/url-guard.ts";
import { extractQuestions, htmlToText } from "../src/lib/scraper/extract.ts";
import { isAllowedByRobots, matchesPattern } from "../src/lib/scraper/robots.ts";
import { TIMEOUT_MS, USER_AGENT, fetchPage, type Fetcher } from "../src/lib/scraper/fetch-page.ts";
import { PYTHON_STARTUP_MS, ScraplingUnavailable, parseScraplingOutput, readPage, readWithScrapling, type Runner } from "../src/lib/scraper/scrapling.ts";
import { guardSite, isLinkedInJobUrl } from "../src/lib/scraper/site-rules.ts";
import { MAX_PUBLIC_PAGES, collectInterviewSources, companyLinks, isForbiddenSite } from "../src/lib/scraper/interview-sources.ts";
import { MAX_AD_CHARS, analyzeAd, keepGroundedFlags, parseAdRequest, readAd } from "../src/app/api/check-ad/analyze-ad.ts";
import { BadRequest } from "../src/lib/http.ts";
import { strings } from "../src/lib/i18n.ts";
import { GENERATED, MAX_PORTFOLIO_CHARS, MAX_PROFILE_CHARS, MAX_QUESTIONS, interviewParts, interviewPrompt, parseInterviewForm, parseInterviewRequest, prepareInterview } from "../src/app/api/interview/prepare-interview.ts";
import type { generateJson } from "../src/lib/ai/gemini.ts";

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

const AD = "Dicari staf admin. Wanita, usia maksimal 25 tahun, berpenampilan menarik. Ijazah asli ditahan selama kontrak. Menguasai Excel.";

const flag = (quote: string, ruleId: string) => ({ quote, verdict: "red" as const, ruleId, explanation: "x", questionToAsk: "y" });

const fakeResult = (flags: ReturnType<typeof flag>[]) => ({ summary: "s", role: "Admin", company: "PT X", flags, inclusiveRewrite: "r" });

test("parseAdRequest needs ad text or a link and defaults lang and mode", () => {
  assert.deepEqual(parseAdRequest({ text: AD }), { text: AD, lang: "id", mode: "fast" });
  assert.equal(parseAdRequest({ url: "https://jobs.example.com/1", lang: "en", mode: "weird" }).mode, "fast");
  assert.throws(() => parseAdRequest({}), BadRequest);
  assert.throws(() => parseAdRequest({ text: "   " }), BadRequest);
  assert.throws(() => parseAdRequest(null), BadRequest);
  assert.throws(() => parseAdRequest({ text: "a".repeat(MAX_AD_CHARS + 1) }), BadRequest);
});

test("readAd prefers pasted text, fetches a link otherwise, and rejects short ads", async () => {
  const fetch = async () => ({ url: "https://jobs.example.com/1", text: AD });
  assert.deepEqual(await readAd({ text: AD, url: "https://x.example.com", lang: "id", mode: "fast" }, async () => assert.fail()), { text: AD, sourceUrl: null });
  assert.deepEqual(await readAd({ url: "https://jobs.example.com/1", lang: "id", mode: "fast" }, fetch), { text: AD, sourceUrl: "https://jobs.example.com/1" });
  await assert.rejects(readAd({ text: "short", lang: "id", mode: "fast" }), BadRequest);
});

test("readAd turns a blocked or unreadable link into a bad request", async () => {
  const blocked = async () => Promise.reject(new ScrapeError("blocked_address", "private address"));
  await assert.rejects(readAd({ url: "http://127.0.0.1/", lang: "id", mode: "fast" }, blocked), (e) => e instanceof BadRequest && e.message === `${strings.id.lowongan.errors.readLink} ${strings.id.lowongan.errors.scrape.blocked_address}`);
  const broken = async () => Promise.reject(new Error("boom"));
  await assert.rejects(readAd({ url: "https://jobs.example.com/", lang: "id", mode: "fast" }, broken), (e) => !(e instanceof BadRequest));
});

test("keepGroundedFlags drops quotes not in the ad and attaches the rule source", () => {
  const kept = keepGroundedFlags(
    [flag("usia  maksimal 25 TAHUN", "age-limit"), flag("must be under 20", "age-limit"), flag("Ijazah asli ditahan", "document-holding"), flag("Wanita", "made-up"), flag("Menguasai Excel", "pkwt-probation")],
    AD,
  );
  assert.deepEqual(
    kept.map((f) => [f.ruleId, f.source]),
    [
      ["age-limit", "UU 27/2026 Pasal 6"],
      ["document-holding", "UU 27/2026 Pasal 78 ayat (1)"],
      ["other", null],
      ["other", null],
    ],
  );
});

test("analyzeAd sends the ad as tagged data with the ad rules and returns grounded flags", async () => {
  let seen: { system: string; text: string; mode: string } | undefined;
  const generate = (async (_schema: unknown, system: string, parts: { text: string }[], mode: string) => {
    seen = { system, text: parts[0].text, mode };
    return fakeResult([flag("Wanita", "equal-opportunity"), flag("invented", "age-limit")]);
  }) as unknown as typeof generateJson;
  const out = await analyzeAd({ text: AD, lang: "en", mode: "smart" }, { generate });
  assert.equal(seen?.mode, "smart");
  assert.match(seen!.text, /^<job_ad>\n[\s\S]+\n<\/job_ad>$/);
  assert.match(seen!.system, /age-limit/);
  assert.doesNotMatch(seen!.system, /pkwt-probation/);
  assert.match(seen!.system, /in English/);
  assert.deepEqual(out.flags.map((f) => f.quote), ["Wanita"]);
  assert.equal(out.adText, AD);
  assert.equal(out.sourceUrl, null);
});

test("keepGroundedFlags drops minimum wage flags because only code may judge wages", () => {
  const ad = `${AD} Gaji Rp2.000.000 per bulan.`;
  const kept = keepGroundedFlags([flag("Gaji Rp2.000.000 per bulan", "minimum-wage"), flag("Wanita", "equal-opportunity")], ad);
  assert.deepEqual(kept.map((f) => f.ruleId), ["equal-opportunity"]);
});

const page = (url: string, text: string, html = "") => ({ url, contentType: "text/html", html, text });

test("isForbiddenSite blocks sites whose terms forbid scraping and allows others", () => {
  for (const url of ["https://www.glassdoor.co.id/x", "https://id.linkedin.com/jobs", "https://id.indeed.com/", "https://x.com/a", "https://m.facebook.com/", "https://www.reddit.com/r/x", "not a url"]) {
    assert.ok(isForbiddenSite(url), url);
  }
  for (const url of ["https://glints.com/id/lowongan/tips", "https://www.kalibrr.com/blog", "https://box.example.co.id/"]) {
    assert.ok(!isForbiddenSite(url), url);
  }
});

test("companyLinks keeps same-site about, career and FAQ links only", () => {
  const html = `<a href="/tentang-kami">Tentang</a><a href="https://www.pt.example.com/karir#top">Karir</a><a href="/produk">Produk</a>
    <a href="https://other.example.com/about">About</a><a href="mailto:hr@pt.example.com">Mail</a><a href="/faq">FAQ</a><a href="/careers/interview">Interview</a>`;
  assert.deepEqual(companyLinks(page("https://pt.example.com/", "", html)), [
    "https://pt.example.com/tentang-kami",
    "https://www.pt.example.com/karir",
    "https://pt.example.com/faq",
  ]);
});

test("collectInterviewSources reads the job ad, company pages and suggested pages with their sources", async () => {
  const pages: Record<string, ReturnType<typeof page>> = {
    "https://jobs.example.com/1": page("https://jobs.example.com/1", "Staf admin.\nApa pengalaman kamu dengan Excel?"),
    "https://pt.example.com/": page("https://pt.example.com/", "PT Example membuat kopi.", '<a href="/karir">Karir</a>'),
    "https://pt.example.com/karir": page("https://pt.example.com/karir", "Kenapa kamu ingin bergabung dengan kami?"),
    "https://blog.example.com/admin": page("https://blog.example.com/admin", "1. Ceritakan tentang diri kamu?\n2. Apa pengalaman kamu dengan Excel?"),
  };
  const fetched: string[] = [];
  const fetch = async (url: string) => {
    fetched.push(url);
    if (!pages[url]) throw new ScrapeError("http_error", "The page answered with status 404");
    return pages[url];
  };
  const suggest = async () => ["https://blog.example.com/admin", "https://www.glassdoor.com/Interview/x", "https://gone.example.com/", "https://pt.example.com/karir"];
  const out = await collectInterviewSources({ role: "Admin", company: "PT Example", jobUrl: "https://jobs.example.com/1", companyUrl: "https://pt.example.com/" }, { fetch, suggest });

  assert.deepEqual(out.questions, [
    { question: "Apa pengalaman kamu dengan Excel?", source: "https://jobs.example.com/1" },
    { question: "Kenapa kamu ingin bergabung dengan kami?", source: "https://pt.example.com/karir" },
    { question: "Ceritakan tentang diri kamu?", source: "https://blog.example.com/admin" },
  ]);
  assert.match(out.jobText, /Staf admin/);
  assert.match(out.companyText, /membuat kopi[\s\S]*bergabung/);
  assert.ok(!fetched.some((u) => u.includes("glassdoor")));
  assert.equal(fetched.filter((u) => u === "https://pt.example.com/karir").length, 1);
  assert.deepEqual(out.failed.map((f) => f.url).sort(), ["https://gone.example.com/", "https://www.glassdoor.com/Interview/x"]);
});

test("collectInterviewSources still returns results when the suggester fails and caps public pages", async () => {
  const fetched: string[] = [];
  const fetch = async (url: string) => (fetched.push(url), page(url, "Apa kelebihan kamu sebagai admin?"));
  const failing = await collectInterviewSources({ role: "Admin", jobUrl: "https://jobs.example.com/1" }, { fetch, suggest: async () => Promise.reject(new Error("busy")) });
  assert.equal(failing.questions.length, 1);
  assert.deepEqual(failing.failed, [{ url: "search", reason: "busy" }]);

  fetched.length = 0;
  const many = Array.from({ length: 9 }, (_, i) => `https://blog${i}.example.com/`);
  await collectInterviewSources({ role: "Admin" }, { fetch, suggest: async () => many });
  assert.equal(fetched.length, MAX_PUBLIC_PAGES);
});

const sourcesFixture = {
  jobText: "Staf admin, menguasai Excel.",
  companyText: "PT Example membuat kopi.",
  questions: [
    { question: "Apa pengalaman kamu dengan Excel?", source: "https://jobs.example.com/1" },
    { question: "Ceritakan tentang diri kamu?", source: "https://blog.example.com/admin" },
  ],
  failed: [
    { url: "search", reason: "GEMINI_API_KEY is not set." },
    { url: "https://gone.example.com/", reason: "The page answered with status 404" },
  ],
};

const iq = (question: string, source: string) => ({ question, category: "role" as const, whyTailored: "w", source, answerTips: "t" });

test("parseInterviewRequest needs a role and defaults lang and mode", () => {
  assert.deepEqual(parseInterviewRequest({ role: " Admin " }), { role: "Admin", lang: "id", mode: "fast" });
  assert.equal(parseInterviewRequest({ role: "Admin", lang: "en", mode: "smart" }).mode, "smart");
  assert.throws(() => parseInterviewRequest({}), BadRequest);
  assert.throws(() => parseInterviewRequest({ role: "A" }), BadRequest);
  assert.throws(() => parseInterviewRequest({ role: "Admin", profile: "x".repeat(MAX_PROFILE_CHARS + 1) }), BadRequest);
});

test("interviewParts tags every input and lists scraped questions with their source", () => {
  const parts = interviewParts(parseInterviewRequest({ role: "Admin", company: "PT Example", profile: "Lulusan D3" }), sourcesFixture);
  assert.match(parts, /<role>\nAdmin\n<\/role>/);
  assert.match(parts, /<job_ad>\nStaf admin, menguasai Excel.\n<\/job_ad>/);
  assert.match(parts, /<profile>\nLulusan D3\n<\/profile>/);
  assert.match(parts, /1\. Apa pengalaman kamu dengan Excel\? \| https:\/\/jobs\.example\.com\/1/);
  assert.match(interviewParts(parseInterviewRequest({ role: "Admin", jobText: "Pasted ad text" }), sourcesFixture), /<job_ad>\nPasted ad text\n/);
  assert.match(interviewParts(parseInterviewRequest({ role: "Admin" }), { ...sourcesFixture, questions: [] }), /<scraped_questions>\n\(none\)\n/);
});

test("interviewPrompt asks for contract questions and treats tagged input as untrusted", () => {
  const prompt = interviewPrompt("en");
  assert.match(prompt, /untrusted/);
  assert.match(prompt, /PKWT/);
  assert.match(prompt, /probation/);
  assert.match(prompt, /in English/);
  assert.match(interviewPrompt("id"), /in Bahasa Indonesia/);
});

test("prepareInterview keeps real sources, marks unknown ones generated, caps questions and hides the search error", async () => {
  let seen: { input: unknown; text: string; mode: string } | undefined;
  const collect = async (input: unknown) => ((seen = { input, text: "", mode: "" }), sourcesFixture);
  const questions = [
    iq("Apa pengalaman kamu dengan Excel?", "https://jobs.example.com/1"),
    iq("Pertanyaan karangan?", "https://made-up.example.com/"),
    ...Array.from({ length: 20 }, (_, i) => iq(`Pertanyaan ${i}?`, GENERATED)),
  ];
  const generate = (async (_schema: unknown, _system: string, parts: { text: string }[], mode: string) => {
    seen = { ...seen!, text: parts[0].text, mode };
    return { role: "Admin", company: "PT Example", candidateSnapshot: "s", questions, questionsToAskThem: ["Apakah PKWT?"] };
  }) as unknown as typeof generateJson;
  const out = await prepareInterview(parseInterviewRequest({ role: "Admin", company: "PT Example", jobUrl: "https://jobs.example.com/1", mode: "smart" }), { collect, generate });

  assert.deepEqual(seen?.input, { role: "Admin", company: "PT Example", jobUrl: "https://jobs.example.com/1", companyUrl: undefined });
  assert.equal(seen?.mode, "smart");
  assert.match(seen!.text, /<scraped_questions>/);
  assert.equal(out.questions.length, MAX_QUESTIONS);
  assert.equal(out.questions[0].source, "https://jobs.example.com/1");
  assert.equal(out.questions[1].source, GENERATED);
  assert.deepEqual(out.unreadSources, [{ url: "https://gone.example.com/", reason: "The page answered with status 404" }]);
});

test("job ad and interview request errors come back in the language of the request", () => {
  const messageOf = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      return e instanceof BadRequest ? e.message : "not a bad request";
    }
    return "no error";
  };
  assert.equal(messageOf(() => parseAdRequest({ lang: "en" })), strings.en.lowongan.errors.needAdOrLink);
  assert.equal(messageOf(() => parseAdRequest({})), strings.id.lowongan.errors.needAdOrLink);
  assert.equal(messageOf(() => parseAdRequest({ text: "a".repeat(MAX_AD_CHARS + 1), lang: "en" })), strings.en.lowongan.errors.adTooLong);
  assert.equal(messageOf(() => parseAdRequest({ text: 5 })), strings.id.lowongan.errors.invalid);
  assert.equal(messageOf(() => parseAdRequest(null)), strings.id.lowongan.errors.invalid);
  assert.equal(messageOf(() => parseInterviewRequest({ lang: "en" })), strings.en.interview.errors.roleMissing);
  assert.equal(messageOf(() => parseInterviewRequest({ role: "A" })), strings.id.interview.errors.roleMissing);
  assert.equal(messageOf(() => parseInterviewRequest({ role: "Admin", profile: "x".repeat(MAX_PROFILE_CHARS + 1), lang: "en" })), strings.en.interview.errors.tooLong);
});

test("readAd explains an unreadable link in the language of the request", async () => {
  const disallowed = async () => Promise.reject(new ScrapeError("robots_disallowed", "no"));
  const errors = strings.en.lowongan.errors;
  await assert.rejects(readAd({ url: "https://jobs.example.com/", lang: "en", mode: "fast" }, disallowed), { message: `${errors.readLink} ${errors.scrape.robots_disallowed}` });
  await assert.rejects(readAd({ text: "short", lang: "en", mode: "fast" }), { message: errors.tooShort });
});

const scraplingPage = (url: string, body: string, extra: Partial<{ status: number; location: string; contentType: string }> = {}) =>
  JSON.stringify({ url, status: 200, location: "", contentType: "text/html; charset=utf-8", title: "", html: body, ...extra });

function fakeRunner(answers: Record<string, string>) {
  const calls: { python: string; args: string[]; timeout: number }[] = [];
  const run: Runner = async (python, args, options) => {
    calls.push({ python, args, timeout: options.timeout });
    const answer = answers[args[1]];
    if (answer === undefined) throw new Error(`unexpected url ${args[1]}`);
    return answer;
  };
  return { run, calls };
}

test("site rules allow only public LinkedIn job ad pages and block Glassdoor, Indeed and social media", () => {
  for (const url of ["https://www.linkedin.com/jobs/view/4012345678", "https://id.linkedin.com/jobs/view/staf-admin-at-pt-contoh-4012345678/", "https://linkedin.com/jobs/view/123"]) {
    assert.ok(isLinkedInJobUrl(new URL(url)), url);
  }
  for (const url of [
    "https://www.linkedin.com/in/rina",
    "https://www.linkedin.com/jobs/search/?keywords=admin",
    "https://www.linkedin.com/jobs/view/123/apply",
    "https://www.linkedin.com/login",
    "https://www.linkedin.com/company/contoh/people",
    "http://www.linkedin.com/jobs/view/123",
    "https://linkedin.evil.example/jobs/view/123",
  ]) {
    assert.equal(isLinkedInJobUrl(new URL(url)), false, url);
    assert.throws(() => guardSite(new URL(url)), hasCode("site_not_allowed"), url);
  }
  assert.equal(guardSite(new URL("https://www.linkedin.com/jobs/view/123/?trackingId=abc&refId=x#top")).href, "https://www.linkedin.com/jobs/view/123/");
  for (const url of ["https://www.glassdoor.co.id/x", "https://id.indeed.com/viewjob", "https://m.facebook.com/jobs", "https://x.com/a"]) {
    assert.throws(() => guardSite(new URL(url)), hasCode("site_not_allowed"), url);
  }
  assert.equal(guardSite(new URL("https://jobs.example.com/1")).href, "https://jobs.example.com/1");
});

test("fetchPage refuses blocked sites and reads a LinkedIn job page without robots.txt", async () => {
  const { fetcher, calls } = fakeFetch({ "https://www.linkedin.com/jobs/view/123": html("<h1>Staf Admin</h1>") });
  await assert.rejects(fetchPage("https://www.linkedin.com/in/rina", { fetch: fetcher, lookup: publicLookup }), hasCode("site_not_allowed"));
  await assert.rejects(fetchPage("https://www.glassdoor.com/x", { fetch: fetcher, lookup: publicLookup }), hasCode("site_not_allowed"));
  assert.equal(calls.length, 0);
  const page = await fetchPage("https://www.linkedin.com/jobs/view/123?trk=x", { fetch: fetcher, lookup: publicLookup });
  assert.equal(page.text, "Staf Admin");
  assert.deepEqual(calls.map((c) => c.url), ["https://www.linkedin.com/jobs/view/123"]);
});

test("fetchPage does not follow a LinkedIn job page that redirects to the sign-in wall", async () => {
  const { fetcher } = fakeFetch({ "https://www.linkedin.com/jobs/view/123": redirect("https://www.linkedin.com/authwall?trk=x") });
  await assert.rejects(fetchPage("https://www.linkedin.com/jobs/view/123", { fetch: fetcher, lookup: publicLookup }), hasCode("site_not_allowed"));
});

test("parseScraplingOutput accepts a page or an error and rejects anything else", () => {
  assert.equal((parseScraplingOutput(scraplingPage("https://a.example/", "<p>x</p>")) as { status: number }).status, 200);
  assert.deepEqual(parseScraplingOutput('{"error":"Scrapling is not installed"}'), { error: "Scrapling is not installed" });
  for (const bad of ["", "not json", '{"url":"x"}', "[1]"]) {
    assert.throws(() => parseScraplingOutput(bad), ScraplingUnavailable, bad);
  }
});

test("readWithScrapling checks robots.txt, runs the script once per hop and returns the page text", async () => {
  const { fetcher, calls: fetches } = fakeFetch({
    "https://jobs.example.com/robots.txt": new Response("User-agent: *\nDisallow: /admin", { headers: { "content-type": "text/plain" } }),
  });
  const { run, calls } = fakeRunner({
    "https://jobs.example.com/old": scraplingPage("https://jobs.example.com/old", "", { status: 301, location: "/lowongan/1" }),
    "https://jobs.example.com/lowongan/1": scraplingPage("https://jobs.example.com/lowongan/1", "<script>x()</script><h1>Admin Gudang</h1><p>Gaji Rp5.000.000</p>"),
  });
  const page = await readWithScrapling("https://jobs.example.com/old", { python: "py", run, fetch: fetcher, lookup: publicLookup });
  assert.deepEqual(page, {
    url: "https://jobs.example.com/lowongan/1",
    contentType: "text/html",
    html: "<script>x()</script><h1>Admin Gudang</h1><p>Gaji Rp5.000.000</p>",
    text: "Admin Gudang\nGaji Rp5.000.000",
  });
  assert.deepEqual(calls.map((c) => [c.python, c.args[0].endsWith("scrapling_fetch.py"), c.args[1]]), [
    ["py", true, "https://jobs.example.com/old"],
    ["py", true, "https://jobs.example.com/lowongan/1"],
  ]);
  assert.equal(calls[0].timeout, TIMEOUT_MS + PYTHON_STARTUP_MS);
  assert.deepEqual(fetches.map((c) => c.url), ["https://jobs.example.com/robots.txt", "https://jobs.example.com/robots.txt"]);
});

test("readWithScrapling stops before running the script on a disallowed, private or blocked page", async () => {
  const { fetcher } = fakeFetch({ "https://jobs.example.com/robots.txt": new Response("User-agent: *\nDisallow: /", { headers: { "content-type": "text/plain" } }) });
  const { run, calls } = fakeRunner({
    "https://jobs.example.com/go": scraplingPage("https://jobs.example.com/go", "", { status: 302, location: "http://127.0.0.1/admin" }),
  });
  const options = { python: "py", run, fetch: fetcher, lookup: publicLookup };
  await assert.rejects(readWithScrapling("https://jobs.example.com/lowongan", options), hasCode("robots_disallowed"));
  await assert.rejects(readWithScrapling("https://www.linkedin.com/in/rina", options), hasCode("site_not_allowed"));
  await assert.rejects(readWithScrapling("http://localhost:3000/", options), hasCode("blocked_address"));
  assert.equal(calls.length, 0);
  const open = fakeFetch({});
  await assert.rejects(readWithScrapling("https://jobs.example.com/go", { ...options, fetch: open.fetcher }), hasCode("blocked_address"));
  assert.equal(calls.length, 1);
});

test("readWithScrapling reads a LinkedIn job page without robots.txt or tracking parameters", async () => {
  const { fetcher, calls: fetches } = fakeFetch({});
  const { run, calls } = fakeRunner({ "https://id.linkedin.com/jobs/view/4012345678": scraplingPage("https://id.linkedin.com/jobs/view/4012345678", "<h1>Staf Admin</h1>") });
  const page = await readWithScrapling("https://id.linkedin.com/jobs/view/4012345678?trackingId=abc", { python: "py", run, fetch: fetcher, lookup: publicLookup });
  assert.equal(page.text, "Staf Admin");
  assert.deepEqual(calls.map((c) => c.args[1]), ["https://id.linkedin.com/jobs/view/4012345678"]);
  assert.equal(fetches.length, 0);
});

test("readWithScrapling reports error statuses and files that are not web pages", async () => {
  const { fetcher } = fakeFetch({});
  const { run } = fakeRunner({
    "https://a.example.com/gone": scraplingPage("https://a.example.com/gone", "", { status: 404 }),
    "https://a.example.com/cv.pdf": scraplingPage("https://a.example.com/cv.pdf", "%PDF", { contentType: "application/pdf" }),
  });
  const options = { python: "py", run, fetch: fetcher, lookup: publicLookup };
  await assert.rejects(readWithScrapling("https://a.example.com/gone", options), hasCode("http_error"));
  await assert.rejects(readWithScrapling("https://a.example.com/cv.pdf", options), hasCode("not_html"));
});

test("readPage falls back to the built-in fetcher when Python or Scrapling is missing or fails", async () => {
  const routes = { "https://jobs.example.com/1": html("<h1>Kasir</h1>") };
  const missing = fakeFetch(routes);
  const previous = process.env.SCRAPLING_PYTHON;
  delete process.env.SCRAPLING_PYTHON;
  try {
    assert.equal((await readPage("https://jobs.example.com/1", { fetch: missing.fetcher, lookup: publicLookup, run: async () => assert.fail() })).text, "Kasir");
  } finally {
    if (previous !== undefined) process.env.SCRAPLING_PYTHON = previous;
  }
  const notInstalled = fakeFetch(routes);
  const { run } = fakeRunner({ "https://jobs.example.com/1": '{"error":"Scrapling is not installed"}' });
  assert.equal((await readPage("https://jobs.example.com/1", { python: "py", run, fetch: notInstalled.fetcher, lookup: publicLookup })).text, "Kasir");
  const crashed = fakeFetch(routes);
  const crash: Runner = async () => Promise.reject(new ScraplingUnavailable("spawn py ENOENT"));
  assert.equal((await readPage("https://jobs.example.com/1", { python: "py", run: crash, fetch: crashed.fetcher, lookup: publicLookup })).text, "Kasir");
});

test("readPage keeps a definite answer from Scrapling instead of retrying with the built-in fetcher", async () => {
  const { fetcher, pages } = fakeFetch({});
  const { run } = fakeRunner({ "https://a.example.com/gone": scraplingPage("https://a.example.com/gone", "", { status: 404 }) });
  await assert.rejects(readPage("https://a.example.com/gone", { python: "py", run, fetch: fetcher, lookup: publicLookup }), hasCode("http_error"));
  const slow: Runner = async () => Promise.reject(new ScrapeError("timeout", "The page took too long to answer"));
  await assert.rejects(readPage("https://a.example.com/slow", { python: "py", run: slow, fetch: fetcher, lookup: publicLookup }), hasCode("timeout"));
  assert.deepEqual(pages(), []);
});

test("interview sources may read a LinkedIn job ad link but never LinkedIn for anything else", () => {
  assert.equal(isForbiddenSite("https://www.linkedin.com/jobs/view/123", true), false);
  assert.equal(isForbiddenSite("https://www.linkedin.com/jobs/view/123"), true);
  assert.equal(isForbiddenSite("https://www.linkedin.com/in/rina", true), true);
  assert.equal(isForbiddenSite("https://www.glassdoor.com/x", true), true);
});

const SAMPLE_CV = {
  name: "Rina Wijaya",
  headline: "Final-year Informatics student",
  education: [{ school: "Universitas Ciputra", degree: "S1 Informatika", years: "2022 - 2026" }],
  experience: [{ role: "Web intern", organisation: "PT Contoh", years: "2025", highlights: ["Built a booking site"] }],
  skills: ["React"],
  languages: ["English"],
};

const NO_SOURCES = async () => ({ jobText: "", companyText: "", questions: [], failed: [] });

test("parseInterviewForm reads text fields, the profile CV and a checked portfolio file", () => {
  const form = new FormData();
  form.append("role", " Web Developer ");
  form.append("lang", "en");
  form.append("cv", JSON.stringify({ ...SAMPLE_CV, skills: ["x".repeat(400)] }));
  form.append("portfolio", new File(["%PDF-1.4"], "portfolio.pdf", { type: "application/pdf" }));
  const input = parseInterviewForm(form);
  assert.equal(input.role, "Web Developer");
  assert.equal(input.lang, "en");
  assert.equal(input.cv?.skills[0].length, 300);
  assert.equal(input.portfolioFile?.name, "portfolio.pdf");

  const broken = new FormData();
  broken.append("role", "Admin");
  broken.append("cv", "{not json");
  assert.equal(parseInterviewForm(broken).cv, undefined);
  assert.equal(parseInterviewForm(broken).portfolioFile, undefined);

  const wrongType = new FormData();
  wrongType.append("role", "Admin");
  wrongType.append("portfolio", new File(["x"], "notes.txt", { type: "text/plain" }));
  assert.throws(() => parseInterviewForm(wrongType), (e) => e instanceof BadRequest && e.code === "fileType");
});

test("prepareInterview sends the CV without the name and the portfolio link and file", async () => {
  let text = "";
  let partCount = 0;
  const generate = (async (_schema: unknown, _system: string, parts: { text?: string; inlineData?: { mimeType: string } }[]) => {
    text = parts[0].text ?? "";
    partCount = parts.length;
    assert.equal(parts[1]?.inlineData?.mimeType, "application/pdf");
    return { role: "Web Developer", company: "", candidateSnapshot: "s", questions: [], questionsToAskThem: [] };
  }) as unknown as typeof generateJson;
  const fetch = async (url: string) => ({ url, text: `Project: Booking site for a café. ${"y".repeat(MAX_PORTFOLIO_CHARS)}` });
  const req = parseInterviewRequest({ role: "Web Developer", cv: SAMPLE_CV, portfolioUrl: "https://rina.example.com/" });
  const portfolioFile = new File(["%PDF-1.4"], "portfolio.pdf", { type: "application/pdf" });
  const out = await prepareInterview({ ...req, portfolioFile }, { collect: NO_SOURCES, generate, fetch });

  assert.equal(partCount, 2);
  assert.match(text, /<cv>\n.*Final-year Informatics student/);
  assert.doesNotMatch(text, /Rina Wijaya/);
  assert.match(text, /<portfolio>\nProject: Booking site for a café/);
  assert.ok(text.length < MAX_PORTFOLIO_CHARS + 2_000);
  assert.deepEqual(out.unreadSources, []);
});

test("prepareInterview skips a portfolio link that is blocked or unreadable and reports it", async () => {
  const generate = (async () => ({ role: "Admin", company: "", candidateSnapshot: "s", questions: [], questionsToAskThem: [] })) as unknown as typeof generateJson;
  const failing = async () => Promise.reject(new ScrapeError("timeout", "The page took too long to answer"));
  const linkedin = await prepareInterview(parseInterviewRequest({ role: "Admin", portfolioUrl: "https://www.linkedin.com/in/rina" }), { collect: NO_SOURCES, generate, fetch: async () => assert.fail() });
  assert.deepEqual(linkedin.unreadSources, [{ url: "https://www.linkedin.com/in/rina", reason: "This site does not allow automated reading" }]);
  const slow = await prepareInterview(parseInterviewRequest({ role: "Admin", portfolioUrl: "https://slow.example.com/" }), { collect: NO_SOURCES, generate, fetch: failing });
  assert.deepEqual(slow.unreadSources, [{ url: "https://slow.example.com/", reason: "The page took too long to answer" }]);
});
