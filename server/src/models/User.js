const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, select: false },
  googleSub: { type: String, unique: true, sparse: true, select: false },
  emailVerified: { type: Boolean, default: false },
  verificationTokenHash: { type: String, select: false },
  verificationExpiresAt: { type: Date, select: false },
  disabledAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false })

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ googleSub: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('User', userSchema)
