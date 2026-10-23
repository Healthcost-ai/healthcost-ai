const mongoose = require('mongoose')

const savingsRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recordType: { type: String, enum: ['confirmed', 'cghs_comparison'], required: true },
  title: { type: String, required: true, maxlength: 300 },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['INR', 'USD', 'GBP', 'EUR'], required: true },
  referenceAmount: { type: Number, default: null, min: 0 },
  rateCategory: { type: String, default: null, maxlength: 120 },
  cghsCode: { type: String, default: null, maxlength: 40 }
}, { timestamps: true, versionKey: false })

savingsRecordSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('SavingsRecord', savingsRecordSchema)
