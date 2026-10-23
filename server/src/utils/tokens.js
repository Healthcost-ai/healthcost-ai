const crypto = require('node:crypto')

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

function randomVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

module.exports = { randomToken, randomVerificationCode, hashToken, safeEqualText }
