
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const connectDB = require('./config/db')
const billRoutes = require('./routes/billRoutes')

const app = express()
const PORT = Number(process.env.PORT) || 5000

app.disable('x-powered-by')

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  })
)

app.use(express.json({ limit: '1mb' }))

// Health check
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

// Bill API
app.use('/api/bills', billRoutes)

// Unknown API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  })
})

// General error handler
app.use((err, req, res, next) => {
  console.error(err.message)

  if (res.headersSent) {
    return next(err)
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Database validation failed',
    })
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format',
    })
  }

  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred',
  })
})

async function startServer() {
  try {
    await connectDB()

    app.listen(PORT, () => {
      console.log(`HealthCost AI server running on port ${PORT}`)
      console.log(`Health check: http://localhost:${PORT}/api/health`)
    })
  } catch (error) {
    console.error('Failed to start backend:', error.message)
    process.exitCode = 1
  }
}

startServer()
