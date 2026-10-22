
const express = require('express')

const {
  createBill,
  getBills,
  getBillById,
  deleteBill,
  createTestBill,
} = require('../controllers/billController')

const router = express.Router()

router.post('/test', createTestBill)
router.post('/', createBill)
router.get('/', getBills)
router.get('/:id', getBillById)
router.delete('/:id', deleteBill)

module.exports = router
