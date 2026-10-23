const mongoose = require('mongoose')
const { z } = require('zod')
const SavingsRecord = require('../models/SavingsRecord')

const confirmedRecordSchema = z.object({
  recordType: z.literal('confirmed'),
  title: z.string().trim().min(1).max(200),
  amount: z.number().finite().positive().max(1_000_000_000),
  currency: z.enum(['INR', 'USD', 'GBP', 'EUR'])
}).strict()

const comparisonRecordSchema = z.object({
  recordType: z.literal('cghs_comparison'),
  title: z.string().trim().min(1).max(300),
  amount: z.number().finite().nonnegative().max(1_000_000_000),
  currency: z.literal('INR'),
  referenceAmount: z.number().finite().nonnegative().max(1_000_000_000),
  rateCategory: z.string().trim().min(1).max(120),
  cghsCode: z.string().trim().max(40).optional().default('')
}).strict()

function serialize(record) {
  return {
    id: String(record._id),
    recordType: record.recordType,
    title: record.title,
    amount: record.amount,
    currency: record.currency,
    referenceAmount: record.referenceAmount,
    rateCategory: record.rateCategory,
    cghsCode: record.cghsCode,
    createdAt: record.createdAt
  }
}

async function listSavingsRecords(req, res, next) {
  try {
    const records = await SavingsRecord.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
    return res.json({ success: true, records: records.map(record => ({ ...serialize(record), id: String(record._id) })) })
  } catch (error) {
    return next(error)
  }
}

async function createSavingsRecord(req, res, next) {
  const parsed = req.body?.recordType === 'cghs_comparison'
    ? comparisonRecordSchema.safeParse(req.body)
    : confirmedRecordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Enter valid savings record details.' })
  }

  try {
    const record = await SavingsRecord.create({ ...parsed.data, userId: req.user._id })
    return res.status(201).json({ success: true, record: serialize(record) })
  } catch (error) {
    return next(error)
  }
}

async function deleteSavingsRecord(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid savings record ID.' })
  }
  try {
    const deleted = await SavingsRecord.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!deleted) return res.status(404).json({ success: false, message: 'Savings record not found.' })
    return res.json({ success: true })
  } catch (error) {
    return next(error)
  }
}

module.exports = { createSavingsRecord, deleteSavingsRecord, listSavingsRecords }
