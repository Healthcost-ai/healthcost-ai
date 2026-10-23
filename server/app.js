const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const pinoHttp = require('pino-http')
const pino = require('pino')
const multer = require('multer')
const mongoose = require('mongoose')
const authRoutes = require('./src/routes/authRoutes')
const billRoutes = require('./src/routes/billRoutes')
const treatmentPriceRoutes = require('./src/routes/treatmentPriceRoutes')
const savingsRoutes = require('./src/routes/savingsRoutes')
const { loadEnv } = require('./src/config/env')
const { issueCsrf, csrfProtection } = require('./src/middleware/security')

function createApp() {
  const env = loadEnv()
  const app = express()
  const logger = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' })

  if (env.TRUST_PROXY !== '0') app.set('trust proxy', Number(env.TRUST_PROXY) || 1)
  app.disable('x-powered-by')
  app.use(pinoHttp({
    logger,
    redact: {
      paths: ['req.headers.cookie', 'req.headers.authorization', 'req.body.password', 'req.body.credential', 'res.headers["set-cookie"]'],
      censor: '[REDACTED]'
    },
    customLogLevel: (res, err) => err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
  }))
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: false
  }))
  app.use(cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token']
  }))
  app.use(express.json({ limit: '100kb', strict: true }))
  app.use(cookieParser())
  app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Try again shortly.' }
  }))

  app.get('/api/health/live', (req, res) => res.json({ success: true, status: 'live' }))
  app.get('/api/health/ready', (req, res) => {
    const ready = mongoose.connection.readyState === 1
    res.status(ready ? 200 : 503).json({ success: ready, status: ready ? 'ready' : 'not_ready' })
  })

  app.get('/api/auth/csrf', issueCsrf)
  app.use('/api', csrfProtection)
  app.use('/api/auth', authRoutes)
  app.use('/api/bills', billRoutes)
  app.use('/api/treatment-prices', treatmentPriceRoutes)
  app.use('/api/savings', savingsRoutes)

  app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found' }))

  app.use((err, req, res, next) => {
    req.log?.error({ err: { name: err.name, message: err.message } }, 'Request failed')
    if (res.headersSent) return next(err)
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Bill files must be 8 MB or smaller'
        : 'Upload one PDF, JPG, or PNG bill file'
      return res.status(status).json({ success: false, message })
    }
    if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Request body is too large' })
    if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ success: false, message: 'Invalid JSON body' })
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A conflicting record already exists' })
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' })
  })

  return app
}

module.exports = { createApp }
