const mongoose = require('mongoose')

async function connectDB(uri) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: process.env.NODE_ENV !== 'production'
  })
  return mongoose.connection
}

module.exports = { connectDB }
