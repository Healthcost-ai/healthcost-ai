
require("dotenv").config();

const {
  verifySmtpConnection,
  sendEmail,
} = require("../services/emailService");

async function main() {
  await verifySmtpConnection();
  console.log("SMTP connection successful.");

  await sendEmail({
    to: process.env.SMTP_USER,
    subject: "HealthCost AI test email",
    text: "Your SMTP email service is working!",
    html: "<h2>HealthCost AI</h2><p>Your SMTP email service is working!</p>",
  });

  console.log("Email sent successfully.");
}

main().catch((error) => {
  console.error("Email failed:", error.message);
  process.exitCode = 1;
});
