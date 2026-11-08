import nodemailer from "nodemailer";

export interface MailPayload {
  subject: string;
  html: string;
  text?: string;
}

export function createMailerTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured");
  }

  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendMail(to: string, mail: MailPayload): Promise<{ messageId: string }> {
  const transport = createMailerTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const info = await transport.sendMail({
    from,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return { messageId: info.messageId };
}
