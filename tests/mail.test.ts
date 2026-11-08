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
