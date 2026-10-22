const express = require('express')
const rateLimit = require('express-rate-limit')
const auth = require('../controllers/authController')
const { requireAuth } = require('../middleware/security')

const router = express.Router()
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Try again later.' }
})

router.post('/register', authLimiter, auth.register)
router.post('/verify-email', authLimiter, auth.verifyEmail)
router.post('/login', authLimiter, auth.login)
router.post('/google', authLimiter, auth.googleLogin)
router.post('/refresh', authLimiter, auth.refresh)
router.post('/logout', auth.logout)
router.post('/logout-all', requireAuth, auth.logoutAll)
router.get('/me', requireAuth, auth.me)

module.exports = router
