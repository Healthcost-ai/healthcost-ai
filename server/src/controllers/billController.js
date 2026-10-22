const mongoose = require('mongoose')
const Bill = require('../models/Bill')
const { validateBill } = require('../utils/validateBill')

function serializeBill(bill) {
  return {
    id: String(bill._id),
    patientLabel: bill.patientLabel,
    currency: bill.currency,
    items: bill.items,
    subtotal: bill.subtotal,
    tax: bill.tax,
    total: bill.total,
    validation: bill.validation,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt
  }
}

async function createBill(req, res, next) {
  try {
    const result = validateBill(req.body)
    if (!result.valid) {
      return res.status(400).json({ success: false, message: 'Bill validation failed', errors: result.errors })
    }
    const bill = await Bill.create({
      userId: req.user._id,
      patientLabel: result.patientLabel,
      currency: result.currency,
      items: result.items,
      subtotal: result.calculatedSubtotal,
      tax: result.tax,
      total: result.calculatedTotal,
      validation: { isConsistent: result.isConsistent, discrepancies: result.discrepancies }
    })
    return res.status(201).json({ success: true, bill: serializeBill(bill) })
  } catch (error) { next(error) }
}

async function listBills(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50)
    const bills = await Bill.find({ userId: req.user._id })
      .select('-aiExplanation')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    return res.json({ success: true, bills: bills.map(b => ({ ...b, id: String(b._id), _id: undefined, userId: undefined })) })
  } catch (error) { next(error) }
}

async function getBill(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid bill ID' })
    }
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' })
    return res.json({ success: true, bill: { ...bill, id: String(bill._id), _id: undefined, userId: undefined } })
  } catch (error) { next(error) }
}

async function deleteBill(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid bill ID' })
    }
    const deleted = await Bill.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!deleted) return res.status(404).json({ success: false, message: 'Bill not found' })
    return res.json({ success: true, message: 'Bill deleted' })
  } catch (error) { next(error) }
}

module.exports = { createBill, listBills, getBill, deleteBill }
