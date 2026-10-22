
const express = require('express')
const Bill = require('../models/Bill')

const router = express.Router()

// Create a synthetic bill record.
router.post('/test', async (req, res) => {
  try {
    if (mongooseUnavailable()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected',
      })
    }

    const items = [
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
    ]

    // Validate arithmetic in code, not with AI.
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )

    const tax = 0
    const total = subtotal + tax

    const bill = await Bill.create({
      source: 'synthetic',
      patientLabel: 'Synthetic test patient',
      currency: 'INR',
      items,
      subtotal,
      tax,
      total,
    })

    res.status(201).json({
      success: true,
      message: 'Synthetic bill saved successfully',
      bill,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not save the test bill',
    })
  }
})

// Retrieve recent bills.
router.get('/', async (req, res) => {
  try {
    const bills = await Bill.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    res.json({
      success: true,
      bills,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not retrieve bills',
    })
  }
})

// Check the current database connection.
function mongooseUnavailable() {
  return require('mongoose').connection.readyState !== 1
}

module.exports = router
