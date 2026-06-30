import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

const FROM = process.env.EMAIL_FROM || "noreply@conduit.app";

export async function sendPasswordResetEmail({
  email,
  name,
  url,
}: {
  email: string;
  name: string;
  url: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Conduit password",
    html: `
      <p>Hello ${name},</p>
      <p>You requested a password reset.</p>
      <p><a href="${url}">Click here to reset your password</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}
