const { z } = require('zod')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  CSRF_HMAC_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('10m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(60).default(14),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  COOKIE_SECURE: z.string().default('false').transform(v => v === 'true'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.string().default('false').transform(v => v === 'true'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('HealthCost AI <no-reply@example.com>'),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: z.string().default('0')
})

function loadEnv() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.flatten().fieldErrors)
    throw new Error('Invalid environment configuration; check .env.example')
  }
  if (result.data.NODE_ENV === 'production') {
    if (!result.data.COOKIE_SECURE) throw new Error('COOKIE_SECURE must be true in production')
    if (!result.data.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is required in production')
    if (!result.data.SMTP_HOST || !result.data.SMTP_USER || !result.data.SMTP_PASSWORD) {
      throw new Error('SMTP settings are required in production for email verification')
    }
  }
  return result.data
}

module.exports = { loadEnv }
