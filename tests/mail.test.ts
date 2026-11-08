import { test } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
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

test("contractResultTemplate renders escaped findings and disclaimer", () => {
  const result = contractResultTemplate({
    contractType: "PKWT",
    summary: "Kontrak kerja 1 tahun <uji>",
    clauses: [
      {
        title: "Masa Percobaan",
        text: "Karyawan menjalani masa percobaan 3 bulan.",
        verdict: "red",
        ruleId: "pkwt-probation",
        explanation: "PKWT tidak boleh mensyaratkan masa percobaan.",
        questionToAsk: "Apakah klausul ini dapat dihapus?",
      },
    ],
    negotiationMessage: "Halo HR, mohon ditinjau kembali.",
  });

  assert.ok(result.subject.includes("PKWT"));
  assert.ok(result.html.includes("&lt;uji&gt;"));
  assert.ok(!result.html.includes("<uji>"));
  assert.ok(result.html.includes("Masa Percobaan"));
  assert.ok(result.html.includes("Perlu Diwaspadai"));
  assert.ok(result.html.includes("Halo HR, mohon ditinjau kembali."));
  assert.ok(result.html.includes("CekKerja memberikan informasi"));
  assert.ok(result.text.includes("[RED]"));
});

test("jobAdResultTemplate renders escaped ad findings and rewrite", () => {
  const result = jobAdResultTemplate({
    role: "Frontend Engineer",
    company: "PT Maju Jaya",
    summary: "Lowongan kerja dengan batasan usia & gender",
    flags: [
      {
        quote: "Usia maksimal 25 tahun & berpenampilan menarik",
        verdict: "red",
        ruleId: "age-limit",
        explanation: "Diskriminasi usia tidak diperbolehkan.",
        questionToAsk: "Apakah usia bersifat mutlak?",
      },
    ],
    inclusiveRewrite: "Dicari Frontend Engineer dengan kemampuan React.",
  });

  assert.ok(result.subject.includes("Frontend Engineer"));
  assert.ok(result.html.includes("PT Maju Jaya"));
  assert.ok(result.html.includes("&amp; berpenampilan menarik"));
  assert.ok(result.html.includes("Dicari Frontend Engineer"));
  assert.ok(result.text.includes("Tanya Perekrut:"));
});

test("interviewPrepTemplate renders interview questions and advice", () => {
  const result = interviewPrepTemplate({
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
  });

  assert.ok(result.subject.includes("Backend Engineer"));
  assert.ok(result.html.includes("Ceritakan pengalaman membuat API."));
  assert.ok(result.html.includes("Gunakan metode STAR."));
  assert.ok(result.html.includes("Bagaimana jenjang karier"));
  assert.ok(result.text.includes("#1 [ROLE]"));
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

test("sendMail sends email using test account", async () => {
  const testAccount = await nodemailer.createTestAccount();
  const origHost = process.env.SMTP_HOST;
  const origPort = process.env.SMTP_PORT;
  const origUser = process.env.SMTP_USER;
  const origPass = process.env.SMTP_PASS;
  const origFrom = process.env.MAIL_FROM;

  try {
    process.env.SMTP_HOST = testAccount.smtp.host;
    process.env.SMTP_PORT = String(testAccount.smtp.port);
    process.env.SMTP_USER = testAccount.user;
    process.env.SMTP_PASS = testAccount.pass;
    process.env.MAIL_FROM = testAccount.user;

    const result = await sendMail(testAccount.user, {
      subject: "Test CekKerja Mail",
      html: "<p>Halo dari CekKerja test</p>",
      text: "Halo dari CekKerja test",
    });

    assert.ok(result.messageId);
  } finally {
    if (origHost) process.env.SMTP_HOST = origHost; else delete process.env.SMTP_HOST;
    if (origPort) process.env.SMTP_PORT = origPort; else delete process.env.SMTP_PORT;
    if (origUser) process.env.SMTP_USER = origUser; else delete process.env.SMTP_USER;
    if (origPass) process.env.SMTP_PASS = origPass; else delete process.env.SMTP_PASS;
    if (origFrom) process.env.MAIL_FROM = origFrom; else delete process.env.MAIL_FROM;
  }
});
