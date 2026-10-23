const express = require('express')
const rateLimit = require('express-rate-limit')
const { requireAuth } = require('../middleware/security')
const {
  createSavingsRecord,
  deleteSavingsRecord,
  listSavingsRecords
} = require('../controllers/savingsController')

const router = express.Router()
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again shortly.' }
})

router.use(requireAuth)
router.get('/', listSavingsRecords)
router.post('/', writeLimiter, createSavingsRecord)
router.delete('/:id', writeLimiter, deleteSavingsRecord)

module.exports = router
