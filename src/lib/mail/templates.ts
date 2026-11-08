import type { Lang } from "../i18n.ts";
import { strings } from "../i18n.ts";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout(title: string, bodyContent: string, lang: Lang): string {
  const t = strings[lang];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #15171c; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #fdfdfe; border-radius: 20px; overflow: hidden; border: 1px solid #dde1e8; box-shadow: 0 1px 2px rgba(21, 23, 28, 0.06);">
    <tr>
      <td style="padding: 20px 28px; background-color: #0d2c78; color: #fdfdfe;">
        <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">${escapeHtml(t.nav.brand)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px;">
        ${bodyContent}
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 28px; background-color: #eceef2; border-top: 1px solid #dde1e8; font-size: 13.5px; color: #545b68; text-align: center; line-height: 1.4;">
        <p style="margin: 0 0 8px 0;">${escapeHtml(t.footer.disclaimer)}</p>
        <p style="margin: 0; font-size: 12px; color: #858d9b;">
          ${lang === "en" ? "This email was automatically sent to your account. Do not reply to this email." : "Email ini dikirim otomatis ke akun kamu sendiri. Jangan balas email ini."}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function verdictBadge(verdict: "red" | "yellow" | "green", lang: Lang): string {
  const t = strings[lang];
  const label = t.verdict[verdict];

  const styles = {
    red: "background-color: #fbe1e3; color: #b11a26; border: 1px solid #d21f2c;",
    yellow: "background-color: #fdf0c4; color: #7a5500; border: 1px solid #15171c;",
    green: "background-color: #dcf1e5; color: #0e6c3e; border: 1px solid #12884e;",
  };

  const icons = {
    red: `<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #d21f2c; margin-right: 6px; vertical-align: middle;"></span>`,
    yellow: `<span style="display: inline-block; width: 8px; height: 8px; transform: rotate(45deg); background-color: #f6b900; border: 1.5px solid #15171c; margin-right: 6px; vertical-align: middle;"></span>`,
    green: `<span style="display: inline-block; width: 12px; height: 8px; border-radius: 2px; background-color: #12884e; margin-right: 6px; vertical-align: middle;"></span>`,
  };

  return `<span style="display: inline-flex; align-items: center; padding: 2px 10px; font-size: 13px; font-weight: 700; border-radius: 999px; ${styles[verdict]}">${icons[verdict]}${escapeHtml(label)}</span>`;
}

const quoteWashColors = {
  red: "#fbe1e3",
  yellow: "#fdf0c4",
  green: "#dcf1e5",
};

export interface ContractEmailData {
  contractType: string;
  summary: string;
  clauses: Array<{
    title: string;
    text: string;
    verdict: "red" | "yellow" | "green";
    ruleId: string;
    explanation: string;
    source?: string | null;
    questionToAsk?: string;
  }>;
  negotiationMessage?: string;
  lang?: Lang;
}

export function contractResultTemplate(data: ContractEmailData): { subject: string; html: string; text: string } {
  const lang = data.lang ?? "id";
  const t = strings[lang];

  const subject =
    lang === "en"
      ? `Contract Check Result (${data.contractType}) - Cek Kerja`
      : `Hasil Analisis Kontrak Kerja (${data.contractType}) - Cek Kerja`;

  const clausesHtml = data.clauses
    .map(
      (c) => `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #dde1e8; border-radius: 12px; background-color: #fdfdfe;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 16px; color: #15171c; font-weight: 700;">${escapeHtml(c.title)}</strong>
          ${verdictBadge(c.verdict, lang)}
        </div>
        <blockquote style="margin: 8px 0; padding: 12px 16px; background-color: ${quoteWashColors[c.verdict]}; border-radius: 8px; font-size: 15px; color: #15171c; font-style: italic;">
          "${escapeHtml(c.text)}"
        </blockquote>
        <p style="margin: 8px 0; font-size: 15px; color: #15171c; line-height: 1.5;">${escapeHtml(c.explanation)}</p>
        <p style="margin: 6px 0 0 0; font-size: 13.5px; color: #545b68;">
          <strong style="color: #15171c;">${escapeHtml(t.finding.legalBasis)}</strong> ${escapeHtml(c.source ?? (lang === "en" ? "Not in our rule list" : "Tidak ada di daftar aturan kami"))}
        </p>
        ${
          c.questionToAsk
            ? `<p style="margin: 6px 0 0 0; font-size: 13.5px; color: #1748c0;">
                <strong>${escapeHtml(t.finding.question)}</strong> ${escapeHtml(c.questionToAsk)}
              </p>`
            : ""
        }
      </div>
    `
    )
    .join("");

  const negotiationHtml = data.negotiationMessage
    ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #e4ebfb; border: 1px solid #b9c6ea; border-radius: 12px;">
        <strong style="color: #0d2c78; font-size: 15px; display: block; margin-bottom: 6px;">${lang === "en" ? "Message for HR" : "Pesan untuk HR"}:</strong>
        <p style="margin: 0; font-size: 14px; color: #15171c; white-space: pre-wrap;">${escapeHtml(data.negotiationMessage)}</p>
      </div>
    `
    : "";

  const bodyContent = `
    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 750; color: #15171c;">${lang === "en" ? "Contract Check Summary" : "Ringkasan Pemeriksaan Kontrak"}</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #545b68;">${lang === "en" ? "Contract Type" : "Jenis Kontrak"}: <strong>${escapeHtml(data.contractType)}</strong></p>
    <div style="padding: 16px; background-color: #eceef2; border-radius: 12px; margin-bottom: 24px; font-size: 15px; color: #15171c;">
      ${escapeHtml(data.summary)}
    </div>
    <h3 style="margin: 0 0 14px 0; font-size: 17px; font-weight: 700; color: #15171c;">${lang === "en" ? "Findings by Clause" : "Hasil per Klausul"}</h3>
    ${clausesHtml}
    ${negotiationHtml}
  `;

  const textLines = [
    subject,
    "",
    `${lang === "en" ? "Contract Type" : "Jenis"}: ${data.contractType}`,
    `${lang === "en" ? "Summary" : "Ringkasan"}: ${data.summary}`,
    "",
    lang === "en" ? "CLAUSES:" : "KLAUSUL:",
    ...data.clauses.map((c) => {
      const tag = t.verdict[c.verdict].toUpperCase();
      const lines = [
        `- [${tag}] ${c.title}`,
        `  "${c.text}"`,
        `  ${c.explanation}`,
        `  ${t.finding.legalBasis} ${c.source ?? (lang === "en" ? "Not in our rule list" : "Tidak ada di daftar aturan kami")}`,
      ];
      if (c.questionToAsk) {
        lines.push(`  ${t.finding.question} ${c.questionToAsk}`);
      }
      return lines.join("\n");
    }),
  ];

  if (data.negotiationMessage) {
    textLines.push("", `${lang === "en" ? "Message for HR" : "Pesan untuk HR"}:\n${data.negotiationMessage}`);
  }

  textLines.push("", "---", t.footer.disclaimer);

  return {
    subject,
    html: baseLayout(subject, bodyContent, lang),
    text: textLines.join("\n"),
  };
}

export interface JobAdEmailData {
  role: string;
  company: string;
  summary: string;
  flags: Array<{
    quote: string;
    verdict: "red" | "yellow" | "green";
    ruleId: string;
    explanation: string;
    source?: string | null;
    questionToAsk: string;
  }>;
  inclusiveRewrite?: string;
  lang?: Lang;
}

export function jobAdResultTemplate(data: JobAdEmailData): { subject: string; html: string; text: string } {
  const lang = data.lang ?? "id";
  const t = strings[lang];

  const subject =
    lang === "en"
      ? `Job Ad Check: ${data.role} at ${data.company} - Cek Kerja`
      : `Hasil Analisis Lowongan: ${data.role} di ${data.company} - Cek Kerja`;

  const flagsHtml = data.flags
    .map(
      (f) => `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #dde1e8; border-radius: 12px; background-color: #fdfdfe;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 16px; color: #15171c; font-weight: 700;">${lang === "en" ? "Ad Finding" : "Temuan Lowongan"}</strong>
          ${verdictBadge(f.verdict, lang)}
        </div>
        <blockquote style="margin: 8px 0; padding: 12px 16px; background-color: ${quoteWashColors[f.verdict]}; border-radius: 8px; font-size: 15px; color: #15171c; font-style: italic;">
          "${escapeHtml(f.quote)}"
        </blockquote>
        <p style="margin: 8px 0; font-size: 15px; color: #15171c; line-height: 1.5;">${escapeHtml(f.explanation)}</p>
        <p style="margin: 6px 0 0 0; font-size: 13.5px; color: #545b68;">
          <strong style="color: #15171c;">${escapeHtml(t.finding.legalBasis)}</strong> ${escapeHtml(f.source ?? (lang === "en" ? "Not in our rule list" : "Tidak ada di daftar aturan kami"))}
        </p>
        <p style="margin: 6px 0 0 0; font-size: 13.5px; color: #1748c0;">
          <strong>${escapeHtml(t.finding.question)}</strong> ${escapeHtml(f.questionToAsk)}
        </p>
      </div>
    `
    )
    .join("");

  const rewriteHtml = data.inclusiveRewrite
    ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #dcf1e5; border: 1px solid #12884e; border-radius: 12px;">
        <strong style="color: #0e6c3e; font-size: 15px; display: block; margin-bottom: 6px;">${lang === "en" ? "Inclusive Rewrite Suggestion" : "Saran Versi Inklusif"}:</strong>
        <p style="margin: 0; font-size: 14px; color: #15171c; white-space: pre-wrap;">${escapeHtml(data.inclusiveRewrite)}</p>
      </div>
    `
    : "";

  const bodyContent = `
    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 750; color: #15171c;">${escapeHtml(data.role)} - ${escapeHtml(data.company)}</h2>
    <div style="padding: 16px; background-color: #eceef2; border-radius: 12px; margin-bottom: 24px; font-size: 15px; color: #15171c;">
      ${escapeHtml(data.summary)}
    </div>
    <h3 style="margin: 0 0 14px 0; font-size: 17px; font-weight: 700; color: #15171c;">${lang === "en" ? "Job Ad Findings" : "Temuan Poin Lowongan"}</h3>
    ${flagsHtml}
    ${rewriteHtml}
  `;

  const textLines = [
    subject,
    "",
    `${lang === "en" ? "Summary" : "Ringkasan"}: ${data.summary}`,
    "",
    lang === "en" ? "FINDINGS:" : "TEMUAN:",
    ...data.flags.map((f) => {
      const tag = t.verdict[f.verdict].toUpperCase();
      return [
        `- [${tag}]`,
        `  "${f.quote}"`,
        `  ${f.explanation}`,
        `  ${t.finding.legalBasis} ${f.source ?? (lang === "en" ? "Not in our rule list" : "Tidak ada di daftar aturan kami")}`,
        `  ${t.finding.question} ${f.questionToAsk}`,
      ].join("\n");
    }),
  ];

  if (data.inclusiveRewrite) {
    textLines.push("", `${lang === "en" ? "Inclusive Rewrite Suggestion" : "Saran Versi Inklusif"}:\n${data.inclusiveRewrite}`);
  }

  textLines.push("", "---", t.footer.disclaimer);

  return {
    subject,
    html: baseLayout(subject, bodyContent, lang),
    text: textLines.join("\n"),
  };
}

export interface InterviewEmailData {
  role: string;
  company: string;
  candidateSnapshot: string;
  questions: Array<{
    question: string;
    category: string;
    whyTailored: string;
    answerTips: string;
  }>;
  questionsToAskThem?: string[];
  lang?: Lang;
}

export function interviewPrepTemplate(data: InterviewEmailData): { subject: string; html: string; text: string } {
  const lang = data.lang ?? "id";
  const t = strings[lang];

  const subject =
    lang === "en"
      ? `Interview Prep: ${data.role} at ${data.company} - Cek Kerja`
      : `Latihan Wawancara: ${data.role} di ${data.company} - Cek Kerja`;

  const questionsHtml = data.questions
    .map(
      (q, idx) => `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #dde1e8; border-radius: 12px; background-color: #fdfdfe;">
        <div style="margin-bottom: 8px;">
          <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #545b68; letter-spacing: 0.05em;">#${idx + 1} • ${escapeHtml(q.category)}</span>
          <h4 style="margin: 4px 0 0 0; font-size: 16px; color: #15171c; font-weight: 700;">${escapeHtml(q.question)}</h4>
        </div>
        <p style="margin: 8px 0; font-size: 14px; color: #545b68;"><strong style="color: #15171c;">${lang === "en" ? "Why asked" : "Mengapa ditanyakan"}:</strong> ${escapeHtml(q.whyTailored)}</p>
        <div style="padding: 12px 14px; background-color: #eceef2; border-radius: 8px; font-size: 14px; color: #15171c;">
          <strong style="color: #15171c;">${lang === "en" ? "Tips to answer" : "Tips Menjawab"}:</strong> ${escapeHtml(q.answerTips)}
        </div>
      </div>
    `
    )
    .join("");

  const askThemHtml =
    data.questionsToAskThem && data.questionsToAskThem.length > 0
      ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #e4ebfb; border: 1px solid #b9c6ea; border-radius: 12px;">
        <strong style="color: #0d2c78; font-size: 15px; display: block; margin-bottom: 8px;">${lang === "en" ? "Questions You Should Ask Them:" : "Pertanyaan yang Perlu Kamu Tanyakan ke Pewawancara:"}</strong>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #15171c;">
          ${data.questionsToAskThem.map((q) => `<li style="margin-bottom: 6px;">${escapeHtml(q)}</li>`).join("")}
        </ul>
      </div>
    `
      : "";

  const bodyContent = `
    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 750; color: #15171c;">${lang === "en" ? "Interview Prep" : "Persiapan Wawancara"}: ${escapeHtml(data.role)} - ${escapeHtml(data.company)}</h2>
    <div style="padding: 16px; background-color: #eceef2; border-radius: 12px; margin-bottom: 24px; font-size: 15px; color: #15171c;">
      <strong style="color: #15171c;">${lang === "en" ? "Candidate Profile" : "Analisis Profil"}:</strong> ${escapeHtml(data.candidateSnapshot)}
    </div>
    <h3 style="margin: 0 0 14px 0; font-size: 17px; font-weight: 700; color: #15171c;">${lang === "en" ? "Practice Questions" : "Daftar Pertanyaan Latihan"}</h3>
    ${questionsHtml}
    ${askThemHtml}
  `;

  const textLines = [
    subject,
    "",
    `${lang === "en" ? "Candidate Profile" : "Profil"}: ${data.candidateSnapshot}`,
    "",
    lang === "en" ? "QUESTIONS:" : "PERTANYAAN:",
    ...data.questions.map(
      (q, idx) =>
        `#${idx + 1} [${q.category.toUpperCase()}] ${q.question}\n  ${lang === "en" ? "Why" : "Alasan"}: ${q.whyTailored}\n  Tips: ${q.answerTips}`
    ),
  ];

  if (data.questionsToAskThem && data.questionsToAskThem.length > 0) {
    textLines.push(
      "",
      lang === "en" ? "Questions You Should Ask Them:" : "Pertanyaan yang Perlu Kamu Tanyakan ke Pewawancara:",
      ...data.questionsToAskThem.map((q) => `- ${q}`)
    );
  }

  textLines.push("", "---", t.footer.disclaimer);

  return {
    subject,
    html: baseLayout(subject, bodyContent, lang),
    text: textLines.join("\n"),
  };
}
