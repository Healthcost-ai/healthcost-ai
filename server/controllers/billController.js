
const mongoose = require('mongoose')
const Bill = require('../models/Bill')
const { validateBill } = require('../utils/validateBill')

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  })
}

// POST /api/bills
async function createBill(req, res, next) {
  try {
    const result = validateBill(req.body)

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: 'Bill validation failed',
        errors: result.errors,
      })
    }

    const patientLabel =
      req.body.patientLabel === undefined
        ? 'Test patient'
        : req.body.patientLabel

    if (
      typeof patientLabel !== 'string' ||
      patientLabel.trim().length === 0 ||
      patientLabel.length > 100
    ) {
      return sendError(res, 400, 'Invalid patient label')
    }

    const currency = req.body.currency || 'INR'
    const source = req.body.source || 'manual'

    if (!['INR', 'USD', 'GBP', 'EUR'].includes(currency)) {
      return sendError(res, 400, 'Unsupported currency')
    }

    if (!['synthetic', 'manual'].includes(source)) {
      return sendError(res, 400, 'Unsupported bill source')
    }

    const bill = await Bill.create({
      source,
      patientLabel: patientLabel.trim(),
      currency,
      items: result.checkedItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: result.calculatedSubtotal,
      tax: result.calculatedTax,
      total: result.calculatedTotal,
      validation: {
        isConsistent: result.isConsistent,
        discrepancies: result.discrepancies,
      },
      analysisStatus: 'completed',
    })

    return res.status(201).json({
      success: true,
      message: 'Bill analyzed and saved',
      bill,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/bills
async function getBills(req, res, next) {
  try {
    const bills = await Bill.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return res.json({
      success: true,
      count: bills.length,
      bills,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/bills/:id
async function getBillById(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid bill ID')
    }

    const bill = await Bill.findById(req.params.id).lean()

    if (!bill) {
      return sendError(res, 404, 'Bill not found')
    }

    return res.json({
      success: true,
      bill,
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/bills/:id
async function deleteBill(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid bill ID')
    }

    const bill = await Bill.findByIdAndDelete(req.params.id)

    if (!bill) {
      return sendError(res, 404, 'Bill not found')
    }

    return res.json({
      success: true,
      message: 'Bill deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/bills/test
// Creates a fixed synthetic bill for development testing.
async function createTestBill(req, res, next) {
  try {
    const testBill = {
      source: 'synthetic',
      patientLabel: 'Synthetic test patient',
      currency: 'INR',
      items: [
        {
          description: 'Consultation',
          quantity: 1,
          unitPrice: 500,
          lineTotal: 500,
        },
        {
          description: 'Blood test',
          quantity: 2,
          unitPrice: 250,
          lineTotal: 500,
        },
      ],
      subtotal: 1000,
      tax: 0,
      total: 1000,
    }

    req.body = testBill
    return createBill(req, res, next)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createBill,
  getBills,
  getBillById,
  deleteBill,
  createTestBill,
}
