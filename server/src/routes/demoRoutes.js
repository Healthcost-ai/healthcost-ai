const express = require('express')
const rateLimit = require('express-rate-limit')
const multer = require('multer')
const { loadEnv } = require('../config/env')
const { analyzeBillUpload } = require('../controllers/uploadController')

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2 },
})
const demoUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'The local demo upload limit has been reached. Try again later.' },
})

router.post('/analyze-upload', demoUploadLimiter, (req, res, next) => {
  if (loadEnv().NODE_ENV !== 'development') {
    return res.status(404).json({ success: false, message: 'Demo upload analysis is available only in local development' })
  }
  const address = req.socket.remoteAddress
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
    return res.status(404).json({ success: false, message: 'Demo uploads are available only from this computer' })
  }
  return next()
}, upload.single('bill'), analyzeBillUpload)

module.exports = router
