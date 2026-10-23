const nodemailer = require('nodemailer')
const { loadEnv } = require('../config/env')

let transporter

function getTransporter() {
  if (transporter) return transporter
  const env = loadEnv()
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    if (env.NODE_ENV === 'production') throw new Error('Email delivery is not configured')
    return null
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
  })
  return transporter
}
async function verifyEmailTransport() {
  const transport = getTransporter()

  if (!transport) {
    console.log('SMTP is not configured; using development fallback')
    return
  }

  await transport.verify()
  console.log('SMTP connection and authentication verified')
}
async function sendVerificationEmail(email, token) {
  const env = loadEnv()
  const transport = getTransporter()
  const url = `${env.APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`
  if (!transport) {
    // In development only, the link is logged for local testing.
    console.info(`Development email verification link for ${email}: ${url}`)
    return
  }
  await transport.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Verify your HealthCost AI email',
    text: `Verify your email by opening this link: ${url}\nIf you did not create this account, ignore this message.`,
    html: `<p>Verify your HealthCost AI email.</p><p><a href="${url}">Verify email</a></p><p>If you did not create this account, ignore this message.</p>`
  })
}

module.exports = { sendVerificationEmail }
module.exports = {
  sendVerificationEmail,
  verifyEmailTransport
}
