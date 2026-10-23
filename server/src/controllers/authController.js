const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { OAuth2Client } = require('google-auth-library')
const User = require('../models/User')
const Session = require('../models/Session')
const { loadEnv } = require('../config/env')
const { randomToken, randomVerificationCode, hashToken } = require('../utils/tokens')
const { sendVerificationEmail } = require('../services/emailService')
const {
  REFRESH_COOKIE, setAuthCookies, clearAuthCookies, createAccessToken
} = require('../middleware/security')

function publicUser(user) {
  return { id: String(user._id), email: user.email, emailVerified: user.emailVerified }
}

function parseRefresh(req) {
  return req.cookies[REFRESH_COOKIE]
}

async function sendVerification(user, env) {
  const verificationToken = randomVerificationCode()
  user.verificationTokenHash = hashToken(verificationToken)
  user.verificationExpiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await user.save()

  const frontendUrl = env.APP_BASE_URL.replace(/\/$/, '')
  const verificationUrl = `${frontendUrl}/?token=${encodeURIComponent(verificationToken)}`
  await sendVerificationEmail(user.email, verificationUrl, verificationToken)
}

async function createSession(user, req, res) {
  const env = loadEnv()
  const refreshToken = randomToken()
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000)
  await Session.create({
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent: req.get('user-agent') || ''
  })
  const accessToken = createAccessToken(user, env)
  setAuthCookies(res, accessToken, refreshToken, env)
}

async function register(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = req.body.password
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' })
    }
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Password must be 12–128 characters' })
    }
    const env = loadEnv()
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      if (!existingUser.emailVerified) await sendVerification(existingUser, env)
      return res.status(202).json({ success: true, message: 'If this address can be registered, verification instructions will be sent' })
    }
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS)
    const user = await User.create({
      email,
      passwordHash,
      emailVerified: false
    })
    await sendVerification(user, env)
    return res.status(202).json({ success: true, message: 'If this address can be registered, verification instructions will be sent' })
  } catch (error) {
    if (error.code === 11000) {
      const email = String(req.body.email || '').trim().toLowerCase()
      const user = await User.findOne({ email })
      if (user && !user.emailVerified) {
        try {
          await sendVerification(user, loadEnv())
          return res.status(202).json({ success: true, message: 'If this address can be registered, verification instructions will be sent' })
        } catch (sendError) {
          return next(sendError)
        }
      }
      return res.status(202).json({ success: true, message: 'If this address can be registered, verification instructions will be sent' })
    }
    next(error)
  }
}

async function resendVerification(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' })
    }

    const user = await User.findOne({ email })
    if (user && !user.emailVerified) await sendVerification(user, loadEnv())
    return res.status(202).json({ success: true, message: 'If this address needs verification, instructions will be sent' })
  } catch (error) { next(error) }
}

async function verifyEmail(req, res, next) {
  try {
    const token = String(req.body.token || '')
    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'Enter the six-digit verification code' })
    }
    const user = await User.findOne({
      verificationTokenHash: hashToken(token),
      verificationExpiresAt: { $gt: new Date() }
    }).select('+verificationTokenHash +verificationExpiresAt')
    if (!user) return res.status(400).json({ success: false, message: 'Verification link is invalid or expired' })
    user.emailVerified = true
    user.verificationTokenHash = undefined
    user.verificationExpiresAt = undefined
    await user.save()
    return res.json({ success: true, message: 'Email verified. You can now sign in.' })
  } catch (error) { next(error) }
}

async function login(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = req.body.password
    const user = await User.findOne({ email }).select('+passwordHash')
    const valid = user && user.passwordHash
      ? await bcrypt.compare(typeof password === 'string' ? password : '', user.passwordHash)
      : false
    if (!valid || user.disabledAt || !user.emailVerified) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or email not verified' })
    }
    user.lastLoginAt = new Date()
    await user.save()
    await createSession(user, req, res)
    return res.json({ success: true, user: publicUser(user) })
  } catch (error) { next(error) }
}

async function googleLogin(req, res, next) {
  try {
    const env = loadEnv()
    if (!env.GOOGLE_CLIENT_ID) return res.status(503).json({ success: false, message: 'Google sign-in is not configured' })
    const credential = req.body.credential
    if (typeof credential !== 'string' || credential.length > 10000) {
      return res.status(400).json({ success: false, message: 'Google credential is required' })
    }
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ success: false, message: 'Google account could not be verified' })
    }
    const email = payload.email.toLowerCase()
    let user = await User.findOne({ googleSub: payload.sub }).select('+googleSub')
    if (!user) {
      // Do not silently link a Google identity to an existing password account.
      const existing = await User.findOne({ email })
      if (existing) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists. Sign in using its original method first.' })
      }
      user = await User.create({ email, googleSub: payload.sub, emailVerified: true })
    }
    if (user.disabledAt) return res.status(403).json({ success: false, message: 'Account is disabled' })
    user.lastLoginAt = new Date()
    await user.save()
    await createSession(user, req, res)
    return res.json({ success: true, user: publicUser(user) })
  } catch (error) { next(error) }
}

async function refresh(req, res, next) {
  try {
    const env = loadEnv()
    const token = parseRefresh(req)
    if (!token) return res.status(401).json({ success: false, message: 'Refresh session required' })
    const oldHash = hashToken(token)
    const session = await Session.findOne({ refreshTokenHash: oldHash }).select('+refreshTokenHash')
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      clearAuthCookies(res, env)
      return res.status(401).json({ success: false, message: 'Refresh session expired; sign in again' })
    }
    const user = await User.findById(session.userId)
    if (!user || user.disabledAt || !user.emailVerified) {
      session.revokedAt = new Date()
      await session.save()
      clearAuthCookies(res, env)
      return res.status(401).json({ success: false, message: 'Refresh session is no longer valid' })
    }
    // Rotate refresh token: revoke old session and create a new one.
    session.revokedAt = new Date()
    await session.save()
    await createSession(user, req, res)
    return res.json({ success: true, user: publicUser(user) })
  } catch (error) { next(error) }
}

async function logout(req, res, next) {
  try {
    const env = loadEnv()
    const token = parseRefresh(req)
    if (token) {
      await Session.updateOne(
        { refreshTokenHash: hashToken(token), revokedAt: null },
        { $set: { revokedAt: new Date() } }
      )
    }
    clearAuthCookies(res, env)
    return res.json({ success: true, message: 'Signed out' })
  } catch (error) { next(error) }
}

async function logoutAll(req, res, next) {
  try {
    await Session.updateMany({ userId: req.user._id, revokedAt: null }, { $set: { revokedAt: new Date() } })
    clearAuthCookies(res, loadEnv())
    return res.json({ success: true, message: 'All sessions signed out' })
  } catch (error) { next(error) }
}

async function me(req, res) {
  return res.json({ success: true, user: publicUser(req.user) })
}

module.exports = { register, resendVerification, verifyEmail, login, googleLogin, refresh, logout, logoutAll, me }
