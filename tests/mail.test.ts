import { test } from "node:test";
import assert from "node:assert/strict";
import nodemailer, { type SendMailOptions } from "nodemailer";
import {
  escapeHtml,
  contractResultTemplate,
  jobAdResultTemplate,
  interviewPrepTemplate,
} from "../src/lib/mail/templates.ts";
import { createMailerTransport, sendMail } from "../src/lib/mail/send.ts";

test("escapeHtml escapes special HTML characters", () => {
  const input = `<script>alert("XSS & danger's");</script>`;
  const escaped = escapeHtml(input);
  assert.equal(
    escaped,
    "&lt;script&gt;alert(&quot;XSS &amp; danger&#39;s&quot;);&lt;/script&gt;"
  );
  assert.ok(!escaped.includes("<script>"));
  assert.ok(!escaped.includes('"'));
});

test("contractResultTemplate renders ID and EN with legal basis and verdict labels", () => {
  const resultId = contractResultTemplate({
    contractType: "PKWT",
    summary: "Kontrak kerja 1 tahun <uji>",
    clauses: [
      {
        title: "Masa Percobaan",
        text: "Karyawan menjalani masa percobaan 3 bulan.",
        verdict: "red",
        ruleId: "pkwt-probation",
        explanation: "PKWT tidak boleh mensyaratkan masa percobaan.",
        source: "UU 13/2003 Pasal 58",
        questionToAsk: "Apakah klausul ini dapat dihapus?",
      },
    ],
    negotiationMessage: "Halo HR, mohon ditinjau kembali.",
    lang: "id",
  });

  assert.equal(resultId.subject, "Hasil Analisis Kontrak Kerja (PKWT) - Cek Kerja");
  assert.ok(!resultId.subject.includes("&amp;"));
  assert.ok(resultId.html.includes("&lt;uji&gt;"));
  assert.ok(!resultId.html.includes("<uji>"));
  assert.ok(resultId.html.includes("Melanggar?"));
  assert.ok(!resultId.html.includes("Sesuai Aturan"));
  assert.ok(resultId.html.includes("UU 13/2003 Pasal 58"));
  assert.ok(resultId.html.includes("Dasar hukum:"));
  assert.ok(resultId.html.includes("Halo HR, mohon ditinjau kembali."));
  assert.ok(resultId.text.includes("[MELANGGAR?]"));
  assert.ok(resultId.text.includes("UU 13/2003 Pasal 58"));

  const resultEn = contractResultTemplate({
    contractType: "PKWT",
    summary: "1-year work contract",
    clauses: [
      {
        title: "Probation Period",
        text: "3-month probation period applies.",
        verdict: "red",
        ruleId: "pkwt-probation",
        explanation: "Fixed-term contracts cannot require probation.",
        source: "UU 13/2003 Art 58",
        questionToAsk: "Can this clause be removed?",
      },
    ],
    lang: "en",
  });

  assert.equal(resultEn.subject, "Contract Check Result (PKWT) - Cek Kerja");
  assert.ok(resultEn.html.includes("Violation?"));
  assert.ok(resultEn.html.includes("Legal basis:"));
  assert.ok(resultEn.html.includes("UU 13/2003 Art 58"));
  assert.ok(resultEn.text.includes("[VIOLATION?]"));
});

