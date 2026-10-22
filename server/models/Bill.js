
const mongoose = require('mongoose')

const billItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
)

const billSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['synthetic', 'uploaded'],
      default: 'synthetic',
    },
    patientLabel: {
      type: String,
      default: 'Test patient',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    items: {
      type: [billItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Bill', billSchema)
