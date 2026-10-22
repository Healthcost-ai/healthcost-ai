const mongoose = require('mongoose')

const billItemSchema = new mongoose.Schema({
  description: { type: String, required: true, maxlength: 300 },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  submittedLineTotal: { type: Number, required: true, min: 0 },
  calculatedLineTotal: { type: Number, required: true, min: 0 }
}, { _id: false })

const billSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patientLabel: { type: String, required: true, maxlength: 100 },
  currency: { type: String, enum: ['INR', 'USD', 'GBP', 'EUR'], required: true },
  items: { type: [billItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  validation: {
    isConsistent: { type: Boolean, required: true },
    discrepancies: { type: [String], default: [] }
  },
  aiExplanation: { type: String, maxlength: 10000, default: null },
  aiExplainedAt: { type: Date, default: null },
  aiProcessingConsentAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false })

billSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Bill', billSchema)
