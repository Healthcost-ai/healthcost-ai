const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique :true ,lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, select: false },
  googleSub: { type: String, sparse: true, select: false ,unique :true},
  emailVerified: { type: Boolean, default: false },
  verificationTokenHash: { type: String, select: false },
  verificationExpiresAt: { type: Date, select: false },
  disabledAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false })


module.exports = mongoose.model('User', userSchema)
