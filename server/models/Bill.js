
const mongoose = require('mongoose')

const billItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      max: 100000000,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000000,
    },
  },
  { _id: false }
)

const billSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['synthetic', 'manual'],
      default: 'manual',
    },
    patientLabel: {
      type: String,
      default: 'Test patient',
      maxlength: 100,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'GBP', 'EUR'],
    },
    items: {
      type: [billItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0 && items.length <= 500,
        message: 'A bill must contain between 1 and 500 items',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    validation: {
      isConsistent: {
        type: Boolean,
        default: false,
      },
      discrepancies: {
        type: [String],
        default: [],
      },
    },
    analysisStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Bill', billSchema)
