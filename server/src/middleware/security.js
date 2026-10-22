const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const { loadEnv } = require('../config/env')
const { safeEqualText } = require('../utils/tokens')
const User = require('../models/User')

const ACCESS_COOKIE = 'hc_access'
const REFRESH_COOKIE = 'hc_refresh'
const CSRF_COOKIE = 'hc_csrf'

function cookieOptions(env, maxAge) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    path: '/',
    ...(maxAge ? { maxAge } : {})
  }
}

function csrfValue(secret, env) {
  return crypto.createHmac('sha256', env.CSRF_HMAC_SECRET).update(secret).digest('hex')
}

function issueCsrf(req, res) {
  const env = loadEnv()
  let secret = req.cookies[CSRF_COOKIE]
  if (!secret) {
    secret = crypto.randomBytes(32).toString('base64url')
    res.cookie(CSRF_COOKIE, secret, cookieOptions(env))
  }
  res.set('Cache-Control', 'no-store')
  return res.json({ csrfToken: csrfValue(secret, env) })
}

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const env = loadEnv()
  const origin = req.get('origin')
  if (origin && origin !== env.CLIENT_ORIGIN) {
    return res.status(403).json({ success: false, message: 'Request origin not allowed' })
  }
  const secret = req.cookies[CSRF_COOKIE]
  const submitted = req.get('x-csrf-token')
  if (!secret || !submitted || !safeEqualText(submitted, csrfValue(secret, env))) {
    return res.status(403).json({ success: false, message: 'CSRF validation failed; refresh your security token' })
  }
  next()
}

function setAuthCookies(res, accessToken, refreshToken, env) {
  const refreshMs = env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...cookieOptions(env),
    maxAge: 10 * 60 * 1000
  })
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions(env, refreshMs)
  })
  res.set('Cache-Control', 'no-store')
}

function clearAuthCookies(res, env) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    res.clearCookie(name, { ...cookieOptions(env), maxAge: undefined })
  }
}

function createAccessToken(user, env) {
  return jwt.sign(
    { sub: String(user._id), emailVerified: user.emailVerified },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL, issuer: 'healthcost-ai', audience: 'healthcost-ai-web' }
  )
}

async function requireAuth(req, res, next) {
  try {
    const env = loadEnv()
    const token = req.cookies[ACCESS_COOKIE]
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' })
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'healthcost-ai',
      audience: 'healthcost-ai-web'
    })
    const user = await User.findById(payload.sub).select('_id email emailVerified disabledAt')
    if (!user || user.disabledAt) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }
}

module.exports = {
  ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE, issueCsrf, csrfProtection,
  setAuthCookies, clearAuthCookies, createAccessToken, requireAuth
}
