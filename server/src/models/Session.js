const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  refreshTokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
  userAgent: { type: String, maxlength: 500 },
  createdIpHash: { type: String, maxlength: 128 }
}, { timestamps: true, versionKey: false })

module.exports = mongoose.model('Session', sessionSchema)
