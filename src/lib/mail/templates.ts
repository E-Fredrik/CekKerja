export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f6f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
    <tr>
      <td style="padding: 24px 32px; background-color: #0d2c78; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">CekKerja</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        ${bodyContent}
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p style="margin: 0 0 8px 0;">CekKerja memberikan informasi untuk membantu kamu memahami dokumen kerja. Ini bukan nasihat hukum.</p>
        <p style="margin: 0;">Email ini dikirim otomatis ke akun kamu sendiri. Jangan balas email ini.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function verdictBadge(verdict: "red" | "yellow" | "green"): string {
  const styles = {
    red: "background-color: #fef2f2; color: #d21f2c; border: 1px solid #fee2e2;",
    yellow: "background-color: #fffbeb; color: #b45309; border: 1px solid #fef3c7;",
    green: "background-color: #f0fdf4; color: #12884e; border: 1px solid #dcfce7;",
  };
  const labels = {
    red: "Perlu Diwaspadai",
    yellow: "Perhatikan",
    green: "Sesuai Aturan",
  };
  return `<span style="display: inline-block; padding: 2px 10px; font-size: 12px; font-weight: 600; border-radius: 9999px; ${styles[verdict]}">${labels[verdict]}</span>`;
}

export interface ContractEmailData {
  contractType: string;
  summary: string;
  clauses: Array<{
    title: string;
    text: string;
    verdict: "red" | "yellow" | "green";
    ruleId: string;
    explanation: string;
    questionToAsk?: string;
  }>;
  negotiationMessage?: string;
}

