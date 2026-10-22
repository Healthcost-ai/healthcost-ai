require('dotenv').config()
const { loadEnv } = require('./server/src/config/env')
const { connectDB } = require('./server/src/config/db')
const { createApp } = require('./app')
const mongoose = require('mongoose')

async function main() {
  const env = loadEnv()
  await connectDB(env.MONGODB_URI)
  const app = createApp()
  const server = app.listen(env.PORT, () => {
    console.info(`HealthCost AI API listening on port ${env.PORT}`)
  })

  const shutdown = async (signal) => {
    console.info(`${signal} received; shutting down`)
    server.close(async () => {
      await mongoose.disconnect()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch(error => {
  console.error('Backend startup failed:', error.message)
  process.exit(1)
})