test("jobAdResultTemplate renders unescaped subject with ampersand and handles ID/EN", () => {
  const result = jobAdResultTemplate({
    role: "Frontend Engineer",
    company: "PT A & B",
    summary: "Lowongan kerja dengan batasan usia & gender",
    flags: [
      {
        quote: "Usia maksimal 25 tahun & berpenampilan menarik",
        verdict: "yellow",
        ruleId: "age-limit",
        explanation: "Diskriminasi usia tidak diperbolehkan.",
        source: "UU 13/2003 Pasal 5",
        questionToAsk: "Apakah usia bersifat mutlak?",
      },
    ],
    inclusiveRewrite: "Dicari Frontend Engineer dengan kemampuan React.",
    lang: "id",
  });

  assert.equal(result.subject, "Hasil Analisis Lowongan: Frontend Engineer di PT A & B - Cek Kerja");
  assert.ok(result.html.includes("Cek lagi"));
  assert.ok(result.html.includes("&amp; berpenampilan menarik"));
  assert.ok(result.html.includes("UU 13/2003 Pasal 5"));
  assert.ok(result.text.includes("[CEK LAGI]"));

  const resultEn = jobAdResultTemplate({
    role: "Frontend Engineer",
    company: "PT A & B",
    summary: "Job vacancy",
    flags: [
      {
        quote: "Maximum age 25",
        verdict: "yellow",
        ruleId: "age-limit",
        explanation: "Age discrimination is restricted.",
        source: "UU 13/2003 Art 5",
        questionToAsk: "Is age mandatory?",
      },
    ],
    lang: "en",
  });

  assert.equal(resultEn.subject, "Job Ad Check: Frontend Engineer at PT A & B - Cek Kerja");
  assert.ok(resultEn.html.includes("Check again"));
  assert.ok(resultEn.html.includes("Legal basis:"));
  assert.ok(resultEn.text.includes("[CHECK AGAIN]"));
});

test("interviewPrepTemplate renders ID and EN interview prep content", () => {
  const resultId = interviewPrepTemplate({
    role: "Backend Engineer",
    company: "PT Tech Indo",
    candidateSnapshot: "Fresh graduate dengan portofolio Go.",
    questions: [
      {
        question: "Ceritakan pengalaman membuat API.",
        category: "role",
        whyTailored: "Posisi membutuhkan pemahaman REST API.",
        answerTips: "Gunakan metode STAR.",
      },
    ],
    questionsToAskThem: ["Bagaimana jenjang karier untuk posisi ini?"],
    lang: "id",
  });

  assert.equal(resultId.subject, "Latihan Wawancara: Backend Engineer di PT Tech Indo - Cek Kerja");
  assert.ok(resultId.html.includes("Ceritakan pengalaman membuat API."));
  assert.ok(resultId.html.includes("Gunakan metode STAR."));
  assert.ok(resultId.html.includes("Bagaimana jenjang karier"));
  assert.ok(resultId.text.includes("#1 [ROLE]"));

  const resultEn = interviewPrepTemplate({
    role: "Backend Engineer",
    company: "PT Tech Indo",
    candidateSnapshot: "Fresh graduate with Go portfolio.",
    questions: [
      {
        question: "Tell me about building an API.",
        category: "role",
        whyTailored: "The role requires REST API skills.",
        answerTips: "Use STAR method.",
      },
    ],
    lang: "en",
  });

  assert.equal(resultEn.subject, "Interview Prep: Backend Engineer at PT Tech Indo - Cek Kerja");
  assert.ok(resultEn.html.includes("Tell me about building an API."));
  assert.ok(resultEn.html.includes("Practice Questions"));
});

test("createMailerTransport throws error when SMTP is unconfigured", () => {
  const origHost = process.env.SMTP_HOST;
  const origUser = process.env.SMTP_USER;
  const origPass = process.env.SMTP_PASS;

  try {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    assert.throws(
      () => {
        createMailerTransport();
      },
      {
        message: "SMTP is not configured",
      }
    );
  } finally {
    if (origHost) process.env.SMTP_HOST = origHost;
    if (origUser) process.env.SMTP_USER = origUser;
    if (origPass) process.env.SMTP_PASS = origPass;
  }
});

