import nodemailer from "nodemailer";

const developerEmail = "emilyerskine2002@gmail.com";

function gmailConfig() {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "");
  return user && pass ? { user, pass } : null;
}

export function isDeveloperEmailConfigured(): boolean {
  return Boolean(gmailConfig());
}

export async function emailDeveloper({ subject, text }: { subject: string; text: string }) {
  const config = gmailConfig();
  if (!config) throw new Error("Developer email is not configured.");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: config,
  });
  await transporter.sendMail({
    from: `Marginalia <${config.user}>`,
    to: developerEmail,
    replyTo: config.user,
    subject,
    text,
  });
}
