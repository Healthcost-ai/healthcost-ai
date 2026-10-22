const express = require('express')
const rateLimit = require('express-rate-limit')
const { requireAuth } = require('../middleware/security')
const { createBill, listBills, getBill, deleteBill } = require('../controllers/billController')
const { explainBill } = require('../controllers/explanationController')

const router = express.Router()
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
router.get('/:id', getBill)
router.post('/:id/explanation', writeLimiter, explainBill)
router.delete('/:id', writeLimiter, deleteBill)

module.exports = router