test("sendMail formats options and passes them to transport sendMail", async () => {
  let sentOptions: SendMailOptions | null = null;

  const stubTransport = {
    sendMail: async (options: SendMailOptions) => {
      sentOptions = options;
      return { messageId: "<mock-id@test>" };
    },
  };

  const origCreateTransport = nodemailer.createTransport;
  const origHost = process.env.SMTP_HOST;
  const origPort = process.env.SMTP_PORT;
  const origUser = process.env.SMTP_USER;
  const origPass = process.env.SMTP_PASS;
  const origFrom = process.env.MAIL_FROM;

  try {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.MAIL_FROM = "sender@example.com";

    (nodemailer as unknown as { createTransport: unknown }).createTransport = () => stubTransport;

    const result = await sendMail("user@example.com", {
      subject: "Test Subject & Result",
      html: "<p>Test body</p>",
      text: "Test text",
    });

    assert.equal(result.messageId, "<mock-id@test>");
    assert.equal((sentOptions as unknown as SendMailOptions | null)?.to, "user@example.com");
    assert.equal((sentOptions as unknown as SendMailOptions | null)?.from, "sender@example.com");
    assert.equal((sentOptions as unknown as SendMailOptions | null)?.subject, "Test Subject & Result");
  } finally {
    (nodemailer as unknown as { createTransport: unknown }).createTransport = origCreateTransport;
    if (origHost) process.env.SMTP_HOST = origHost; else delete process.env.SMTP_HOST;
    if (origPort) process.env.SMTP_PORT = origPort; else delete process.env.SMTP_PORT;
    if (origUser) process.env.SMTP_USER = origUser; else delete process.env.SMTP_USER;
    if (origPass) process.env.SMTP_PASS = origPass; else delete process.env.SMTP_PASS;
    if (origFrom) process.env.MAIL_FROM = origFrom; else delete process.env.MAIL_FROM;
  }
});

const contractRequest = {
  kind: "contract",
  to: "kenneth@example.com",
  lang: "id",
  result: {
    contractType: "PKWT",
    summary: "Ringkasan <script>alert(1)</script>",
    clauses: [
      { title: "Masa percobaan", text: "Masa percobaan 3 bulan.", verdict: "red", ruleId: "pkwt-probation", explanation: "PKWT tidak boleh ada masa percobaan.", source: "UU 13/2003 Pasal 58", questionToAsk: "Bisa dihapus?" },
    ],
    negotiationMessage: "Halo HR",
    numberChecks: [{ ignored: true }],
  },
};

const adRequest = {
  kind: "ad",
  to: "kenneth@example.com",
  lang: "en",
  result: {
    role: "Admin",
    company: "PT Contoh",
    summary: "Summary",
    flags: [{ quote: "Max age 25", verdict: "red", ruleId: "age-limit", explanation: "Age limits may discriminate.", source: null, questionToAsk: "Why the age limit?" }],
    inclusiveRewrite: "Open to all ages",
  },
};

test("EmailRequest accepts contract and job ad results and strips extra fields", async () => {
  const { EmailRequest } = await import("../src/lib/mail/email-request.ts");
  const contract = EmailRequest.parse(contractRequest);
  assert.equal(contract.kind, "contract");
  assert.equal("numberChecks" in contract.result, false);
  assert.equal(EmailRequest.parse(adRequest).kind, "ad");
});

test("EmailRequest rejects bad addresses, unknown kinds, header line breaks and oversized lists", async () => {
  const { EmailRequest, MAX_ITEMS } = await import("../src/lib/mail/email-request.ts");
  for (const to of ["", "abc", "a@b", "a b@c.com", `${"x".repeat(250)}@example.com`]) {
    assert.equal(EmailRequest.safeParse({ ...contractRequest, to }).success, false, to);
  }
  assert.equal(EmailRequest.safeParse({ ...contractRequest, kind: "interview" }).success, false);
  assert.equal(EmailRequest.safeParse({ ...contractRequest, lang: "fr" }).success, false);
  const injected = { ...contractRequest, result: { ...contractRequest.result, contractType: "PKWT\r\nBcc: victim@example.com" } };
  assert.equal(EmailRequest.safeParse(injected).success, false);
  const tooMany = { ...adRequest, result: { ...adRequest.result, flags: Array(MAX_ITEMS + 1).fill(adRequest.result.flags[0]) } };
  assert.equal(EmailRequest.safeParse(tooMany).success, false);
  assert.equal(EmailRequest.safeParse({ ...adRequest, result: { ...adRequest.result, flags: [] } }).success, true);
});

