
const nodemailer = require("nodemailer");

require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function verifySmtpConnection() {
  return transporter.verify();
}

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error("SMTP credentials are missing");
  }

  if (!to || !subject || (!text && !html)) {
    throw new Error("Recipient, subject, and message are required");
  }

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

async function sendVerificationEmail(to, verificationUrl, verificationToken) {
  return sendEmail({
    to,
    subject: "Verify your HealthCost AI account",
    text: `Welcome to HealthCost AI!\n\nYour verification token is:\n${verificationToken}\n\nOr verify your email here:\n${verificationUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Welcome to HealthCost AI</h2>
        <p>Please verify your email address.</p>
        <a href="${verificationUrl}">Verify my email</a>
        <p>Or enter this verification token in the app:</p>
        <p><code>${verificationToken}</code></p>
      </div>
    `,
  });
}

module.exports = {
  verifySmtpConnection,
  sendEmail,
  sendVerificationEmail,
};
