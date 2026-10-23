const express = require('express')
const rateLimit = require('express-rate-limit')
const multer = require('multer')
const { requireAuth } = require('../middleware/security')
const { createBill, listBills, getBill, deleteBill } = require('../controllers/billController')
const { explainBill } = require('../controllers/explanationController')
const { analyzeBillUpload } = require('../controllers/uploadController')

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2 },
})
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again shortly.' }
})

router.use(requireAuth)
router.get('/', listBills)
router.post('/', writeLimiter, createBill)
router.post('/analyze-upload', writeLimiter, upload.single('bill'), analyzeBillUpload)
router.get('/:id', getBill)
router.post('/:id/explanation', writeLimiter, explainBill)
router.delete('/:id', writeLimiter, deleteBill)

module.exports = router