test("buildEmail sends only to the requested address and escapes HTML from the result", async () => {
  const { EmailRequest, buildEmail } = await import("../src/lib/mail/email-request.ts");
  const { to, mail } = buildEmail(EmailRequest.parse({ ...contractRequest, to: "  kenneth@example.com " }));
  assert.equal(to, "kenneth@example.com");
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&lt;script&gt;/);
});

test("createRateLimiter allows up to the limit per key and resets after the window", async () => {
  const { createRateLimiter } = await import("../src/lib/mail/email-request.ts");
  const allow = createRateLimiter(2, 1000);
  assert.equal(allow("a", 0), true);
  assert.equal(allow("a", 10), true);
  assert.equal(allow("a", 20), false);
  assert.equal(allow("b", 20), true);
  assert.equal(allow("a", 1001), true);
});

test("email-result route rejects bad input and reports when SMTP is not set up", async () => {
  const saved = { host: process.env.SMTP_HOST, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  const quiet = console.error;
  console.error = () => {};
  try {
    const { POST } = await import("../src/app/api/email-result/route.ts");
    const call = async (body: string, ip: string) => {
      const res = await POST(new Request("http://x/api/email-result", { method: "POST", body, headers: { "x-forwarded-for": ip } }));
      return { status: res.status, body: await res.json() };
    };
    assert.deepEqual(await call("not json", "1.1.1.1"), { status: 400, body: { error: "invalid" } });
    assert.deepEqual(await call(JSON.stringify({ ...contractRequest, to: "nope" }), "1.1.1.2"), { status: 400, body: { error: "emailInvalid" } });
    assert.deepEqual(await call(JSON.stringify(contractRequest), "1.1.1.3"), { status: 503, body: { error: "notConfigured" } });
    assert.deepEqual(await call("x".repeat(256 * 1024 + 1), "1.1.1.4"), { status: 413, body: { error: "tooLarge" } });
    for (let i = 0; i < 5; i++) await call("not json", "9.9.9.9");
    assert.deepEqual(await call(JSON.stringify(contractRequest), "9.9.9.9"), { status: 429, body: { error: "rateLimited" } });
  } finally {
    console.error = quiet;
    if (saved.host) process.env.SMTP_HOST = saved.host;
    if (saved.user) process.env.SMTP_USER = saved.user;
    if (saved.pass) process.env.SMTP_PASS = saved.pass;
  }
});

test("email-result route limits by the real client address and by recipient", async () => {
  const saved = { host: process.env.SMTP_HOST, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  try {
    const { POST } = await import("../src/app/api/email-result/route.ts");
    const call = async (body: string, headers: Record<string, string>) =>
      (await POST(new Request("http://x/api/email-result", { method: "POST", body, headers }))).status;
    for (let i = 0; i < 5; i++) await call("not json", { "x-real-ip": "7.7.7.7", "x-forwarded-for": `10.0.0.${i}` });
    assert.equal(await call("not json", { "x-real-ip": "7.7.7.7", "x-forwarded-for": "10.0.0.99" }), 429);
    const toOther = JSON.stringify({ ...contractRequest, to: "limit-test@example.com" });
    for (let i = 0; i < 3; i++) assert.equal(await call(toOther, { "x-real-ip": `8.8.8.${i}` }), 503);
    assert.equal(await call(toOther, { "x-real-ip": "8.8.8.9" }), 429);
  } finally {
    if (saved.host) process.env.SMTP_HOST = saved.host;
    if (saved.user) process.env.SMTP_USER = saved.user;
    if (saved.pass) process.env.SMTP_PASS = saved.pass;
  }
});
