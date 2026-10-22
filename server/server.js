
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const billRoutes = require('./routes/bills')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/api/bills', billRoutes)

// Basic API route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'HealthCost AI backend is running',
    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
  })
})

// Friendly response for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  })
})

// Start the server even if MongoDB is not configured yet.
app.listen(PORT, () => {
  console.log(`HealthCost AI server running on port ${PORT}`)
})

// Connect to MongoDB when a connection string is available.
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected successfully')
    })
    .catch((error) => {
      console.error('MongoDB connection failed:', error.message)
    })
} else {
  console.log(
    'MongoDB URI not configured yet. API is running without a database.'
  )
}
