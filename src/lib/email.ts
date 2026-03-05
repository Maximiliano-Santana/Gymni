import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set, skipping email to ${to}: "${subject}"`);
    return;
  }

  // Skip fake/test emails to avoid wasting sends and hitting rate limits
  const domain = to.split("@")[1]?.toLowerCase();
  const skipDomains = ["test.com", "example.com", "fake.com", "mail.com"];
  if (domain && skipDomains.includes(domain)) {
    console.warn(`[email] Skipping test email to ${to}: "${subject}"`);
    return;
  }

  return resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Gymni <noreply@gymni.app>",
    to,
    subject,
    react,
  });
}