export function contractResultTemplate(data: ContractEmailData): { subject: string; html: string; text: string } {
  const subject = `Hasil Analisis Kontrak Kerja (${escapeHtml(data.contractType)}) - CekKerja`;

  const clausesHtml = data.clauses
    .map(
      (c) => `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 15px; color: #111827;">${escapeHtml(c.title)}</strong>
          ${verdictBadge(c.verdict)}
        </div>
        <blockquote style="margin: 8px 0; padding: 8px 12px; background-color: #f9fafb; border-left: 3px solid #cbd5e1; font-size: 13px; color: #475569; font-style: italic;">
          "${escapeHtml(c.text)}"
        </blockquote>
        <p style="margin: 8px 0; font-size: 13px; color: #374151;">${escapeHtml(c.explanation)}</p>
        ${
          c.questionToAsk
            ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #1d4ed8;"><strong>Tanya ke HR:</strong> ${escapeHtml(c.questionToAsk)}</p>`
            : ""
        }
      </div>
    `
    )
    .join("");

  const negotiationHtml = data.negotiationMessage
    ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;">
        <strong style="color: #1e40af; font-size: 14px; display: block; margin-bottom: 6px;">Draf Pesan Negosiasi HR:</strong>
        <p style="margin: 0; font-size: 13px; color: #1e3a8a; white-space: pre-wrap;">${escapeHtml(data.negotiationMessage)}</p>
      </div>
    `
    : "";

  const bodyContent = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #111827;">Ringkasan Pemeriksaan Kontrak</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563;">Jenis Kontrak: <strong>${escapeHtml(data.contractType)}</strong></p>
    <div style="padding: 14px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #374151;">
      ${escapeHtml(data.summary)}
    </div>
    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Temuan Klausul</h3>
    ${clausesHtml}
    ${negotiationHtml}
  `;

  const textLines = [
    `Hasil Analisis Kontrak Kerja (${data.contractType}) - CekKerja`,
    "",
    `Jenis: ${data.contractType}`,
    `Ringkasan: ${data.summary}`,
    "",
    "KLAUSUL:",
    ...data.clauses.map(
      (c) =>
        `- [${c.verdict.toUpperCase()}] ${c.title}\n  Teks: "${c.text}"\n  Penjelasan: ${c.explanation}${c.questionToAsk ? `\n  Tanya HR: ${c.questionToAsk}` : ""}`
    ),
  ];

  if (data.negotiationMessage) {
    textLines.push("", `Draf Pesan Negosiasi HR:\n${data.negotiationMessage}`);
  }

  textLines.push("", "---", "CekKerja memberikan informasi untuk membantu kamu memahami dokumen kerja. Ini bukan nasihat hukum.");

  return {
    subject,
    html: baseLayout(subject, bodyContent),
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
    questionToAsk: string;
  }>;
  inclusiveRewrite?: string;
}

export function jobAdResultTemplate(data: JobAdEmailData): { subject: string; html: string; text: string } {
  const subject = `Hasil Analisis Lowongan: ${escapeHtml(data.role)} di ${escapeHtml(data.company)} - CekKerja`;

  const flagsHtml = data.flags
    .map(
      (f) => `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 14px; color: #111827;">Temuan Lowongan</strong>
          ${verdictBadge(f.verdict)}
        </div>
        <blockquote style="margin: 8px 0; padding: 8px 12px; background-color: #f9fafb; border-left: 3px solid #cbd5e1; font-size: 13px; color: #475569; font-style: italic;">
          "${escapeHtml(f.quote)}"
        </blockquote>
        <p style="margin: 8px 0; font-size: 13px; color: #374151;">${escapeHtml(f.explanation)}</p>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #1d4ed8;"><strong>Tanya ke Perekrut:</strong> ${escapeHtml(f.questionToAsk)}</p>
      </div>
    `
    )
    .join("");

  const rewriteHtml = data.inclusiveRewrite
    ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;">
        <strong style="color: #166534; font-size: 14px; display: block; margin-bottom: 6px;">Saran Versi Inklusif:</strong>
        <p style="margin: 0; font-size: 13px; color: #14532d; white-space: pre-wrap;">${escapeHtml(data.inclusiveRewrite)}</p>
      </div>
    `
    : "";

  const bodyContent = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #111827;">${escapeHtml(data.role)} - ${escapeHtml(data.company)}</h2>
    <div style="padding: 14px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #374151;">
      ${escapeHtml(data.summary)}
    </div>
    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Temuan Poin Lowongan</h3>
    ${flagsHtml}
    ${rewriteHtml}
  `;

  const textLines = [
    `Hasil Analisis Lowongan: ${data.role} di ${data.company} - CekKerja`,
    "",
    `Ringkasan: ${data.summary}`,
    "",
    "TEMUAN:",
    ...data.flags.map(
      (f) =>
        `- [${f.verdict.toUpperCase()}]\n  Kutipan: "${f.quote}"\n  Penjelasan: ${f.explanation}\n  Tanya Perekrut: ${f.questionToAsk}`
    ),
  ];

  if (data.inclusiveRewrite) {
    textLines.push("", `Saran Versi Inklusif:\n${data.inclusiveRewrite}`);
  }

  textLines.push("", "---", "CekKerja memberikan informasi untuk membantu kamu memahami dokumen kerja. Ini bukan nasihat hukum.");

  return {
    subject,
    html: baseLayout(subject, bodyContent),
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
}

export function interviewPrepTemplate(data: InterviewEmailData): { subject: string; html: string; text: string } {
  const subject = `Latihan Wawancara: ${escapeHtml(data.role)} di ${escapeHtml(data.company)} - CekKerja`;

  const questionsHtml = data.questions
    .map(
      (q, idx) => `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">#${idx + 1} • ${escapeHtml(q.category)}</span>
          <h4 style="margin: 4px 0 0 0; font-size: 15px; color: #111827;">${escapeHtml(q.question)}</h4>
        </div>
        <p style="margin: 8px 0; font-size: 13px; color: #4b5563;"><strong>Mengapa ditanyakan:</strong> ${escapeHtml(q.whyTailored)}</p>
        <div style="padding: 10px 12px; background-color: #f3f4f6; border-radius: 8px; font-size: 13px; color: #1f2937;">
          <strong>Tips Menjawab:</strong> ${escapeHtml(q.answerTips)}
        </div>
      </div>
    `
    )
    .join("");

  const askThemHtml =
    data.questionsToAskThem && data.questionsToAskThem.length > 0
      ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;">
        <strong style="color: #1e40af; font-size: 14px; display: block; margin-bottom: 8px;">Pertanyaan yang Perlu Kamu Tanyakan ke Pewawancara:</strong>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e3a8a;">
          ${data.questionsToAskThem.map((q) => `<li style="margin-bottom: 6px;">${escapeHtml(q)}</li>`).join("")}
        </ul>
      </div>
    `
      : "";

  const bodyContent = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #111827;">Persiapan Wawancara: ${escapeHtml(data.role)} di ${escapeHtml(data.company)}</h2>
    <div style="padding: 14px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #374151;">
      <strong>Analisis Profil:</strong> ${escapeHtml(data.candidateSnapshot)}
    </div>
    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Daftar Pertanyaan Latihan</h3>
    ${questionsHtml}
    ${askThemHtml}
  `;

  const textLines = [
    `Latihan Wawancara: ${data.role} di ${data.company} - CekKerja`,
    "",
    `Profil: ${data.candidateSnapshot}`,
    "",
    "PERTANYAAN:",
    ...data.questions.map(
      (q, idx) =>
        `#${idx + 1} [${q.category.toUpperCase()}] ${q.question}\n  Alasan: ${q.whyTailored}\n  Tips: ${q.answerTips}`
    ),
  ];

  if (data.questionsToAskThem && data.questionsToAskThem.length > 0) {
    textLines.push("", "Pertanyaan yang Perlu Kamu Tanyakan ke Pewawancara:", ...data.questionsToAskThem.map((q) => `- ${q}`));
  }

  textLines.push("", "---", "CekKerja memberikan informasi untuk membantu kamu memahami dokumen kerja. Ini bukan nasihat hukum.");

  return {
    subject,
    html: baseLayout(subject, bodyContent),
    text: textLines.join("\n"),
  };
}
